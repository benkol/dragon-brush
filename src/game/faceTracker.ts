import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { FACE_MODEL_CDN, FACE_MODEL_LOCAL, MEDIAPIPE_WASM } from '../config';
import { OneEuro } from './oneEuro';
import { poseForPoint, type Size } from './aim';
import type { DifficultySettings } from './difficulty';

/** Face state in screen (mirrored) space. Angles in radians. */
export interface FaceFrame {
  visible: boolean;
  /** > 0 when the kid's reflection looks to the right of the screen. */
  yaw: number;
  /** > 0 when looking up. */
  pitch: number;
  roll: number;
  /** Mouth openness, 0..1. */
  jaw: number;
  /** Face center, normalized 0..1 in mirrored screen space. */
  x: number;
  y: number;
}

export const NO_FACE: FaceFrame = { visible: false, yaw: 0, pitch: 0, roll: 0, jaw: 0, x: 0.5, y: 0.45 };

export interface FaceSource {
  frame(now: number, size: Size): FaceFrame;
  close(): void;
}

// Landmarks: 234/454 = cheek edges (image left/right), 10 = forehead, 152 = chin, 1 = nose tip.
const L_CHEEK = 234;
const R_CHEEK = 454;
const FOREHEAD = 10;
const CHIN = 152;
const NOSE = 1;
/** jawOpen blendshape score that counts as fully open. */
const JAW_FULL = 0.7;
/** Keep the last face this long when detection drops a few frames. */
const LOST_AFTER_MS = 300;

async function modelUrl() {
  try {
    const r = await fetch(FACE_MODEL_LOCAL, { method: 'HEAD' });
    const type = r.headers.get('content-type') ?? '';
    if (r.ok && !type.includes('text/html')) return FACE_MODEL_LOCAL;
  } catch {
    // fall through
  }
  return FACE_MODEL_CDN;
}

export class CameraFaceSource implements FaceSource {
  private last: FaceFrame = NO_FACE;
  private lastSeen = -Infinity;
  private lastVideoTime = -1;
  private lastT = 0;
  private f = {
    yaw: new OneEuro(1.5, 0.3),
    pitch: new OneEuro(1.5, 0.3),
    roll: new OneEuro(1.5, 0.3),
    jaw: new OneEuro(3, 0.5),
    x: new OneEuro(1.2, 0.5),
    y: new OneEuro(1.2, 0.5),
  };

  private constructor(private landmarker: FaceLandmarker, private video: HTMLVideoElement) {}

  static async create(video: HTMLVideoElement): Promise<CameraFaceSource> {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
    const modelAssetPath = await modelUrl();
    const make = (delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      });
    let lm: FaceLandmarker;
    try {
      lm = await make('GPU');
    } catch {
      lm = await make('CPU');
    }
    return new CameraFaceSource(lm, video);
  }

  frame(now: number): FaceFrame {
    const v = this.video;
    if (v.readyState < 2 || v.currentTime === this.lastVideoTime) return this.withTimeout(now);
    this.lastVideoTime = v.currentTime;

    const res = this.landmarker.detectForVideo(v, now);
    const lm = res.faceLandmarks[0];
    if (!lm) return this.withTimeout(now);

    const dt = Math.max(0.001, (now - this.lastT) / 1000);
    this.lastT = now;
    this.lastSeen = now;

    const W = v.videoWidth || 640;
    const H = v.videoHeight || 480;
    // x right, y up, z toward the camera, all in pixels.
    const P = (p: NormalizedLandmark) => [p.x * W, -p.y * H, -p.z * W];
    const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const R = sub(P(lm[R_CHEEK]), P(lm[L_CHEEK]));
    const U = sub(P(lm[FOREHEAD]), P(lm[CHIN]));
    const F = [R[1] * U[2] - R[2] * U[1], R[2] * U[0] - R[0] * U[2], R[0] * U[1] - R[1] * U[0]];

    // Image-space angles, then mirrored (negate yaw and roll) for the screen.
    const yaw = -Math.atan2(F[0], F[2]);
    const pitch = Math.atan2(F[1], Math.hypot(F[0], F[2]));
    const roll = -Math.atan2(R[1], R[0]);
    const jawScore = res.faceBlendshapes[0]?.categories.find((c) => c.categoryName === 'jawOpen')?.score ?? 0;

    this.last = {
      visible: true,
      yaw: this.f.yaw.filter(yaw, dt),
      pitch: this.f.pitch.filter(pitch, dt),
      roll: this.f.roll.filter(roll, dt),
      jaw: this.f.jaw.filter(Math.min(1, jawScore / JAW_FULL), dt),
      x: this.f.x.filter(1 - lm[NOSE].x, dt),
      y: this.f.y.filter(lm[NOSE].y, dt),
    };
    return this.last;
  }

  private withTimeout(now: number) {
    if (now - this.lastSeen > LOST_AFTER_MS && this.last.visible) {
      this.last = { ...this.last, visible: false, jaw: 0 };
      Object.values(this.f).forEach((f) => f.reset());
    }
    return this.last;
  }

  close() {
    this.landmarker.close();
  }
}

/**
 * `?debug=1` input: pointer position aims, holding space or pressing opens
 * the mouth, F toggles "face lost".
 */
export class DebugFaceSource implements FaceSource {
  private aim = { x: 0, y: 0 };
  private hasAim = false;
  private mouth = false;
  private hidden = false;
  private jaw = 0;
  private lastT = 0;

  /** `d`: the kid's difficulty, so the pointer lands exactly where it aims. */
  constructor(private el: HTMLElement, private d: DifficultySettings) {
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onMove = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect();
    this.aim = { x: e.clientX - r.left, y: e.clientY - r.top };
    this.hasAim = true;
  };
  private onDown = (e: PointerEvent) => {
    this.onMove(e);
    this.mouth = true;
  };
  private onUp = () => (this.mouth = false);
  private onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      this.mouth = true;
      e.preventDefault();
    }
    if (e.code === 'KeyF') this.hidden = !this.hidden;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.mouth = false;
  };

  frame(now: number, size: Size): FaceFrame {
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    this.jaw += ((this.mouth ? 1 : 0) - this.jaw) * Math.min(1, dt * 15);
    const p = this.hasAim ? this.aim : { x: size.w / 2, y: size.h / 2 };
    const pose = poseForPoint(p, size, this.d);
    return {
      visible: !this.hidden,
      yaw: pose.yaw,
      pitch: pose.pitch,
      roll: 0,
      jaw: this.jaw,
      x: 0.5 + (p.x / size.w - 0.5) * 0.3,
      y: 0.45 + (p.y / size.h - 0.5) * 0.2,
    };
  }

  close() {
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}

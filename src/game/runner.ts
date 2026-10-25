// Frame loop tying together face input, the game state machine, the 3D
// scene, audio and the HUD.
import type { Kid, SessionResult } from '../data/types';
import { aimPoint, fireState, isHit, neededTurnDeg, poseForPoint, targetPosition, targetRadius, type Point, type Pose } from './aim';
import { settingsFor, type DifficultySettings } from './difficulty';
import { burnProgress, CORNER_ORDER, currentCorner, type GameConfig, type GameState, initialState, type Phase, step, totalProgress } from './gameMachine';
import type { FaceFrame, FaceSource } from './faceTracker';
import { DragonScene } from './scene/DragonScene';
import { setFire, sfx, startLoops, stopLoops } from './audio';
import { say, stopVoice, type VoiceLine } from './voice';
import { dragonLevel } from '../rewards/scoring';

export interface HudState {
  phase: Phase;
  round: number;
  countdown: number;
  secondsLeft: number;
  burn: number;
  total: number;
  hitting: boolean;
  fireOn: boolean;
  faceVisible: boolean;
  target: Point | null;
  targetR: number;
  head: Point;
  /** How long the face has been missing (ms), while the game needs it. */
  noFaceMs: number;
  noCamera: boolean;
  debug?: string;
  tuning?: TuningReadout;
}

/** Live numbers for a parent choosing the right difficulty. */
export interface TuningReadout {
  aim: Point;
  /** Head turn from neutral, degrees (+ = right / up). */
  yaw: number;
  pitch: number;
  /** Turn needed to reach the current target. */
  needYaw: number;
  needPitch: number;
  jaw: number;
  jawOn: number;
  jawOff: number;
}

export interface RunnerOptions {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  source: FaceSource;
  kid: Kid;
  cfg: GameConfig;
  debug: boolean;
  /** Show the live tuning readout. */
  tuning: boolean;
  /** Said after the celebration, e.g. "Happy Hanukkah!". */
  greeting?: VoiceLine;
  onHud: (h: HudState) => void;
  /**
   * Every frame on difficulties with an aim marker: where the fire lands
   * (null to hide it) and whether the fire is on.
   */
  onAim?: (p: Point | null, fireOn: boolean) => void;
  onFinished: (r: SessionResult) => void;
}

const HUD_MS = 66;
/** No face this long: say "Where are you?" (or "Show me your face!" before starting). */
export const SAY_WHERE_AFTER_MS = 1_500;
/** No face this long: suggest holding the phone further away. */
export const HINT_AFTER_MS = 4_000;
/** No face this long: offer to play without the camera. */
export const NO_CAMERA_AFTER_MS = 20_000;
/** Fire off target this long: remind to aim at it. */
const SAY_AIM_AFTER_MS = 3_500;

export class GameRunner {
  private scene: DragonScene;
  private state: GameState;
  private raf = 0;
  private last = 0;
  private lastHud = 0;
  private neutral: Pose = { yaw: 0, pitch: 0 };
  private fireOn = false;
  private paused = false;
  private size = { w: 0, h: 0 };
  private startedAt = Date.now();
  private countdown = 0;
  private yucky: boolean;
  private d: DifficultySettings;
  private cfg: GameConfig;
  private noCamera = false;
  private noFaceMs = 0;
  private notHitMs = 0;
  private halfwaySaid = false;
  private aimSaid = false;
  private whereSaid = false;
  private fartherSaid = false;

  constructor(private o: RunnerOptions) {
    const level = dragonLevel(o.kid.dragonXp[o.kid.equipped.dragon] ?? 0);
    this.scene = new DragonScene(o.canvas, o.kid.equipped, level);
    this.d = settingsFor(o.kid.difficulty);
    this.cfg = { ...o.cfg, graceMs: this.d.graceMs };
    this.state = initialState(this.cfg);
    this.yucky = o.kid.equipped.food === 'food.broccoli';
  }

  start() {
    startLoops();
    this.startedAt = Date.now();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) setFire(false, false);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    stopVoice();
    stopLoops();
    this.scene.dispose();
  }

  /**
   * Stop using the camera: the dragon aims at each target by itself and the
   * timer runs on its own, so the brush still counts. The caller stops the
   * camera and the face tracker.
   */
  playWithoutCamera() {
    this.noCamera = true;
    this.neutral = { yaw: 0, pitch: 0 };
    this.noFaceMs = 0;
    say('noCamera', { priority: 3 });
  }

  /** Partial result, for saving when the parent stops early. */
  result(completed: boolean): SessionResult {
    return {
      startedAt: this.startedAt,
      endedAt: Date.now(),
      completed,
      // Without the camera there was no aiming, so no steady-aim bonus.
      perTarget: this.noCamera ? [] : CORNER_ORDER.map((corner, i) => ({ corner, leaves: this.state.leaves[i] })),
      ...(this.noCamera ? { noCamera: true } : {}),
    };
  }

  /** A pretend face that breathes fire straight at the current target. */
  private autoFace(s: GameState, now: number): FaceFrame {
    const aiming = s.phase === 'aiming';
    const pose = aiming ? poseForPoint(targetPosition(currentCorner(s), this.size), this.size, this.d) : { yaw: 0, pitch: 0 };
    // A little sway so the dragon looks alive.
    const sway = Math.sin(now / 600) * 0.03;
    return { visible: true, yaw: pose.yaw + sway, pitch: pose.pitch, roll: sway, jaw: aiming ? 1 : 0.1, x: 0.5, y: 0.45 };
  }

  private tuningReadout(face: { yaw: number; pitch: number; jaw: number }, aim: Point, corner: ReturnType<typeof currentCorner>): TuningReadout {
    const need = neededTurnDeg(corner, this.size, this.d);
    const toDeg = 180 / Math.PI;
    return {
      aim,
      yaw: (face.yaw - this.neutral.yaw) * toDeg,
      pitch: (face.pitch - this.neutral.pitch) * toDeg,
      needYaw: need.yaw,
      needPitch: need.pitch,
      jaw: face.jaw,
      jawOn: this.d.jawOn,
      jawOff: this.d.jawOff,
    };
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(100, now - this.last);
    this.last = now;
    const { container } = this.o;
    const { cfg, d } = this;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w !== this.size.w || h !== this.size.h) {
      this.size = { w, h };
      this.scene.resize(w, h);
      if (this.state.phase === 'aiming') {
        const c = currentCorner(this.state);
        this.scene.setTarget(c, targetPosition(c, this.size));
      }
    }

    const s0 = this.state;
    const face = this.noCamera ? this.autoFace(s0, now) : this.o.source.frame(now, this.size);
    // How long the face has been missing while the game needs it.
    const needsFace = s0.phase === 'ready' || s0.phase === 'countdown' || s0.phase === 'aiming';
    if (face.visible || !needsFace) this.noFaceMs = 0;
    else if (!this.paused) this.noFaceMs += dt;
    if (this.noFaceMs === 0) this.whereSaid = this.fartherSaid = false;
    if (this.noFaceMs >= SAY_WHERE_AFTER_MS && !this.whereSaid)
      this.whereSaid = say(s0.phase === 'ready' ? 'findFace' : 'where', { priority: 2, cooldownMs: 8000 });
    if (this.noFaceMs >= HINT_AFTER_MS && !this.fartherSaid) this.fartherSaid = say('farther', { priority: 2, queue: true, cooldownMs: 15000 });
    const canFire = face.visible && !this.paused && s0.phase !== 'eating' && s0.phase !== 'celebrate' && s0.phase !== 'done';
    this.fireOn = canFire && fireState(face.jaw, this.fireOn, d);
    const aim = aimPoint(face, this.neutral, this.size, d);
    const corner = currentCorner(s0);
    const hit = this.fireOn && s0.phase === 'aiming' && isHit(aim, corner, this.size, d);
    // The tuning readout has its own dot, and without the camera the dragon aims by itself.
    if (d.aimMarker && !this.o.tuning && !this.noCamera) {
      this.o.onAim?.(s0.phase === 'aiming' && face.visible && !this.paused ? aim : null, this.fireOn);
    }

    const { state, events } = step(s0, { dt, hit, faceVisible: face.visible, paused: this.paused }, cfg);
    this.state = state;

    for (const e of events) {
      switch (e.type) {
        case 'calibrate':
          this.neutral = { yaw: face.yaw, pitch: face.pitch };
          break;
        case 'countdownTick':
          this.countdown = e.n;
          sfx.countdown(e.n);
          if (e.n >= 1 && e.n <= 3) say(`count${e.n}` as VoiceLine, { priority: 3, interrupt: true });
          break;
        case 'roundStart': {
          this.countdown = 0;
          this.halfwaySaid = false;
          this.aimSaid = false;
          this.notHitMs = 0;
          this.scene.setTarget(e.corner, targetPosition(e.corner, this.size));
          const direction = `corner_${e.corner}` as VoiceLine;
          if (e.round === 0) {
            sfx.go();
            say('go', { priority: 3, interrupt: true });
          } else {
            sfx.newTarget();
          }
          // Where to look; waits for "Go!" or "Yum!" to finish.
          say(direction, { priority: 2, queue: true });
          break;
        }
        case 'eat':
          this.scene.playEat();
          sfx.chomp();
          if (this.yucky) sfx.yuck();
          say(this.yucky ? 'yuck' : e.round % 2 === 0 ? 'yum1' : 'yum2', { priority: 2 });
          navigator.vibrate?.([30, 200, 20, 200, 20]);
          break;
        case 'celebrate':
          this.scene.celebrate();
          sfx.fanfare();
          say('celebrate', { priority: 3 });
          if (this.o.greeting) say(this.o.greeting, { priority: 2, queue: true });
          navigator.vibrate?.([60, 80, 60, 80, 120]);
          break;
        case 'finished':
          this.o.onFinished(this.result(true));
          break;
        default:
          break;
      }
    }

    // Voice nudges while aiming: halfway cheer, and a reminder when the fire
    // has been off target for a while.
    if (state.phase === 'aiming') {
      // Retries until it gets a turn, but only while the target isn't nearly done.
      const burn = burnProgress(state, cfg);
      if (!this.halfwaySaid && burn >= 0.5 && burn < 0.8) this.halfwaySaid = say('halfway', { priority: 1 });
      if (face.visible && !state.hitting && !this.paused) {
        this.notHitMs += dt;
        // Keeps trying until it gets a turn to speak.
        if (this.notHitMs >= SAY_AIM_AFTER_MS && !this.aimSaid) this.aimSaid = say('aimHere', { priority: 1, cooldownMs: 10_000 });
      } else {
        this.notHitMs = 0;
        this.aimSaid = false;
      }
    }

    setFire(this.fireOn, state.hitting);
    this.scene.frame(
      {
        faceVisible: face.visible,
        yaw: face.yaw - this.neutral.yaw,
        pitch: face.pitch - this.neutral.pitch,
        roll: face.roll,
        jaw: face.jaw,
        faceX: face.x,
        faceY: face.y,
        fireOn: this.fireOn,
        aim: this.fireOn ? aim : null,
        burn: state.phase === 'aiming' || state.phase === 'eating' ? burnProgress(state, cfg) : 0,
        hitting: state.hitting,
      },
      dt / 1000,
    );

    if (now - this.lastHud > HUD_MS || events.length > 0) {
      this.lastHud = now;
      this.o.onHud({
        phase: state.phase,
        round: state.round,
        countdown: this.countdown,
        secondsLeft: Math.ceil(state.roundLeft / 1000),
        burn: burnProgress(state, cfg),
        total: totalProgress(state, cfg),
        hitting: state.hitting,
        fireOn: this.fireOn,
        faceVisible: face.visible,
        target: state.phase === 'aiming' ? targetPosition(corner, this.size) : null,
        targetR: targetRadius(this.size, d),
        head: this.scene.headScreen(),
        noFaceMs: this.noFaceMs,
        noCamera: this.noCamera,
        tuning: this.o.tuning ? this.tuningReadout(face, aim, corner) : undefined,
        debug: this.o.debug
          ? `yaw ${(face.yaw * 57.3).toFixed(0)}° pitch ${(face.pitch * 57.3).toFixed(0)}° jaw ${face.jaw.toFixed(2)} aim ${aim.x.toFixed(0)},${aim.y.toFixed(0)}`
          : undefined,
      });
    }
  };
}

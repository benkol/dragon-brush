// Frame loop for "brush by myself": the camera only checks that the kid is
// there, the dragon brushes along, and the HUD shows where to brush next.
import type { Kid, SessionResult } from '../data/types';
import type { Point } from './aim';
import type { FaceFrame, FaceSource } from './faceTracker';
import { DragonScene } from './scene/DragonScene';
import { setFire, sfx, startLoops, stopLoops } from './audio';
import { say, stopVoice, type VoiceLine } from './voice';
import { dragonLevel } from '../rewards/scoring';
import { HINT_AFTER_MS, SAY_WHERE_AFTER_MS } from './runner';
import {
  soloInitial,
  soloProgress,
  soloStep,
  soloSteps,
  stepProgress,
  type SoloConfig,
  type SoloPhase,
  type SoloState,
  type SoloStep,
} from './soloMachine';

export interface SoloHud {
  phase: SoloPhase;
  countdown: number;
  step: SoloStep;
  stepIndex: number;
  /** 0 → 1 through the current step. */
  stepP: number;
  secondsLeft: number;
  /** 0 → 1 over the 2 minutes. */
  total: number;
  present: boolean;
  faceVisible: boolean;
  noFaceMs: number;
  noCamera: boolean;
  head: Point;
  debug?: string;
}

export interface SoloRunnerOptions {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  source: FaceSource;
  kid: Kid;
  cfg: SoloConfig;
  debug: boolean;
  greeting?: VoiceLine;
  onHud: (h: SoloHud) => void;
  onFinished: (r: SessionResult) => void;
}

const HUD_MS = 66;
const HIDDEN: FaceFrame = { visible: false, yaw: 0, pitch: 0, roll: 0, jaw: 0, x: 0.5, y: 0.45 };

export class SoloRunner {
  private scene: DragonScene;
  private steps: SoloStep[];
  private state: SoloState;
  private raf = 0;
  private last = 0;
  private lastHud = 0;
  private paused = false;
  private size = { w: 0, h: 0 };
  private startedAt = Date.now();
  private countdown = 0;
  private noCamera = false;
  private noFaceMs = 0;
  private whereSaid = false;
  private fartherSaid = false;

  constructor(private o: SoloRunnerOptions) {
    const level = dragonLevel(o.kid.dragonXp[o.kid.equipped.dragon] ?? 0);
    this.scene = new DragonScene(o.canvas, o.kid.equipped, level);
    this.steps = soloSteps(o.cfg.zoneMs);
    this.state = soloInitial(o.cfg);
  }

  start() {
    startLoops();
    setFire(false, false);
    this.startedAt = Date.now();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    say('soloIntro', { priority: 2 });
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  stop() {
    cancelAnimationFrame(this.raf);
    stopVoice();
    stopLoops();
    this.scene.dispose();
  }

  /** The timer runs on its own; the caller stops the camera. */
  playWithoutCamera() {
    this.noCamera = true;
    this.noFaceMs = 0;
    say('soloNoCamera', { priority: 3 });
  }

  result(completed: boolean): SessionResult {
    return {
      startedAt: this.startedAt,
      endedAt: Date.now(),
      completed,
      perTarget: [],
      solo: true,
      ...(this.noCamera ? { noCamera: true } : {}),
    };
  }

  private announce(step: SoloStep, newZone: boolean, index: number) {
    if (step.surface === 'tongue') {
      sfx.newTarget();
      say('tongue', { priority: 2, interrupt: true });
      return;
    }
    if (index === 0) {
      sfx.go();
      say('soloGo', { priority: 3, interrupt: true });
    } else if (newZone) {
      sfx.chomp();
      if (step.round === 2) say('halfway', { priority: 2, interrupt: true });
    } else {
      sfx.newTarget();
    }
    if (newZone) say(`zone_${step.zone}` as VoiceLine, { priority: 2, queue: true });
    say(`surf_${step.surface}` as VoiceLine, { priority: 2, queue: true });
    if (step.tip) say('tipFront', { priority: 1, queue: true });
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(100, now - this.last);
    this.last = now;
    const { container, cfg } = this.o;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w !== this.size.w || h !== this.size.h) {
      this.size = { w, h };
      this.scene.resize(w, h);
    }

    const s0 = this.state;
    const live = this.noCamera ? HIDDEN : this.o.source.frame(now, this.size);
    const seen = this.noCamera || live.visible;
    const needsFace = s0.phase === 'ready' || s0.phase === 'countdown' || s0.phase === 'brushing';
    if (seen || !needsFace) this.noFaceMs = 0;
    else if (!this.paused) this.noFaceMs += dt;
    if (this.noFaceMs === 0) this.whereSaid = this.fartherSaid = false;
    // Short gaps are normal (a hand over the mouth), so only speak up once the timer has stopped.
    const missing = s0.phase === 'brushing' ? !s0.present : this.noFaceMs >= SAY_WHERE_AFTER_MS;
    if (missing && !this.whereSaid) this.whereSaid = say(s0.phase === 'ready' ? 'findFace' : 'soloWhere', { priority: 2, cooldownMs: 8000 });
    if (this.noFaceMs >= HINT_AFTER_MS + cfg.graceMs && !this.fartherSaid) this.fartherSaid = say('farther', { priority: 2, queue: true, cooldownMs: 15000 });

    const { state, events } = soloStep(s0, { dt, faceVisible: seen, paused: this.paused }, this.steps, cfg);
    this.state = state;

    for (const e of events) {
      switch (e.type) {
        case 'countdownTick':
          this.countdown = e.n;
          sfx.countdown(e.n);
          if (e.n >= 1 && e.n <= 3) say(`count${e.n}` as VoiceLine, { priority: 3, interrupt: true });
          break;
        case 'stepStart':
          this.countdown = 0;
          this.scene.setBrushing({ zone: e.step.zone, surface: e.step.surface });
          this.announce(e.step, e.newZone, e.index);
          break;
        case 'back':
          this.whereSaid = false;
          break;
        case 'spit':
          this.scene.setBrushing(null);
          sfx.newTarget();
          say('spit', { priority: 3, interrupt: true });
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

    // The dragon's fangs get cleaner along with the kid's teeth.
    this.scene.setTeethClean(soloProgress(state, cfg));

    // Without the camera the dragon just looks ahead.
    const face = this.noCamera ? { ...HIDDEN, visible: true } : live;
    this.scene.frame(
      {
        faceVisible: face.visible,
        yaw: face.yaw,
        pitch: face.pitch,
        roll: face.roll,
        jaw: face.jaw,
        faceX: face.x,
        faceY: face.y,
        fireOn: false,
        aim: null,
        burn: 0,
        hitting: false,
      },
      dt / 1000,
    );

    if (now - this.lastHud > HUD_MS || events.length > 0) {
      this.lastHud = now;
      const step = this.steps[state.step];
      this.o.onHud({
        phase: state.phase,
        countdown: this.countdown,
        step,
        stepIndex: state.step,
        stepP: stepProgress(state, this.steps),
        secondsLeft: Math.ceil((state.phase === 'brushing' ? state.stepLeft : step.ms) / 1000),
        total: soloProgress(state, cfg),
        present: state.phase !== 'brushing' || state.present,
        faceVisible: seen,
        noFaceMs: this.noFaceMs,
        noCamera: this.noCamera,
        head: this.scene.headScreen(),
        debug: this.o.debug ? `step ${state.step} ${step.zone ?? '-'} ${step.surface} seen ${seen} active ${(state.activeMs / 1000).toFixed(1)}s` : undefined,
      });
    }
  };
}

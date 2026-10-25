// "Brush by myself": a guided 2 minutes with no aiming. Pure like
// gameMachine: the caller feeds frame deltas and whether the kid is in view.
//
// The routine follows common advice for kids: small gentle circles, every
// zone's outside, inside and chewing surfaces, then the tongue, then spit
// (don't rinse). Zones go in the game's corner order, as seen in a mirror.
import { CORNER_ORDER, type Corner } from './gameMachine';

export type Surface = 'outside' | 'inside' | 'tops' | 'tongue';
export const SURFACES: Surface[] = ['outside', 'inside', 'tops'];

export interface SoloStep {
  /** Mouth quarter (mirror view); null for the tongue. */
  zone: Corner | null;
  /** Index into CORNER_ORDER (4 for the tongue). */
  round: number;
  surface: Surface;
  ms: number;
  /** Extra hint: hold the brush up and down for the inside of the front teeth. */
  tip?: 'front';
}

/** Zones whose inside step crosses the front teeth (the second and third zone start there). */
const FRONT_TIP_ZONES: Corner[] = ['TL', 'BL'];

export function soloSteps(zoneMs: number): SoloStep[] {
  const ms = zoneMs / SURFACES.length;
  const steps: SoloStep[] = [];
  CORNER_ORDER.forEach((zone, round) => {
    for (const surface of SURFACES) {
      steps.push({ zone, round, surface, ms, ...(surface === 'inside' && FRONT_TIP_ZONES.includes(zone) ? { tip: 'front' as const } : {}) });
    }
  });
  steps.push({ zone: null, round: CORNER_ORDER.length, surface: 'tongue', ms });
  return steps;
}

export type SoloPhase = 'ready' | 'countdown' | 'brushing' | 'spit' | 'celebrate' | 'done';

export interface SoloConfig {
  /** Time per mouth quarter, split evenly between its surfaces. */
  zoneMs: number;
  countdownMs: number;
  readyMs: number;
  /** "Spit, don't rinse!" card. */
  spitMs: number;
  celebrateMs: number;
  /** The face may be out of view this long (a hand or brush in the way) before the timer pauses. */
  graceMs: number;
}

export const SOLO_CONFIG: SoloConfig = {
  zoneMs: 30_000,
  countdownMs: 3_000,
  readyMs: 1_000,
  spitMs: 3_500,
  celebrateMs: 3_500,
  graceMs: 3_000,
};

export interface SoloState {
  phase: SoloPhase;
  phaseLeft: number;
  step: number;
  stepLeft: number;
  /** ms since the face was last seen. */
  sinceSeen: number;
  /** Kid in view (with grace): the timer runs. */
  present: boolean;
  activeMs: number;
}

export interface SoloInput {
  dt: number;
  faceVisible: boolean;
  paused?: boolean;
}

export type SoloEvent =
  | { type: 'countdownTick'; n: number }
  | { type: 'stepStart'; index: number; step: SoloStep; newZone: boolean }
  | { type: 'away' }
  | { type: 'back' }
  | { type: 'spit' }
  | { type: 'celebrate' }
  | { type: 'finished' };

export function soloInitial(cfg: SoloConfig = SOLO_CONFIG): SoloState {
  return { phase: 'ready', phaseLeft: cfg.readyMs, step: 0, stepLeft: 0, sinceSeen: 0, present: true, activeMs: 0 };
}

/** The 2 minutes of zones (the tongue is extra). */
export const soloTotalMs = (cfg: SoloConfig = SOLO_CONFIG) => cfg.zoneMs * CORNER_ORDER.length;

/** 0 → 1 over the zones. */
export const soloProgress = (s: SoloState, cfg: SoloConfig = SOLO_CONFIG) => Math.min(1, s.activeMs / soloTotalMs(cfg));

/** 0 → 1 through the current step. */
export const stepProgress = (s: SoloState, steps: SoloStep[]) =>
  s.phase === 'brushing' ? 1 - s.stepLeft / steps[s.step].ms : s.phase === 'ready' || s.phase === 'countdown' ? 0 : 1;

export function soloStep(prev: SoloState, input: SoloInput, steps: SoloStep[], cfg: SoloConfig = SOLO_CONFIG): { state: SoloState; events: SoloEvent[] } {
  const s: SoloState = { ...prev };
  const events: SoloEvent[] = [];
  const dt = Math.max(0, input.dt);
  if (input.paused) return { state: s, events };

  const startStep = (i: number) => {
    s.step = i;
    s.stepLeft = steps[i].ms;
    events.push({ type: 'stepStart', index: i, step: steps[i], newZone: i === 0 || steps[i - 1].round !== steps[i].round });
  };

  switch (s.phase) {
    case 'ready': {
      if (!input.faceVisible) {
        s.phaseLeft = cfg.readyMs;
        break;
      }
      s.phaseLeft -= dt;
      if (s.phaseLeft <= 0) {
        s.phase = 'countdown';
        s.phaseLeft = cfg.countdownMs;
        events.push({ type: 'countdownTick', n: Math.ceil(cfg.countdownMs / 1000) });
      }
      break;
    }
    case 'countdown': {
      if (!input.faceVisible) break;
      const before = Math.ceil(s.phaseLeft / 1000);
      s.phaseLeft -= dt;
      const after = Math.ceil(s.phaseLeft / 1000);
      if (s.phaseLeft <= 0) {
        s.phase = 'brushing';
        s.sinceSeen = 0;
        s.present = true;
        startStep(0);
      } else if (after < before) {
        events.push({ type: 'countdownTick', n: after });
      }
      break;
    }
    case 'brushing': {
      s.sinceSeen = input.faceVisible ? 0 : s.sinceSeen + dt;
      const was = s.present;
      s.present = s.sinceSeen < cfg.graceMs;
      if (was !== s.present) events.push({ type: s.present ? 'back' : 'away' });
      if (!s.present) break;

      let left = dt;
      while (left > 0 && s.phase === 'brushing') {
        const used = Math.min(left, s.stepLeft);
        s.stepLeft -= used;
        left -= used;
        if (steps[s.step].surface !== 'tongue') s.activeMs += used;
        if (s.stepLeft <= 0) {
          if (s.step + 1 < steps.length) startStep(s.step + 1);
          else {
            s.phase = 'spit';
            s.phaseLeft = cfg.spitMs;
            events.push({ type: 'spit' });
          }
        }
      }
      break;
    }
    case 'spit': {
      s.phaseLeft -= dt;
      if (s.phaseLeft <= 0) {
        s.phase = 'celebrate';
        s.phaseLeft = cfg.celebrateMs;
        events.push({ type: 'celebrate' });
      }
      break;
    }
    case 'celebrate': {
      s.phaseLeft -= dt;
      if (s.phaseLeft <= 0) {
        s.phase = 'done';
        events.push({ type: 'finished' });
      }
      break;
    }
    case 'done':
      break;
  }
  return { state: s, events };
}

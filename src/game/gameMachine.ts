// Pure brushing-session state machine. No DOM, no timers: the caller feeds
// it frame deltas and whether the fire is on the target.

export type Corner = 'TR' | 'TL' | 'BL' | 'BR';
export const CORNER_ORDER: Corner[] = ['TR', 'TL', 'BL', 'BR'];

export type Phase = 'ready' | 'countdown' | 'aiming' | 'eating' | 'celebrate' | 'done';

export interface GameConfig {
  roundMs: number;
  countdownMs: number;
  /** Face must be visible this long before calibration and countdown. */
  readyMs: number;
  eatMs: number;
  celebrateMs: number;
  /** Short gaps in hitting shorter than this keep the timer running. */
  graceMs: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  roundMs: 30_000,
  countdownMs: 3_000,
  readyMs: 1_000,
  eatMs: 1_400,
  celebrateMs: 3_500,
  graceMs: 200,
};

export interface GameState {
  phase: Phase;
  round: number;
  /** ms left in the current phase timer (ready/countdown/eating/celebrate). */
  phaseLeft: number;
  /** ms of burning left on the current target. */
  roundLeft: number;
  /** ms since the fire was last on target (Infinity if never this round). */
  sinceHit: number;
  /** Effective hitting (with grace). */
  hitting: boolean;
  leaves: number[];
  /** Total ms of active brushing so far. */
  activeMs: number;
}

export interface FrameInput {
  dt: number;
  hit: boolean;
  faceVisible: boolean;
  /** App in background or user paused. */
  paused?: boolean;
}

export type GameEvent =
  | { type: 'calibrate' }
  | { type: 'countdownTick'; n: number }
  | { type: 'roundStart'; round: number; corner: Corner }
  | { type: 'hitStart' }
  | { type: 'hitStop' }
  | { type: 'eat'; round: number }
  | { type: 'celebrate' }
  | { type: 'finished' };

export function initialState(cfg: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    phase: 'ready',
    round: 0,
    phaseLeft: cfg.readyMs,
    roundLeft: cfg.roundMs,
    sinceHit: Infinity,
    hitting: false,
    leaves: CORNER_ORDER.map(() => 0),
    activeMs: 0,
  };
}

export const currentCorner = (s: GameState): Corner => CORNER_ORDER[Math.min(s.round, CORNER_ORDER.length - 1)];

/** 0 → 1 burn progress on the current target. */
export const burnProgress = (s: GameState, cfg: GameConfig = DEFAULT_CONFIG) =>
  s.phase === 'eating' || s.phase === 'celebrate' || s.phase === 'done' ? 1 : 1 - s.roundLeft / cfg.roundMs;

/** 0 → 1 progress of the whole session. */
export const totalProgress = (s: GameState, cfg: GameConfig = DEFAULT_CONFIG) =>
  Math.min(1, s.activeMs / (cfg.roundMs * CORNER_ORDER.length));

export function step(prev: GameState, input: FrameInput, cfg: GameConfig = DEFAULT_CONFIG): { state: GameState; events: GameEvent[] } {
  const s: GameState = { ...prev, leaves: [...prev.leaves] };
  const events: GameEvent[] = [];
  const dt = Math.max(0, input.dt);

  if (input.paused) return { state: s, events };

  switch (s.phase) {
    case 'ready': {
      if (!input.faceVisible) {
        s.phaseLeft = cfg.readyMs;
        break;
      }
      s.phaseLeft -= dt;
      if (s.phaseLeft <= 0) {
        events.push({ type: 'calibrate' });
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
        s.phase = 'aiming';
        s.round = 0;
        s.roundLeft = cfg.roundMs;
        s.sinceHit = Infinity;
        events.push({ type: 'roundStart', round: 0, corner: CORNER_ORDER[0] });
      } else if (after < before) {
        events.push({ type: 'countdownTick', n: after });
      }
      break;
    }
    case 'aiming': {
      const wasHitting = s.hitting;
      if (!input.faceVisible) {
        s.sinceHit = Infinity;
      } else if (input.hit) {
        s.sinceHit = 0;
      } else {
        s.sinceHit += dt;
      }
      s.hitting = s.sinceHit < cfg.graceMs;

      if (s.hitting !== wasHitting) {
        events.push({ type: s.hitting ? 'hitStart' : 'hitStop' });
        // Only count leaving once the target has started burning.
        if (!s.hitting && s.roundLeft < cfg.roundMs) s.leaves[s.round] += 1;
      }

      if (s.hitting) {
        const burn = Math.min(dt, s.roundLeft);
        s.roundLeft -= burn;
        s.activeMs += burn;
      }

      if (s.roundLeft <= 0) {
        s.roundLeft = 0;
        if (s.hitting) events.push({ type: 'hitStop' });
        s.hitting = false;
        s.phase = 'eating';
        s.phaseLeft = cfg.eatMs;
        events.push({ type: 'eat', round: s.round });
      }
      break;
    }
    case 'eating': {
      s.phaseLeft -= dt;
      if (s.phaseLeft <= 0) {
        if (s.round + 1 < CORNER_ORDER.length) {
          s.round += 1;
          s.phase = 'aiming';
          s.roundLeft = cfg.roundMs;
          s.sinceHit = Infinity;
          events.push({ type: 'roundStart', round: s.round, corner: CORNER_ORDER[s.round] });
        } else {
          s.phase = 'celebrate';
          s.phaseLeft = cfg.celebrateMs;
          events.push({ type: 'celebrate' });
        }
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

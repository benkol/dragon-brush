// Little kids often tilt the head sideways while aiming, which doesn't move
// the fire and just confuses them. Spot a steady tilt so the game can say
// "head straight!".

const deg = (d: number) => (d * Math.PI) / 180;

/** Tilt (from upright) that starts the hint, and the smaller one that ends it. */
export const TILT_ON = deg(16);
export const TILT_OFF = deg(9);
/** How long the head must stay tilted before the hint shows. */
export const TILT_AFTER_MS = 700;
/** The phone may be held a little crooked; calibration trusts at most this much. */
export const MAX_NEUTRAL_ROLL = deg(8);

export interface TiltState {
  /** ms the head has been tilted. */
  ms: number;
  /** Show the hint. */
  on: boolean;
}

export const NO_TILT: TiltState = { ms: 0, on: false };

/** Upright reference from the calibration frame, clamped so a tilted start isn't taken as upright. */
export const neutralRoll = (roll: number) => Math.max(-MAX_NEUTRAL_ROLL, Math.min(MAX_NEUTRAL_ROLL, roll));

/** `roll` is relative to upright (radians). */
export function tiltStep(prev: TiltState, roll: number, dt: number, active: boolean): TiltState {
  if (!active) return NO_TILT;
  const tilted = Math.abs(roll) > (prev.on ? TILT_OFF : TILT_ON);
  if (!tilted) return NO_TILT;
  const ms = prev.ms + dt;
  return { ms, on: prev.on || ms >= TILT_AFTER_MS };
}

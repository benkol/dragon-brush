// Per-kid difficulty: how far the head must turn, how wide the mouth must
// open, how big the targets are, and how forgiving short slips are.

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
export const DEFAULT_DIFFICULTY: Difficulty = 'medium';

export interface DifficultySettings {
  /** Head turn (relative to neutral, radians) that moves the aim from the center to the screen edge. */
  maxYaw: number;
  maxPitch: number;
  /** Target hit radius as a fraction of the shorter screen side. */
  targetRadius: number;
  /** Mouth openness (0..1) that starts the fire, and the lower value that stops it. */
  jawOn: number;
  jawOff: number;
  /** Gaps in hitting shorter than this keep the timer running. */
  graceMs: number;
}

const deg = (d: number) => (d * Math.PI) / 180;

export const DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  // Little ones: small nods reach the corners, a small "o" breathes fire.
  easy: { maxYaw: deg(12), maxPitch: deg(10), targetRadius: 0.3, jawOn: 0.18, jawOff: 0.12, graceMs: 700 },
  medium: { maxYaw: deg(17), maxPitch: deg(14), targetRadius: 0.25, jawOn: 0.26, jawOff: 0.18, graceMs: 400 },
  // The original settings.
  hard: { maxYaw: deg(24), maxPitch: deg(20), targetRadius: 0.2, jawOn: 0.35, jawOff: 0.25, graceMs: 200 },
};

export const settingsFor = (d: Difficulty | undefined) => DIFFICULTY[d ?? DEFAULT_DIFFICULTY] ?? DIFFICULTY[DEFAULT_DIFFICULTY];

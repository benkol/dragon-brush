import { describe, expect, it } from 'vitest';
import { MAX_NEUTRAL_ROLL, NO_TILT, neutralRoll, TILT_AFTER_MS, tiltStep, type TiltState } from './tilt';

const deg = (d: number) => (d * Math.PI) / 180;
const hold = (s: TiltState, roll: number, ms: number, active = true) => {
  for (let t = 0; t < ms; t += 50) s = tiltStep(s, roll, 50, active);
  return s;
};

describe('head tilt', () => {
  it('ignores small tilts and quick wobbles', () => {
    expect(hold(NO_TILT, deg(10), 3000).on).toBe(false);
    expect(hold(NO_TILT, deg(25), TILT_AFTER_MS - 100).on).toBe(false);
  });

  it('shows the hint after a steady tilt to either side', () => {
    expect(hold(NO_TILT, deg(25), TILT_AFTER_MS + 50).on).toBe(true);
    expect(hold(NO_TILT, deg(-25), TILT_AFTER_MS + 50).on).toBe(true);
  });

  it('keeps it until the head is nearly straight again', () => {
    const on = hold(NO_TILT, deg(25), 1000);
    expect(tiltStep(on, deg(12), 50, true).on).toBe(true);
    expect(tiltStep(on, deg(5), 50, true).on).toBe(false);
  });

  it('resets when the face is lost or the game is not aiming', () => {
    const on = hold(NO_TILT, deg(25), 1000);
    expect(tiltStep(on, deg(25), 50, false)).toEqual(NO_TILT);
  });

  it('trusts only a slightly crooked phone at calibration', () => {
    expect(neutralRoll(deg(4))).toBeCloseTo(deg(4));
    expect(neutralRoll(deg(30))).toBe(MAX_NEUTRAL_ROLL);
    expect(neutralRoll(deg(-30))).toBe(-MAX_NEUTRAL_ROLL);
  });
});

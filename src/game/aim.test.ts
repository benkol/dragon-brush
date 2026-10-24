import { describe, expect, it } from 'vitest';
import { aimPoint, fireState, isHit, neededTurnDeg, poseForPoint, targetPosition, targetRadius } from './aim';
import { DIFFICULTIES, DIFFICULTY, settingsFor } from './difficulty';

const size = { w: 400, h: 800 };
const zero = { yaw: 0, pitch: 0 };
const MAX_YAW = DIFFICULTY.hard.maxYaw;
const MAX_PITCH = DIFFICULTY.hard.maxPitch;

describe('aim', () => {
  it('neutral pose aims at the center', () => {
    expect(aimPoint(zero, zero, size)).toEqual({ x: 200, y: 400 });
  });

  it('turning right and up aims at the top-right', () => {
    const p = aimPoint({ yaw: MAX_YAW * 0.6, pitch: MAX_PITCH * 0.5 }, zero, size);
    expect(isHit(p, 'TR', size)).toBe(true);
    expect(isHit(p, 'TL', size)).toBe(false);
  });

  it('is relative to the calibrated neutral pose', () => {
    const neutral = { yaw: 0.1, pitch: -0.05 };
    expect(aimPoint(neutral, neutral, size)).toEqual({ x: 200, y: 400 });
  });

  it('each corner is reachable and the center hits none', () => {
    for (const c of ['TR', 'TL', 'BL', 'BR'] as const) {
      const pose = poseForPoint(targetPosition(c, size), size);
      expect(isHit(aimPoint(pose, zero, size), c, size)).toBe(true);
      expect(Math.abs(pose.yaw)).toBeLessThan(MAX_YAW);
    }
    for (const c of ['TR', 'TL', 'BL', 'BR'] as const) expect(isHit({ x: 200, y: 400 }, c, size)).toBe(false);
  });

  it('poseForPoint inverts aimPoint', () => {
    const p = { x: 123, y: 456 };
    const back = aimPoint(poseForPoint(p, size), zero, size);
    expect(back.x).toBeCloseTo(123);
    expect(back.y).toBeCloseTo(456);
  });

  it('hard keeps the original settings', () => {
    const h = DIFFICULTY.hard;
    expect(h.maxYaw).toBeCloseTo((24 * Math.PI) / 180);
    expect(h.maxPitch).toBeCloseTo((20 * Math.PI) / 180);
    expect([h.targetRadius, h.jawOn, h.jawOff, h.graceMs]).toEqual([0.2, 0.35, 0.25, 200]);
  });

  it('each step easier needs less turning, less mouth, bigger targets and more grace', () => {
    const [easy, medium, hard] = DIFFICULTIES.map((d) => DIFFICULTY[d]);
    for (const [a, b] of [[easy, medium], [medium, hard]]) {
      expect(a.maxYaw).toBeLessThan(b.maxYaw);
      expect(a.maxPitch).toBeLessThan(b.maxPitch);
      expect(a.jawOn).toBeLessThan(b.jawOn);
      expect(a.targetRadius).toBeGreaterThan(b.targetRadius);
      expect(a.graceMs).toBeGreaterThan(b.graceMs);
      expect(neededTurnDeg('TR', size, a).yaw).toBeLessThan(neededTurnDeg('TR', size, b).yaw);
    }
    for (const d of [easy, medium, hard]) expect(d.jawOff).toBeLessThan(d.jawOn);
  });

  it('a small head turn hits on easy but not on hard', () => {
    const pose = { yaw: (9 * Math.PI) / 180, pitch: (5 * Math.PI) / 180 };
    expect(isHit(aimPoint(pose, zero, size, DIFFICULTY.easy), 'TR', size, DIFFICULTY.easy)).toBe(true);
    expect(isHit(aimPoint(pose, zero, size, DIFFICULTY.hard), 'TR', size, DIFFICULTY.hard)).toBe(false);
  });

  it('a slightly open mouth breathes fire on easy only', () => {
    expect(fireState(0.2, false, DIFFICULTY.easy)).toBe(true);
    expect(fireState(0.2, false, DIFFICULTY.hard)).toBe(false);
  });

  it('easy targets are bigger, and unknown values fall back to medium', () => {
    expect(targetRadius(size, DIFFICULTY.easy)).toBeGreaterThan(targetRadius(size, DIFFICULTY.hard));
    expect(settingsFor(undefined)).toBe(DIFFICULTY.medium);
  });

  it('fire uses hysteresis', () => {
    expect(fireState(0.3, false)).toBe(false);
    expect(fireState(0.4, false)).toBe(true);
    expect(fireState(0.3, true)).toBe(true);
    expect(fireState(0.2, true)).toBe(false);
  });
});

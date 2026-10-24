import type { Corner } from './gameMachine';
import { DIFFICULTY, type DifficultySettings } from './difficulty';

/** Head pose in screen (mirrored) space, radians. yaw > 0 aims right, pitch > 0 aims up. */
export interface Pose {
  yaw: number;
  pitch: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

const HARD = DIFFICULTY.hard;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Maps head pose to the point on screen the fire lands on. */
export function aimPoint(pose: Pose, neutral: Pose, size: Size, d: DifficultySettings = HARD): Point {
  const nx = clamp((pose.yaw - neutral.yaw) / d.maxYaw, -1.1, 1.1);
  const ny = clamp((pose.pitch - neutral.pitch) / d.maxPitch, -1.1, 1.1);
  return { x: size.w / 2 + nx * (size.w / 2), y: size.h / 2 - ny * (size.h / 2) };
}

/** Inverse of aimPoint with a zero neutral pose; used by debug input. */
export function poseForPoint(p: Point, size: Size, d: DifficultySettings = HARD): Pose {
  return {
    yaw: ((p.x - size.w / 2) / (size.w / 2)) * d.maxYaw,
    pitch: (-(p.y - size.h / 2) / (size.h / 2)) * d.maxPitch,
  };
}

/** Center of a corner target, inset so it clears the HUD and screen edges. */
export function targetPosition(corner: Corner, size: Size): Point {
  const left = corner === 'TL' || corner === 'BL';
  const top = corner === 'TL' || corner === 'TR';
  return {
    x: left ? size.w * 0.2 : size.w * 0.8,
    y: top ? size.h * 0.24 : size.h * 0.76,
  };
}

export function targetRadius(size: Size, d: DifficultySettings = HARD): number {
  return Math.min(size.w, size.h) * d.targetRadius;
}

export function isHit(aim: Point, corner: Corner, size: Size, d: DifficultySettings = HARD): boolean {
  const t = targetPosition(corner, size);
  return Math.hypot(aim.x - t.x, aim.y - t.y) <= targetRadius(size, d);
}

/** Mouth-open with hysteresis so the fire doesn't flicker. */
export function fireState(jaw: number, wasOn: boolean, d: DifficultySettings = HARD): boolean {
  return wasOn ? jaw > d.jawOff : jaw > d.jawOn;
}

/**
 * Head turn (degrees, relative to neutral) needed to reach the target's
 * near edge, for the tuning readout.
 */
export function neededTurnDeg(corner: Corner, size: Size, d: DifficultySettings = HARD) {
  const t = targetPosition(corner, size);
  const r = targetRadius(size, d);
  // Aim the point of the circle closest to the center.
  const dx = t.x - size.w / 2;
  const dy = t.y - size.h / 2;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (dx - (dx / len) * r) / (size.w / 2);
  const ny = (dy - (dy / len) * r) / (size.h / 2);
  const toDeg = 180 / Math.PI;
  return { yaw: Math.abs(nx * d.maxYaw * toDeg), pitch: Math.abs(ny * d.maxPitch * toDeg) };
}

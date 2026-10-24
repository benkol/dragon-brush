import { describe, expect, it } from 'vitest';
import { CORNER_ORDER, DEFAULT_CONFIG, type GameEvent, type GameState, initialState, step } from './gameMachine';

const cfg = DEFAULT_CONFIG;

function run(s: GameState, frames: number, input: { hit: boolean; faceVisible?: boolean; dt?: number }) {
  const events: GameEvent[] = [];
  for (let i = 0; i < frames; i++) {
    const r = step(s, { dt: input.dt ?? 16, hit: input.hit, faceVisible: input.faceVisible ?? true }, cfg);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
}

/** Advances through ready + countdown into the first round. */
function toAiming() {
  const r = run(initialState(cfg), Math.ceil((cfg.readyMs + cfg.countdownMs) / 16) + 2, { hit: false });
  expect(r.s.phase).toBe('aiming');
  return r;
}

describe('gameMachine', () => {
  it('waits for a visible face before calibrating', () => {
    const { s, events } = run(initialState(cfg), 200, { hit: false, faceVisible: false });
    expect(s.phase).toBe('ready');
    expect(events).toHaveLength(0);
  });

  it('calibrates, counts down 3-2-1 and starts at the top-right', () => {
    const { events } = toAiming();
    expect(events[0]).toEqual({ type: 'calibrate' });
    const ticks = events.filter((e) => e.type === 'countdownTick').map((e) => (e as { n: number }).n);
    expect(ticks).toEqual([3, 2, 1]);
    expect(events.at(-1)).toEqual({ type: 'roundStart', round: 0, corner: 'TR' });
  });

  it('only burns while hitting', () => {
    let { s } = toAiming();
    s = run(s, 100, { hit: false }).s;
    expect(s.roundLeft).toBe(cfg.roundMs);
    s = run(s, 100, { hit: true }).s;
    expect(s.roundLeft).toBe(cfg.roundMs - 1600);
    s = run(s, 100, { hit: false }).s;
    // Grace window keeps burning briefly after the fire leaves.
    expect(s.roundLeft).toBeGreaterThanOrEqual(cfg.roundMs - 1600 - cfg.graceMs);
    expect(s.roundLeft).toBeLessThan(cfg.roundMs - 1600);
    expect(s.leaves[0]).toBe(1);
  });

  it('ignores short tracker dropouts inside the grace window', () => {
    let { s } = toAiming();
    s = run(s, 10, { hit: true }).s;
    for (let i = 0; i < 20; i++) {
      s = run(s, 5, { hit: true }).s;
      s = run(s, 3, { hit: false }).s; // 48 ms gap
    }
    expect(s.leaves[0]).toBe(0);
  });

  it('pauses when the face is lost', () => {
    let { s } = toAiming();
    s = run(s, 10, { hit: true }).s;
    const left = s.roundLeft;
    s = run(s, 200, { hit: true, faceVisible: false }).s;
    expect(s.roundLeft).toBe(left);
  });

  it('pauses when the app is paused', () => {
    let { s } = toAiming();
    const r = step(s, { dt: 5000, hit: true, faceVisible: true, paused: true }, cfg);
    expect(r.state.roundLeft).toBe(cfg.roundMs);
  });

  it('plays all four corners in order TR, TL, BL, BR with 120 s of brushing', () => {
    let { s } = toAiming();
    const starts: string[] = ['TR'];
    let finished = false;
    for (let i = 0; i < 20_000 && !finished; i++) {
      const r = step(s, { dt: 16, hit: s.phase === 'aiming', faceVisible: true }, cfg);
      s = r.state;
      for (const e of r.events) {
        if (e.type === 'roundStart') starts.push(e.corner);
        if (e.type === 'finished') finished = true;
      }
    }
    expect(finished).toBe(true);
    expect(starts).toEqual(CORNER_ORDER);
    expect(s.activeMs).toBe(120_000);
    expect(s.leaves).toEqual([0, 0, 0, 0]);
  });

  it('emits eat after each target', () => {
    let { s } = toAiming();
    const r = run(s, Math.ceil(cfg.roundMs / 16) + 1, { hit: true });
    expect(r.events).toContainEqual({ type: 'eat', round: 0 });
    expect(r.s.phase).toBe('eating');
  });
});

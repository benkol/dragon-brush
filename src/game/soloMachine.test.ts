import { describe, expect, it } from 'vitest';
import { SOLO_CONFIG, soloInitial, soloProgress, soloStep, soloSteps, type SoloEvent, type SoloState } from './soloMachine';

const steps = soloSteps(SOLO_CONFIG.zoneMs);

/** Runs frames of `dt` ms until `ms` have passed. */
function run(s: SoloState, ms: number, faceVisible = true, dt = 50) {
  const events: SoloEvent[] = [];
  for (let t = 0; t < ms; t += dt) {
    const r = soloStep(s, { dt, faceVisible }, steps);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
}

/** Past ready and the countdown. */
const started = () => run(soloInitial(), SOLO_CONFIG.readyMs + SOLO_CONFIG.countdownMs + 50);

describe('solo brushing', () => {
  it('covers 4 zones × outside, inside, tops in exactly 2 minutes, then the tongue', () => {
    const zones = steps.filter((x) => x.surface !== 'tongue');
    expect(zones).toHaveLength(12);
    expect(zones.reduce((sum, x) => sum + x.ms, 0)).toBe(120_000);
    expect(steps.map((x) => x.zone).slice(0, 12).filter((_, i) => i % 3 === 0)).toEqual(['TR', 'TL', 'BL', 'BR']);
    expect(steps.at(-1)?.surface).toBe('tongue');
    expect(steps.filter((x) => x.tip === 'front').map((x) => x.zone)).toEqual(['TL', 'BL']);
  });

  it('starts the first step after the countdown, marking new zones', () => {
    const { s, events } = started();
    expect(s.phase).toBe('brushing');
    const first = events.find((e) => e.type === 'stepStart');
    expect(first).toMatchObject({ index: 0, newZone: true, step: { zone: 'TR', surface: 'outside' } });
    const next = run(s, 10_000).events.filter((e) => e.type === 'stepStart');
    expect(next).toEqual([expect.objectContaining({ index: 1, newZone: false })]);
  });

  it('keeps counting through short gaps but pauses when the kid is away', () => {
    let { s } = started();
    ({ s } = run(s, 2_000, false));
    expect(s.present).toBe(true);
    expect(s.activeMs).toBeGreaterThanOrEqual(1_950);
    const r = run(s, 5_000, false);
    expect(r.events.map((e) => e.type)).toContain('away');
    const frozen = r.s.activeMs;
    expect(run(r.s, 5_000, false).s.activeMs).toBe(frozen);
    expect(run(r.s, 100, true).events.map((e) => e.type)).toContain('back');
  });

  it('does nothing while paused', () => {
    const { s } = started();
    expect(soloStep(s, { dt: 1000, faceVisible: true, paused: true }, steps).state).toEqual(s);
  });

  it('ends with spit, celebrate and finished, and the tongue is extra time', () => {
    let { s } = started();
    const r = run(s, 130_000);
    s = r.s;
    expect(soloProgress(s)).toBe(1);
    expect(s.activeMs).toBe(120_000);
    const end = run(s, SOLO_CONFIG.spitMs + SOLO_CONFIG.celebrateMs + 500);
    expect([...r.events, ...end.events].map((e) => e.type).filter((t) => t !== 'stepStart' && t !== 'countdownTick')).toEqual(['spit', 'celebrate', 'finished']);
    expect(end.s.phase).toBe('done');
  });
});

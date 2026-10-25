import { describe, expect, it } from 'vitest';
import type { KidStats, SessionResult } from '../data/types';
import { applyPurchase, applySession, canPurchase, effectiveStreak, manualSession, newKidStats } from './scoring';
import { ITEMS } from './catalog';

// Tests run with TZ=UTC (vite.config.ts), so these are local times too.
const at = (day: number, hour: number) => Date.UTC(2026, 0, day, hour, 0, 0);
const steady = [0, 0, 0, 0].map((l, i) => ({ corner: ['TR', 'TL', 'BL', 'BR'][i], leaves: l }));
const session = (endedAt: number, completed = true, perTarget = steady): SessionResult => ({
  startedAt: endedAt - 120_000,
  endedAt,
  completed,
  perTarget,
});

/** Brush morning and evening for `days` days starting on Jan `from`. */
function brushDays(k: KidStats, from: number, days: number) {
  let s = k;
  const outcomes = [];
  for (let d = from; d < from + days; d++) {
    for (const h of [7, 20]) {
      const o = applySession(s, session(at(d, h)), () => 0);
      outcomes.push(o);
      s = o.stats;
    }
  }
  return { stats: s, outcomes };
}

describe('applySession', () => {
  it('awards base + steady aim for a first brush', () => {
    const o = applySession(newKidStats(), session(at(1, 7)));
    expect(o.record.counted).toBe(true);
    expect(o.record.pointsAwarded).toBe(10 + 4 * 2);
    expect(o.stats.streak).toBe(0);
    expect(o.stats.brushesToday).toBe(1);
    expect(o.newAchievements).toContain('first_brush');
    expect(o.newAchievements).toContain('early_bird');
    expect(o.newAchievements).toContain('steady_aim');
  });

  it('skips steady bonus for targets left too often', () => {
    const shaky = steady.map((t, i) => ({ ...t, leaves: i < 2 ? 4 : 1 }));
    const o = applySession(newKidStats(), session(at(1, 7), true, shaky));
    expect(o.record.pointsAwarded).toBe(10 + 2 * 2);
  });

  it('gives the second-brush bonus and starts the streak on the evening brush', () => {
    const a = applySession(newKidStats(), session(at(1, 7))).stats;
    const o = applySession(a, session(at(1, 20)));
    expect(o.record.bonuses.map((b) => b.key)).toContain('second_brush');
    expect(o.record.pointsAwarded).toBe(18 + 5);
    expect(o.stats.streak).toBe(1);
    expect(o.stats.lastFullDay).toBe('2026-01-01');
  });

  it('does not count a brush less than 6 hours after the last one', () => {
    const a = applySession(newKidStats(), session(at(1, 7))).stats;
    const o = applySession(a, session(at(1, 9)));
    expect(o.record.counted).toBe(false);
    expect(o.notCountedReason).toBe('too_soon');
    expect(o.stats.points).toBe(a.points);
    expect(o.stats.totalBrushes).toBe(2);
  });

  it('caps counted brushes at 2 per day', () => {
    const { stats } = brushDays(newKidStats(), 1, 1);
    const o = applySession(stats, session(at(1, 23)));
    expect(o.notCountedReason).toBe('daily_cap');
    expect(o.record.pointsAwarded).toBe(0);
  });

  it('gives nothing for an incomplete session', () => {
    const o = applySession(newKidStats(), session(at(1, 7), false));
    expect(o.notCountedReason).toBe('incomplete');
    expect(o.stats.totalBrushes).toBe(0);
  });

  it('applies streak multipliers and milestone chests', () => {
    const { stats, outcomes } = brushDays(newKidStats(), 1, 7);
    expect(stats.streak).toBe(7);
    // Day 3 evening: streak becomes 3 → ×1.5 and the 3-day chest.
    const day3evening = outcomes[5];
    expect(day3evening.multiplier).toBe(1.5);
    expect(day3evening.record.bonuses.find((b) => b.key === 'milestone')?.points).toBe(25);
    // Day 7 evening: ×2, 7-day chest and perfect week.
    const day7evening = outcomes[13];
    expect(day7evening.multiplier).toBe(2);
    const keys = day7evening.record.bonuses.map((b) => b.key);
    expect(keys).toContain('milestone');
    expect(keys).toContain('perfect_week');
    expect(day7evening.record.pointsAwarded).toBe(Math.round(23 * 2) + 60 + 100);
    expect(day7evening.newAchievements).toEqual(expect.arrayContaining(['streak_7', 'perfect_week']));
  });

  it('awards perfect week at most once every 7 days', () => {
    const { outcomes } = brushDays(newKidStats(), 1, 10);
    const perfect = outcomes.filter((o) => o.record.bonuses.some((b) => b.key === 'perfect_week'));
    expect(perfect).toHaveLength(1);
  });

  it('breaks the streak after a missed day without a shield', () => {
    const { stats } = brushDays(newKidStats(), 1, 3);
    expect(stats.streak).toBe(3);
    const o = applySession(stats, session(at(5, 7)));
    expect(o.stats.streak).toBe(0);
    expect(o.stats.eggProgress).toBe(0);
  });

  it('a shield covers exactly one missed day', () => {
    const { stats } = brushDays(newKidStats(), 1, 3);
    const shielded = { ...stats, shields: 1 };
    expect(effectiveStreak(shielded, at(5, 7))).toBe(3);
    const o = applySession(shielded, session(at(5, 7)));
    expect(o.shieldUsed).toBe(true);
    expect(o.stats.shields).toBe(0);
    const o2 = applySession(o.stats, session(at(5, 20)));
    expect(o2.stats.streak).toBe(4);

    const twoMissed = applySession(shielded, session(at(6, 7)));
    expect(twoMissed.stats.streak).toBe(0);
    expect(twoMissed.stats.shields).toBe(1);
  });

  it('a one-brush day keeps the streak alive until the day ends, then counts as missed', () => {
    const { stats } = brushDays(newKidStats(), 1, 2);
    const morning = applySession(stats, session(at(3, 7))).stats;
    expect(morning.streak).toBe(2);
    expect(effectiveStreak(morning, at(3, 22))).toBe(2);
    expect(effectiveStreak(morning, at(4, 8))).toBe(0);
    expect(effectiveStreak({ ...morning, shields: 1 }, at(4, 8))).toBe(2);
  });

  it('earns a shield at 14 days and the gold dragon at 30', () => {
    const fourteen = brushDays(newKidStats(), 1, 14);
    expect(fourteen.outcomes.some((o) => o.shieldEarned)).toBe(true);
    const thirty = brushDays(fourteen.stats, 15, 16);
    expect(thirty.stats.streak).toBe(30);
    expect(thirty.stats.owned).toContain('dragon.gold');
  });

  it('hatches an egg dragon after 7 full days', () => {
    const { stats, outcomes } = brushDays(newKidStats(), 1, 7);
    const hatch = outcomes.find((o) => o.hatched);
    expect(hatch?.hatched).toBe('dragon.pip');
    expect(stats.owned).toContain('dragon.pip');
    expect(stats.eggProgress).toBe(0);
    expect(stats.achievements).toContain('egg_hatcher');
  });

  it('levels up the equipped dragon', () => {
    const { outcomes, stats } = brushDays(newKidStats(), 1, 3);
    expect(stats.dragonXp['dragon.ember']).toBe(6 * 18);
    expect(outcomes.some((o) => o.levelUp?.level === 2)).toBe(true);
  });

  it('trims the day log to 14 days', () => {
    const { stats } = brushDays(newKidStats(), 1, 20);
    expect(Object.keys(stats.dayLog).length).toBeLessThanOrEqual(14);
  });
});

describe('manual brushes', () => {
  it('earns base points but no steady-aim bonus or sticker', () => {
    const o = applySession(newKidStats(), manualSession(at(1, 7)));
    expect(o.record.counted).toBe(true);
    expect(o.record.manual).toBe(true);
    expect(o.record.pointsAwarded).toBe(10);
    expect(o.newAchievements).not.toContain('steady_aim');
    expect(o.newAchievements).toContain('first_brush');
  });

  it('completes the day and keeps the streak going', () => {
    const { stats } = brushDays(newKidStats(), 1, 3);
    const morning = applySession(stats, manualSession(at(4, 7))).stats;
    const o = applySession(morning, session(at(4, 20)));
    expect(o.stats.streak).toBe(4);
    expect(o.record.bonuses.map((b) => b.key)).toContain('second_brush');
  });

  it('can be logged for earlier today after an app brush', () => {
    const evening = applySession(newKidStats(), session(at(1, 20))).stats;
    const o = applySession(evening, manualSession(at(1, 7)));
    expect(o.record.counted).toBe(true);
    expect(o.stats.streak).toBe(1);
    // The later brush stays the reference for the 6-hour gap.
    expect(o.stats.lastBrushAt).toBe(at(1, 20));
  });

  it('needs 6 hours from other brushes in either direction', () => {
    const evening = applySession(newKidStats(), session(at(1, 20))).stats;
    expect(applySession(evening, manualSession(at(1, 16))).notCountedReason).toBe('too_soon');
  });

  it('respects the daily cap', () => {
    const { stats } = brushDays(newKidStats(), 1, 1);
    expect(applySession(stats, manualSession(at(1, 23))).notCountedReason).toBe('daily_cap');
  });
});

describe('brushes without the camera', () => {
  it('count like a normal brush, without the steady-aim bonus', () => {
    const o = applySession(newKidStats(), { ...session(at(1, 7), true, []), noCamera: true });
    expect(o.record.counted).toBe(true);
    expect(o.record.noCamera).toBe(true);
    expect(o.record.pointsAwarded).toBe(10);
    expect(o.newAchievements).not.toContain('steady_aim');
    const evening = applySession(o.stats, { ...session(at(1, 20), true, []), noCamera: true });
    expect(evening.stats.streak).toBe(1);
  });
});

describe('brushing by myself', () => {
  it('earns the same base points and streak, without the steady-aim bonus', () => {
    const o = applySession(newKidStats(), { ...session(at(1, 7), true, []), solo: true });
    expect(o.record.counted).toBe(true);
    expect(o.record.solo).toBe(true);
    expect(o.record.pointsAwarded).toBe(10);
    expect(o.newAchievements).not.toContain('steady_aim');
    expect(applySession(o.stats, { ...session(at(1, 20), true, []), solo: true }).stats.streak).toBe(1);
  });
});

describe('purchases', () => {
  it('deducts points and adds the item', () => {
    const k = { ...newKidStats(), points: 100 };
    const { stats, newAchievements } = applyPurchase(k, ITEMS['hat.party']);
    expect(stats.points).toBe(60);
    expect(stats.owned).toContain('hat.party');
    expect(newAchievements).toContain('shopper');
  });

  it('rejects unaffordable, owned and locked items', () => {
    const k = newKidStats();
    expect(canPurchase(k, ITEMS['hat.crown'])).toBe('not_enough');
    expect(canPurchase({ ...k, points: 999 }, ITEMS['dragon.ember'])).toBe('owned');
    expect(canPurchase({ ...k, points: 999 }, ITEMS['dragon.gold'])).toBe('locked');
  });

  it('shields stack', () => {
    const k = { ...newKidStats(), points: 400 };
    const once = applyPurchase(k, ITEMS.shield).stats;
    const twice = applyPurchase(once, ITEMS.shield).stats;
    expect(twice.shields).toBe(2);
    expect(twice.points).toBe(100);
  });
});

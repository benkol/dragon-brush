import { describe, expect, it } from 'vitest';
import { birthdayWeekYear, currentSeasons, holidayToday, inSeason, withCostume } from './seasons';
import { challengeFor, weekKey, weekStatus } from './challenges';
import { applyDentist, applyPurchase, applySession, applyToothFairy, canPurchase, newKidStats } from './scoring';
import { DEFAULT_EQUIPPED, ITEMS } from './catalog';

// Tests run with TZ=UTC, so these are local times.
const d = (y: number, m: number, day: number, h = 12) => Date.UTC(y, m - 1, day, h);

describe('holiday windows', () => {
  it('Halloween by the regular calendar', () => {
    expect(inSeason('halloween', d(2026, 10, 20))).toBe(true);
    expect(inSeason('halloween', d(2026, 11, 5))).toBe(false);
  });

  it('Hanukkah follows the Hebrew calendar (25 Kislev 5786 = Dec 15, 2025)', () => {
    expect(inSeason('hanukkah', d(2025, 12, 10))).toBe(true);
    expect(inSeason('hanukkah', d(2025, 12, 18))).toBe(true);
    expect(inSeason('hanukkah', d(2025, 11, 20))).toBe(false);
    expect(inSeason('hanukkah', d(2026, 1, 10))).toBe(false);
  });

  it('Purim, including Adar II in a leap year', () => {
    expect(inSeason('purim', d(2026, 2, 25))).toBe(true); // Adar 8, 5786
    expect(inSeason('purim', d(2026, 2, 10))).toBe(false); // Shevat
    expect(inSeason('purim', d(2027, 3, 20))).toBe(true); // Adar II 11, 5787
    expect(inSeason('purim', d(2027, 2, 15))).toBe(false); // Adar I
  });

  it('Passover and Rosh Hashanah', () => {
    expect(inSeason('passover', d(2026, 3, 25))).toBe(true);
    expect(inSeason('passover', d(2026, 4, 15))).toBe(false);
    expect(inSeason('roshhashana', d(2026, 9, 8))).toBe(true); // Elul, before the new year
    expect(inSeason('roshhashana', d(2026, 9, 14))).toBe(true); // Tishri 3
    expect(inSeason('roshhashana', d(2026, 9, 28))).toBe(false);
  });

  it('quiet weeks have no season, summer has its own', () => {
    expect(currentSeasons(d(2026, 4, 12))).toEqual([]); // after Passover, before Independence Day
    expect(currentSeasons(d(2026, 7, 15))).toEqual(['summer']);
  });
});

describe('new holiday windows', () => {
  it('match the 2026 Hebrew calendar', () => {
    expect(inSeason('tubishvat', d(2026, 2, 2))).toBe(true); // 15 Shevat
    expect(inSeason('independence', d(2026, 4, 22))).toBe(true); // 5 Iyar
    expect(inSeason('lagbaomer', d(2026, 5, 5))).toBe(true); // 18 Iyar
    expect(inSeason('shavuot', d(2026, 5, 22))).toBe(true); // 6 Sivan
    expect(inSeason('sukkot', d(2026, 9, 26))).toBe(true); // 15 Tishri
    expect(inSeason('lagbaomer', d(2026, 5, 20))).toBe(false);
  });

  it('summer, winter (wrapping the year) and New Year', () => {
    expect(inSeason('summer', d(2026, 8, 1))).toBe(true);
    expect(inSeason('winter', d(2027, 1, 20))).toBe(true);
    expect(inSeason('winter', d(2026, 11, 20))).toBe(false);
    expect(inSeason('newyear', d(2026, 12, 31))).toBe(true);
  });
});

describe('holiday days', () => {
  it('finds the holiday and which day of it', () => {
    expect(holidayToday(d(2026, 12, 5))).toEqual({ holiday: 'hanukkah', day: 0 }); // 25 Kislev 5787
    expect(holidayToday(d(2026, 12, 8))).toEqual({ holiday: 'hanukkah', day: 3 });
    expect(holidayToday(d(2026, 5, 5))).toEqual({ holiday: 'lagbaomer', day: 0 });
    expect(holidayToday(d(2026, 3, 20))).toEqual({ holiday: 'oralhealth', day: 0 });
    expect(holidayToday(d(2027, 1, 1))).toEqual({ holiday: 'newyear', day: 1 });
    expect(holidayToday(d(2026, 6, 10))).toBeNull();
  });

  it('doubles the points of the first counted brush on the first day', () => {
    const o = applySession(newKidStats(), { startedAt: 0, endedAt: d(2026, 5, 5, 8), completed: true, perTarget: [] });
    expect(o.holiday).toBe('lagbaomer');
    expect(o.record.bonuses.find((b) => b.key === 'holiday')?.points).toBe(10);
    expect(o.record.pointsAwarded).toBe(20);
    const later = applySession(newKidStats(), { startedAt: 0, endedAt: d(2026, 12, 8, 8), completed: true, perTarget: [] });
    expect(later.holiday).toBeUndefined();
  });

  it('dresses the dragon up only in empty slots', () => {
    expect(withCostume(DEFAULT_EQUIPPED, d(2026, 10, 31)).hat).toBe('hat.witch');
    expect(withCostume({ ...DEFAULT_EQUIPPED, hat: 'hat.crown' }, d(2026, 10, 31)).hat).toBe('hat.crown');
    expect(withCostume(DEFAULT_EQUIPPED, d(2026, 6, 10))).toEqual(DEFAULT_EQUIPPED);
    // Birthday week wins.
    expect(withCostume(DEFAULT_EQUIPPED, d(2026, 10, 31), '2019-10-30').hat).toBe('hat.birthday');
  });
});

describe('special moments', () => {
  it('the tooth fairy brings wings the first time, then just a chest', () => {
    const first = applyToothFairy(newKidStats(), d(2026, 3, 1));
    if ('error' in first) throw new Error('unexpected');
    expect(first.stats.points).toBe(50);
    expect(first.stats.owned).toContain('necklace.fairywings');
    expect(first.stats.surprise).toMatchObject({ kind: 'toothFairy', wings: true });
    expect(first.newAchievements).toContain('tooth_fairy');
    expect(applyToothFairy(first.stats, d(2026, 3, 1, 15))).toEqual({ error: 'too_soon' });
    const second = applyToothFairy(first.stats, d(2026, 3, 9));
    if ('error' in second) throw new Error('unexpected');
    expect(second.stats.teethLost).toBe(2);
    expect(second.stats.surprise?.wings).toBe(false);
  });

  it('dentist visits pay a bravery chest at most once a month', () => {
    const o = applyDentist(newKidStats(), d(2026, 3, 1));
    if ('error' in o) throw new Error('unexpected');
    expect(o.stats.points).toBe(75);
    expect(o.newAchievements).toContain('brave_dentist');
    expect(applyDentist(o.stats, d(2026, 3, 20))).toEqual({ error: 'too_soon' });
    expect('stats' in applyDentist(o.stats, d(2026, 4, 5))).toBe(true);
  });

  it('brushing anniversary: cake and chest a year after the first brush', () => {
    const brush = (y: number, m: number, day: number) => ({ startedAt: 0, endedAt: d(y, m, day, 8), completed: true, perTarget: [] });
    const first = applySession(newKidStats(), brush(2026, 6, 10)).stats;
    expect(first.firstBrushDay).toBe('2026-06-10');
    expect(applySession(first, brush(2026, 6, 12)).anniversary).toBeUndefined();
    const year = applySession(first, brush(2027, 6, 11));
    expect(year.anniversary).toEqual({ years: 1, cake: true });
    expect(year.stats.owned).toContain('food.cake');
    expect(year.newAchievements).toContain('anniversary');
  });
});

describe('birthday week', () => {
  it('covers the birthday and the 6 days after', () => {
    expect(birthdayWeekYear('2018-03-10', d(2026, 3, 10))).toBe(2026);
    expect(birthdayWeekYear('2018-03-10', d(2026, 3, 16))).toBe(2026);
    expect(birthdayWeekYear('2018-03-10', d(2026, 3, 17))).toBeNull();
    expect(birthdayWeekYear('2018-03-10', d(2026, 3, 9))).toBeNull();
  });

  it('wraps into the new year and handles Feb 29', () => {
    expect(birthdayWeekYear('2017-12-30', d(2026, 1, 2))).toBe(2025);
    expect(birthdayWeekYear('2016-02-29', d(2027, 2, 28))).toBe(2027);
    expect(birthdayWeekYear(null, d(2026, 1, 2))).toBeNull();
  });
});

describe('weekly challenge', () => {
  it('weeks start on Sunday and rotate challenges', () => {
    expect(weekKey(d(2026, 1, 7))).toBe('2026-01-04');
    expect(weekKey(d(2026, 1, 4))).toBe('2026-01-04');
    expect(challengeFor('2026-01-04').kind).toBe('evenings');
    expect(challengeFor('2026-01-11').kind).not.toBe('evenings');
  });

  it('completing it pays the chest once', () => {
    let k = newKidStats();
    const evening = (day: number) => ({ startedAt: 0, endedAt: d(2026, 1, day, 19), completed: true, perTarget: [] });
    const outcomes = [];
    for (const day of [4, 5, 6, 7, 8, 9]) {
      const o = applySession(k, evening(day));
      outcomes.push(o);
      k = o.stats;
    }
    expect(outcomes.map((o) => !!o.weeklyDone)).toEqual([false, false, false, false, true, false]);
    expect(outcomes[4].record.bonuses.find((b) => b.key === 'weekly')?.points).toBe(75);
    expect(outcomes[4].newAchievements).toContain('weekly_hero');
    expect(weekStatus(k.week, d(2026, 1, 9)).done).toBe(true);
    // Next week starts fresh.
    expect(weekStatus(k.week, d(2026, 1, 12)).progress).toBe(0);
  });

  it('morning brushes do not count toward the evenings challenge', () => {
    const o = applySession(newKidStats(), { startedAt: 0, endedAt: d(2026, 1, 5, 7), completed: true, perTarget: [] });
    expect(o.stats.week?.progress).toBe(0);
  });
});

describe('birthday gift', () => {
  const brush = (day: number, h = 8) => ({ startedAt: 0, endedAt: d(2026, 1, day, h), completed: true, perTarget: [] });

  it('first brush of the birthday week gives a hat and a chest, once a year', () => {
    const kid = { ...newKidStats(), birthday: '2019-01-05' };
    const first = applySession(kid, brush(6));
    expect(first.birthday).toEqual({ hat: true });
    expect(first.stats.owned).toContain('hat.birthday');
    expect(first.record.bonuses.find((b) => b.key === 'birthday')?.points).toBe(50);
    expect(first.newAchievements).toContain('birthday');
    const second = applySession({ ...first.stats, birthday: '2019-01-05' }, brush(6, 20));
    expect(second.birthday).toBeUndefined();
  });

  it('next year: chest again, no second hat', () => {
    const kid = { ...newKidStats(), birthday: '2019-01-05', owned: [...newKidStats().owned, 'hat.birthday'], lastBirthdayYear: 2025 };
    const o = applySession(kid, brush(5));
    expect(o.birthday).toEqual({ hat: false });
  });

  it('no gift outside the birthday week or without a birthday', () => {
    expect(applySession({ ...newKidStats(), birthday: '2019-03-01' }, brush(6)).birthday).toBeUndefined();
    expect(applySession(newKidStats(), brush(6)).birthday).toBeUndefined();
  });
});

describe('seasonal shop items', () => {
  const rich = { ...newKidStats(), points: 1000 };

  it('can be bought only in season and are kept after', () => {
    expect(canPurchase(rich, ITEMS['food.pumpkin'], d(2026, 10, 20))).toBeNull();
    expect(canPurchase(rich, ITEMS['food.pumpkin'], d(2026, 6, 1))).toBe('out_of_season');
    const bought = applyPurchase(rich, ITEMS['food.pumpkin'], d(2026, 10, 20));
    expect(bought.stats.owned).toContain('food.pumpkin');
    expect(bought.newAchievements).toContain('holiday_spirit');
  });

  it('the birthday hat is never for sale', () => {
    expect(canPurchase(rich, ITEMS['hat.birthday'], d(2026, 10, 20))).toBe('locked');
  });
});

import type { Bonus, KidStats, SessionRecord, SessionResult } from '../data/types';
import { DEFAULT_EQUIPPED, EGG_DRAGONS, STARTER_OWNED } from './catalog';
import { addDays, dayKey, daysBetween } from './dates';
import { newAchievements } from './achievements';
import { advances, challengeFor, weekKey } from './challenges';
import { birthdayWeekYear, holidayToday, inSeason, type Holiday, type Season } from './seasons';

export const BASE_POINTS = 10;
export const STEADY_POINTS = 2;
export const STEADY_MAX_LEAVES = 3;
export const SECOND_BRUSH_POINTS = 5;
export const MIN_GAP_MS = 6 * 3_600_000;
export const MAX_COUNTED_PER_DAY = 2;
export const PERFECT_WEEK_POINTS = 100;
export const EGG_DAYS = 7;
export const XP_PER_LEVEL = 100;
export const MAX_LEVEL = 10;
export const WINGS_LEVEL = 5;
export const MILESTONES: Record<number, number> = { 3: 25, 7: 60, 14: 120, 30: 250, 100: 1000 };
export const SHIELD_MILESTONE = 14;
export const GOLD_STREAK = 30;

export function multiplierFor(streak: number): number {
  if (streak >= 7) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

export function dragonLevel(xp: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(xp / XP_PER_LEVEL));
}

export function newKidStats(): KidStats {
  return {
    points: 0,
    totalBrushes: 0,
    countedBrushes: 0,
    streak: 0,
    bestStreak: 0,
    lastFullDay: null,
    lastBrushDay: null,
    brushesToday: 0,
    lastBrushAt: null,
    shields: 0,
    dayLog: {},
    lastPerfectWeekDay: null,
    eggProgress: 0,
    dragonXp: {},
    achievements: [],
    owned: [...STARTER_OWNED],
    equipped: { ...DEFAULT_EQUIPPED },
    week: null,
    lastBirthdayYear: null,
    firstBrushDay: null,
    lastAnniversaryYear: null,
    teethLost: 0,
    lastToothAt: null,
    lastDentistAt: null,
    surprise: null,
  };
}

export const BIRTHDAY_POINTS = 50;
export const BIRTHDAY_HAT = 'hat.birthday';
export const ANNIVERSARY_POINTS = 100;
export const ANNIVERSARY_CAKE = 'food.cake';
export const TOOTH_FAIRY_POINTS = 50;
export const TOOTH_FAIRY_WINGS = 'necklace.fairywings';
export const DENTIST_POINTS = 75;
/** Can't log another lost tooth within 12 hours, or a dentist visit within 30 days. */
export const TOOTH_GAP_MS = 12 * 3_600_000;
export const DENTIST_GAP_MS = 30 * 86_400_000;

/**
 * Streak as it should be shown today: 0 once it is broken beyond what a
 * shield could cover, even if no brush has happened since.
 */
export function effectiveStreak(k: KidStats, now: number): number {
  if (!k.lastFullDay || k.streak === 0) return 0;
  const gap = daysBetween(k.lastFullDay, dayKey(now));
  if (gap <= 1) return k.streak;
  if (gap === 2 && k.shields > 0) return k.streak;
  return 0;
}

export function countedToday(k: KidStats, now: number): number {
  return k.lastBrushDay === dayKey(now) ? k.brushesToday : 0;
}

export interface SessionOutcome {
  stats: KidStats;
  record: SessionRecord;
  /** Why the session earned nothing, if it didn't. */
  notCountedReason?: 'incomplete' | 'daily_cap' | 'too_soon';
  multiplier: number;
  newAchievements: string[];
  hatched?: string;
  goldUnlocked?: boolean;
  shieldUsed?: boolean;
  shieldEarned?: boolean;
  levelUp?: { dragon: string; level: number };
  /** Completed this week's challenge with this brush. */
  weeklyDone?: boolean;
  /** First counted brush of the birthday week: gift given (hat on first birthday). */
  birthday?: { hat: boolean };
  /** First counted brush of an anniversary week of using the app. */
  anniversary?: { years: number; cake: boolean };
  /** First day of a holiday: points doubled. */
  holiday?: Holiday;
}

/**
 * Applies a finished brushing session to a kid's stats. Pure: `rng` picks the
 * hatched dragon so tests can be deterministic. The kid's birthday (if
 * known) unlocks the yearly birthday gift.
 */
export function applySession(
  prev: KidStats & { birthday?: string | null },
  session: SessionResult,
  rng: () => number = Math.random,
): SessionOutcome {
  const k: KidStats = structuredClone(prev);
  const now = session.endedAt;
  const today = dayKey(now);
  const bonuses: Bonus[] = [];
  const out: Omit<SessionOutcome, 'stats' | 'record' | 'newAchievements'> = { multiplier: 1 };

  const done = (counted: boolean, reason?: SessionOutcome['notCountedReason'], points = 0): SessionOutcome => {
    if (session.completed) k.totalBrushes += 1;
    const ctx = {
      hour: session.completed ? new Date(now).getHours() : undefined,
      allSteady: counted && session.perTarget.length > 0 && session.perTarget.every((t) => t.leaves <= STEADY_MAX_LEAVES),
      perfectWeek: bonuses.some((b) => b.key === 'perfect_week'),
      hatched: !!out.hatched,
      weeklyDone: !!out.weeklyDone,
    };
    const earned = newAchievements(k, ctx);
    k.achievements.push(...earned);
    return {
      ...out,
      stats: k,
      notCountedReason: reason,
      newAchievements: earned,
      record: { ...session, counted, pointsAwarded: points, bonuses },
    };
  };

  if (!session.completed) return done(false, 'incomplete');

  const sameDay = k.lastBrushDay === today;
  const todayCount = sameDay ? k.brushesToday : 0;
  if (todayCount >= MAX_COUNTED_PER_DAY) return done(false, 'daily_cap');
  // abs(): a parent may log a brush from earlier today, after one done in the app.
  if (sameDay && k.lastBrushAt !== null && Math.abs(now - k.lastBrushAt) < MIN_GAP_MS) return done(false, 'too_soon');

  // A missed day breaks the streak unless a shield covers exactly one day.
  if (k.lastFullDay && k.streak > 0) {
    const missed = daysBetween(k.lastFullDay, today) - 1;
    if (missed === 1 && k.shields > 0 && todayCount === 0) {
      k.shields -= 1;
      k.lastFullDay = addDays(today, -1);
      out.shieldUsed = true;
    } else if (missed >= 1) {
      k.streak = 0;
      k.eggProgress = 0;
    }
  }

  k.brushesToday = todayCount + 1;
  k.lastBrushDay = today;
  k.lastBrushAt = Math.max(k.lastBrushAt ?? 0, now);
  k.countedBrushes += 1;
  k.dayLog[today] = (k.dayLog[today] ?? 0) + 1;
  for (const d of Object.keys(k.dayLog)) if (daysBetween(d, today) >= 14) delete k.dayLog[d];

  let subtotal = BASE_POINTS;
  bonuses.push({ key: 'base', points: BASE_POINTS });
  const steady = session.perTarget.filter((t) => t.leaves <= STEADY_MAX_LEAVES).length;
  if (steady > 0) {
    subtotal += steady * STEADY_POINTS;
    bonuses.push({ key: 'steady', points: steady * STEADY_POINTS, values: { count: steady } });
  }
  if (k.brushesToday === 2) {
    subtotal += SECOND_BRUSH_POINTS;
    bonuses.push({ key: 'second_brush', points: SECOND_BRUSH_POINTS });
  }

  let extra = 0;
  if (k.brushesToday === 2) {
    // The day is complete: it extends the streak.
    k.streak += 1;
    k.lastFullDay = today;
    k.bestStreak = Math.max(k.bestStreak, k.streak);

    const chest = MILESTONES[k.streak];
    if (chest) {
      extra += chest;
      bonuses.push({ key: 'milestone', points: chest, values: { days: k.streak } });
    }
    if (k.streak === SHIELD_MILESTONE) {
      k.shields += 1;
      out.shieldEarned = true;
    }
    if (k.streak >= GOLD_STREAK && !k.owned.includes('dragon.gold')) {
      k.owned.push('dragon.gold');
      out.goldUnlocked = true;
    }

    const lastWeek = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
    const perfect = lastWeek.every((d) => (k.dayLog[d] ?? 0) >= 2);
    const sinceLast = k.lastPerfectWeekDay ? daysBetween(k.lastPerfectWeekDay, today) : Infinity;
    if (perfect && sinceLast >= 7) {
      extra += PERFECT_WEEK_POINTS;
      k.lastPerfectWeekDay = today;
      bonuses.push({ key: 'perfect_week', points: PERFECT_WEEK_POINTS });
    }

    const unhatched = EGG_DRAGONS.filter((d) => !k.owned.includes(d));
    if (unhatched.length > 0) {
      k.eggProgress += 1;
      if (k.eggProgress >= EGG_DAYS) {
        const pick = unhatched[Math.floor(rng() * unhatched.length) % unhatched.length];
        k.owned.push(pick);
        k.eggProgress = 0;
        out.hatched = pick;
      }
    }
  }

  // Weekly challenge.
  const wk = weekKey(now);
  if (k.week?.key !== wk) k.week = { key: wk, progress: 0, done: false };
  const challenge = challengeFor(wk);
  const facts = {
    hour: new Date(now).getHours(),
    completesDay: k.brushesToday === 2,
    allSteady: session.perTarget.length === 4 && session.perTarget.every((t) => t.leaves <= STEADY_MAX_LEAVES),
  };
  if (!k.week.done && advances(challenge.kind, facts)) {
    k.week.progress += 1;
    if (k.week.progress >= challenge.goal) {
      k.week.done = true;
      extra += challenge.reward;
      out.weeklyDone = true;
      bonuses.push({ key: 'weekly', points: challenge.reward });
    }
  }

  // Birthday gift: once a year, on the first counted brush of the birthday week.
  const bdayYear = birthdayWeekYear(prev.birthday, now);
  if (bdayYear !== null && k.lastBirthdayYear !== bdayYear) {
    k.lastBirthdayYear = bdayYear;
    extra += BIRTHDAY_POINTS;
    bonuses.push({ key: 'birthday', points: BIRTHDAY_POINTS });
    const hat = !k.owned.includes(BIRTHDAY_HAT);
    if (hat) k.owned.push(BIRTHDAY_HAT);
    out.birthday = { hat };
  }

  // Brushing anniversary: once a year, starting a year after the first brush.
  k.firstBrushDay ??= today;
  const annYear = birthdayWeekYear(k.firstBrushDay, now);
  const years = annYear === null ? 0 : annYear - Number(k.firstBrushDay.slice(0, 4));
  if (annYear !== null && years >= 1 && k.lastAnniversaryYear !== annYear) {
    k.lastAnniversaryYear = annYear;
    extra += ANNIVERSARY_POINTS;
    bonuses.push({ key: 'anniversary', points: ANNIVERSARY_POINTS, values: { years } });
    const cake = !k.owned.includes(ANNIVERSARY_CAKE);
    if (cake) k.owned.push(ANNIVERSARY_CAKE);
    out.anniversary = { years, cake };
  }

  const mult = multiplierFor(k.streak);
  out.multiplier = mult;
  const multiplied = Math.round(subtotal * mult);
  if (mult > 1) bonuses.push({ key: 'multiplier', points: multiplied - subtotal, values: { mult } });

  // Double points on the first day of a holiday (and World Oral Health Day).
  const hol = holidayToday(now);
  if (hol && hol.day === 0) {
    extra += multiplied;
    out.holiday = hol.holiday;
    bonuses.push({ key: 'holiday', points: multiplied, values: { holiday: hol.holiday } });
  }

  const total = multiplied + extra;
  k.points += total;

  const dragon = k.equipped.dragon;
  const before = dragonLevel(k.dragonXp[dragon] ?? 0);
  k.dragonXp[dragon] = (k.dragonXp[dragon] ?? 0) + BASE_POINTS + steady * STEADY_POINTS;
  const after = dragonLevel(k.dragonXp[dragon]);
  if (after > before) out.levelUp = { dragon, level: after };

  // totalBrushes is incremented in done().
  return done(true, undefined, total);
}

/**
 * A brush done without the app, logged by a parent. `at` must be today and
 * not in the future. It counts like a normal brush (streak, multiplier,
 * second-brush bonus) but has no targets, so no steady-aim bonus.
 */
export function manualSession(at: number): SessionResult {
  return { startedAt: at, endedAt: at, completed: true, perTarget: [], manual: true };
}

// ---------------------------------------------------------------------------
// Special moments a parent logs

export type MomentResult = { stats: KidStats; newAchievements: string[] } | { error: 'too_soon' };

/** The kid lost a tooth: the tooth fairy brings a chest (and wings the first time). */
export function applyToothFairy(prev: KidStats, now: number): MomentResult {
  if (prev.lastToothAt !== null && now - prev.lastToothAt < TOOTH_GAP_MS) return { error: 'too_soon' };
  const k = structuredClone(prev);
  k.teethLost += 1;
  k.lastToothAt = now;
  k.points += TOOTH_FAIRY_POINTS;
  const wings = !k.owned.includes(TOOTH_FAIRY_WINGS);
  if (wings) k.owned.push(TOOTH_FAIRY_WINGS);
  k.surprise = { kind: 'toothFairy', at: now, points: TOOTH_FAIRY_POINTS, wings };
  const earned = newAchievements(k);
  k.achievements.push(...earned);
  return { stats: k, newAchievements: earned };
}

/** A dentist checkup: a bravery chest. */
export function applyDentist(prev: KidStats, now: number): MomentResult {
  if (prev.lastDentistAt !== null && now - prev.lastDentistAt < DENTIST_GAP_MS) return { error: 'too_soon' };
  const k = structuredClone(prev);
  k.lastDentistAt = now;
  k.points += DENTIST_POINTS;
  k.surprise = { kind: 'dentist', at: now, points: DENTIST_POINTS };
  const earned = newAchievements(k);
  k.achievements.push(...earned);
  return { stats: k, newAchievements: earned };
}

export type PurchaseError = 'not_enough' | 'owned' | 'locked' | 'out_of_season' | 'unknown';

type Buyable = { id: string; price: number; category: string; unlock?: object; season?: Season };

export function canPurchase(k: KidStats, item: Buyable, now = Date.now()): PurchaseError | null {
  if (item.unlock) return 'locked';
  if (item.category !== 'shield' && k.owned.includes(item.id)) return 'owned';
  if (item.season && !inSeason(item.season, now)) return 'out_of_season';
  if (k.points < item.price) return 'not_enough';
  return null;
}

export function applyPurchase(prev: KidStats, item: Buyable, now = Date.now()): { stats: KidStats; newAchievements: string[] } {
  const err = canPurchase(prev, item, now);
  if (err) throw new Error(err);
  const k = structuredClone(prev);
  k.points -= item.price;
  if (item.category === 'shield') k.shields += 1;
  else k.owned.push(item.id);
  const earned = newAchievements(k);
  k.achievements.push(...earned);
  return { stats: k, newAchievements: earned };
}

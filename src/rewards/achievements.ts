import type { KidStats } from '../data/types';
import { ITEMS } from './catalog';
import { dragonLevel } from './scoring';

export interface Achievement {
  id: string;
  emoji: string;
  check: (k: KidStats, ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  /** Local hour of the session that just finished, if any. */
  hour?: number;
  allSteady?: boolean;
  perfectWeek?: boolean;
  hatched?: boolean;
  weeklyDone?: boolean;
}

const ownedIn = (k: KidStats, cat: string) => k.owned.filter((id) => ITEMS[id]?.category === cat).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_brush', emoji: '🦷', check: (k) => k.totalBrushes >= 1 },
  { id: 'early_bird', emoji: '🐤', check: (_k, c) => c.hour !== undefined && c.hour < 8 },
  { id: 'night_owl', emoji: '🦉', check: (_k, c) => c.hour !== undefined && c.hour >= 19 },
  { id: 'steady_aim', emoji: '🎯', check: (_k, c) => !!c.allSteady },
  { id: 'ten_brushes', emoji: '🔟', check: (k) => k.totalBrushes >= 10 },
  { id: 'streak_3', emoji: '🔥', check: (k) => k.bestStreak >= 3 },
  { id: 'streak_7', emoji: '🗓️', check: (k) => k.bestStreak >= 7 },
  { id: 'perfect_week', emoji: '🌟', check: (_k, c) => !!c.perfectWeek },
  { id: 'fifty_brushes', emoji: '🏆', check: (k) => k.totalBrushes >= 50 },
  { id: 'egg_hatcher', emoji: '🐣', check: (_k, c) => !!c.hatched },
  { id: 'weekly_hero', emoji: '🏆', check: (_k, c) => !!c.weeklyDone },
  { id: 'holiday_spirit', emoji: '🎉', check: (k) => k.owned.some((id) => !!ITEMS[id]?.season) },
  { id: 'birthday', emoji: '🎂', check: (k) => k.lastBirthdayYear !== null },
  { id: 'tooth_fairy', emoji: '🧚', check: (k) => k.teethLost >= 1 },
  { id: 'brave_dentist', emoji: '🦷', check: (k) => k.lastDentistAt !== null },
  { id: 'anniversary', emoji: '🥇', check: (k) => k.lastAnniversaryYear !== null },
  { id: 'shopper', emoji: '🛍️', check: (k) => k.owned.some((id) => !ITEMS[id]?.starter && ITEMS[id]?.price > 0) },
  {
    id: 'fashionista',
    emoji: '💃',
    check: (k) => k.equipped.hat !== 'hat.none' && k.equipped.glasses !== 'glasses.none' && k.equipped.necklace !== 'necklace.none',
  },
  { id: 'fire_master', emoji: '🌈', check: (k) => ownedIn(k, 'fire') >= 3 },
  { id: 'collector', emoji: '🐉', check: (k) => ownedIn(k, 'dragon') >= 3 },
  { id: 'level_5', emoji: '🪽', check: (k) => Object.values(k.dragonXp).some((xp) => dragonLevel(xp) >= 5) },
  { id: 'streak_30', emoji: '👑', check: (k) => k.bestStreak >= 30 },
  { id: 'hundred_brushes', emoji: '💯', check: (k) => k.totalBrushes >= 100 },
];

/** Returns ids of achievements newly earned with this state. */
export function newAchievements(k: KidStats, ctx: AchievementContext = {}): string[] {
  return ACHIEVEMENTS.filter((a) => !k.achievements.includes(a.id) && a.check(k, ctx)).map((a) => a.id);
}

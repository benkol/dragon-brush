// Weekly mini-challenges. Weeks run Sunday–Saturday. Every family sees the
// same challenge in a given week (picked from the week number), so two
// parents' phones always agree.
import { addDays, dayKey, daysBetween } from './dates';

export type ChallengeKind = 'evenings' | 'mornings' | 'fullDays' | 'steady' | 'total';

export interface Challenge {
  kind: ChallengeKind;
  goal: number;
  /** Bonus chest points when completed. */
  reward: number;
}

export const CHALLENGES: Challenge[] = [
  { kind: 'evenings', goal: 5, reward: 75 },
  { kind: 'steady', goal: 3, reward: 75 },
  { kind: 'mornings', goal: 5, reward: 75 },
  { kind: 'fullDays', goal: 4, reward: 100 },
  { kind: 'total', goal: 10, reward: 100 },
];

/** Hour from which a brush counts as an evening brush; before noon is morning. */
export const EVENING_FROM = 16;
export const MORNING_UNTIL = 12;

/** Local day key of the Sunday starting this week. */
export function weekKey(ms: number): string {
  return addDays(dayKey(ms), -new Date(ms).getDay());
}

const FIRST_SUNDAY = '2026-01-04';

export function challengeFor(week: string): Challenge {
  const n = Math.floor(daysBetween(FIRST_SUNDAY, week) / 7);
  return CHALLENGES[((n % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
}

export interface BrushFacts {
  hour: number;
  /** This brush was the day's second, completing the day. */
  completesDay: boolean;
  /** All four targets hit without wandering (app brushes only). */
  allSteady: boolean;
}

/** Does this counted brush move the challenge forward? */
export function advances(kind: ChallengeKind, f: BrushFacts): boolean {
  switch (kind) {
    case 'evenings':
      return f.hour >= EVENING_FROM;
    case 'mornings':
      return f.hour < MORNING_UNTIL;
    case 'fullDays':
      return f.completesDay;
    case 'steady':
      return f.allSteady;
    case 'total':
      return true;
  }
}

export interface WeekState {
  key: string;
  progress: number;
  done: boolean;
}

/** This week's challenge and the kid's progress on it, for display. */
export function weekStatus(week: WeekState | null | undefined, ms: number) {
  const key = weekKey(ms);
  const challenge = challengeFor(key);
  const current = week?.key === key ? week : null;
  return {
    challenge,
    progress: Math.min(challenge.goal, current?.progress ?? 0),
    done: current?.done ?? false,
    /** Days left including today. */
    daysLeft: 7 - new Date(ms).getDay(),
  };
}

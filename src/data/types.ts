import type { Difficulty } from '../game/difficulty';

export type Slot ='dragon' | 'hat' | 'glasses' | 'necklace' | 'fire' | 'food' | 'bg';

export type Equipped = Record<Slot, string>;

export interface KidStats {
  points: number;
  totalBrushes: number;
  /** Counted brushes (ones that earned points), at most 2 per day. */
  countedBrushes: number;
  streak: number;
  bestStreak: number;
  /** Local day key (YYYY-MM-DD) of the last day that reached 2 counted brushes. */
  lastFullDay: string | null;
  /** Local day key of the last counted brush and how many counted brushes it had. */
  lastBrushDay: string | null;
  brushesToday: number;
  /** Epoch ms of the last counted brush. */
  lastBrushAt: number | null;
  shields: number;
  /** Counted brushes per local day, last 14 days only. */
  dayLog: Record<string, number>;
  lastPerfectWeekDay: string | null;
  /** Full days collected toward hatching the current egg (hatches at 7). */
  eggProgress: number;
  dragonXp: Record<string, number>;
  achievements: string[];
  owned: string[];
  equipped: Equipped;
  /** This week's challenge progress (see rewards/challenges.ts). */
  week: { key: string; progress: number; done: boolean } | null;
  /** Year of the last birthday gift, so it's given once a year. */
  lastBirthdayYear: number | null;
  /** Day of the first counted brush, for the yearly brushing anniversary. */
  firstBrushDay: string | null;
  lastAnniversaryYear: number | null;
  teethLost: number;
  lastToothAt: number | null;
  lastDentistAt: number | null;
  /** A surprise to show the kid next time they open the app. */
  surprise: Surprise | null;
}

export interface Surprise {
  kind: 'toothFairy' | 'dentist';
  at: number;
  points: number;
  /** The tooth fairy brought wings (first lost tooth). */
  wings?: boolean;
}

/** 'game' = aiming with a grown-up, 'solo' = guided brushing by myself. */
export type BrushModes = 'both' | 'game' | 'solo';
export const BRUSH_MODES: BrushModes[] = ['both', 'game', 'solo'];

export interface Kid extends KidStats {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: number;
  difficulty: Difficulty;
  /** Which brushing modes the kid sees (missing = both). */
  brushModes?: BrushModes;
  /** Spoken instructions while brushing (missing = on). */
  voice?: boolean;
  /** YYYY-MM-DD; only month and day are used. */
  birthday: string | null;
}

export interface TargetResult {
  corner: string;
  /** How many times the fire left the target after it started burning. */
  leaves: number;
}

export interface SessionResult {
  startedAt: number;
  endedAt: number;
  completed: boolean;
  perTarget: TargetResult[];
  /** Logged by a parent for a brush done without the app. */
  manual?: boolean;
  /** Finished with "Play without the camera" (no aiming, no steady bonus). */
  noCamera?: boolean;
  /** Guided "brush by myself" mode (no aiming, no steady bonus). */
  solo?: boolean;
  /** The parent signed in when the brush was done or logged. */
  by?: { uid: string; name: string };
}

export interface Bonus {
  key: string;
  points: number;
  /** i18n interpolation values. */
  values?: Record<string, string | number>;
}

export interface SessionRecord extends SessionResult {
  counted: boolean;
  pointsAwarded: number;
  bonuses: Bonus[];
}

export interface Redemption {
  kidId: string;
  kidName: string;
  at: number;
  given: boolean;
}

export interface CustomReward {
  id: string;
  title: string;
  emoji: string;
  price: number;
  redemptions: Redemption[];
  createdAt: number;
}

/** Parents sharing the same kids, prizes and history. */
export interface Family {
  id: string;
  members: string[];
  memberNames: Record<string, string>;
}

export interface Invite {
  code: string;
  expiresAt: number;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string | null;
}

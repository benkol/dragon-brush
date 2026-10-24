import type { AppUser, CustomReward, Family, Invite, Kid, KidStats, SessionRecord } from './types';
import { newKidStats } from '../rewards/scoring';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from '../game/difficulty';
import type { ErrorReport } from '../errors';

export type Unsubscribe = () => void;

/** What a parent sets in the kid form. */
export interface KidProfile {
  name: string;
  avatarColor: string;
  birthday: string | null;
}

export interface KidUpdate<T> {
  stats: KidStats;
  result: T;
  session?: SessionRecord;
}

export interface Repo {
  mode: 'firebase' | 'demo';
  onAuth(cb: (user: AppUser | null) => void): Unsubscribe;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(name: string, email: string, password: string): Promise<void>;
  signInDemo(name: string): Promise<void>;
  signOut(): Promise<void>;

  /**
   * The family this parent belongs to, creating one (and moving any data
   * saved before families existed) on first sign-in.
   */
  resolveFamily(user: AppUser): Promise<string>;
  /** Calls back with null when the family can't be read (e.g. removed from it). */
  watchFamily(familyId: string, cb: (family: Family | null) => void): Unsubscribe;
  createInvite(familyId: string, user: AppUser): Promise<Invite>;
  /** Joins another parent's family. Throws JoinError. Returns the family id. */
  joinFamily(user: AppUser, code: string): Promise<string>;
  removeMember(familyId: string, uid: string): Promise<void>;

  // Everything below is scoped to a family id.
  watchKids(familyId: string, cb: (kids: Kid[]) => void): Unsubscribe;
  addKid(familyId: string, kid: KidProfile): Promise<string>;
  editKid(familyId: string, kidId: string, kid: KidProfile): Promise<void>;
  deleteKid(familyId: string, kidId: string): Promise<void>;
  setDifficulty(familyId: string, kidId: string, difficulty: Difficulty): Promise<void>;
  /**
   * Reads the latest kid, applies `fn` and writes the new stats (and an
   * optional session record) atomically, so two parents saving at once
   * don't overwrite each other. Offline, the write is queued and synced.
   */
  updateKid<T>(familyId: string, kidId: string, fn: (kid: Kid) => KidUpdate<T>): Promise<T>;
  /** A kid's brushing sessions that ended in [from, to), oldest first. */
  watchSessions(familyId: string, kidId: string, from: number, to: number, cb: (sessions: SessionRecord[]) => void): Unsubscribe;

  watchRewards(familyId: string, cb: (rewards: CustomReward[]) => void): Unsubscribe;
  addReward(familyId: string, r: { title: string; emoji: string; price: number }): Promise<void>;
  deleteReward(familyId: string, rewardId: string): Promise<void>;
  /** Deducts the price from the kid and records the redemption for the parent. */
  redeemReward(familyId: string, kid: Kid, reward: CustomReward): Promise<void>;
  markRewardGiven(familyId: string, reward: CustomReward, index: number): Promise<void>;

  /** Stores an error report for the developer (needs a signed-in parent). */
  reportError(report: ErrorReport): void;

  /** True when deleting the account needs the parent's password (email sign-in). */
  deleteNeedsPassword(): boolean;
  /**
   * Deletes the parent's account. If they are the family's only parent, all
   * family data goes too (kids, history, prizes); otherwise they just leave
   * and the kids stay with the other parent.
   */
  deleteAccount(familyId: string, password?: string): Promise<void>;
}

export type JoinErrorCode = 'invalid' | 'expired' | 'used' | 'already_member';

export class JoinError extends Error {
  constructor(public code: JoinErrorCode) {
    super(code);
  }
}

// Invite codes avoid look-alike characters (0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_TTL_MS = 24 * 3_600_000;

export function newInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

/** "abcd-efgh " → "ABCDEFGH". */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const formatInviteCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** Fills missing fields so older saved kids keep working as the model grows. */
export function normalizeKid(id: string, data: Partial<Kid>): Kid {
  const base = newKidStats();
  return {
    ...base,
    ...data,
    equipped: { ...base.equipped, ...(data.equipped ?? {}) },
    owned: Array.from(new Set([...base.owned, ...(data.owned ?? [])])),
    id,
    name: data.name ?? '?',
    avatarColor: data.avatarColor ?? '#ff6b5b',
    createdAt: data.createdAt ?? Date.now(),
    difficulty: DIFFICULTIES.includes(data.difficulty as Difficulty) ? (data.difficulty as Difficulty) : DEFAULT_DIFFICULTY,
    birthday: data.birthday ?? null,
  };
}

/** Strips id so a Kid can be stored as a document. */
export function kidDoc(k: Kid | (KidStats & { name: string; avatarColor: string; createdAt: number })) {
  const { id: _id, ...rest } = k as Kid;
  return rest;
}

export class NotEnoughPointsError extends Error {
  constructor() {
    super('not_enough');
  }
}

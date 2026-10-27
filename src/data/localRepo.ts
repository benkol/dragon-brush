// Demo-mode repo: everything lives in localStorage on this device. Used when
// no Firebase config is set, so the app can be tried without a backend.
import type { AppUser, CustomReward, Kid, SessionRecord } from './types';
import { kidDoc, normalizeKid, NotEnoughPointsError, type Repo } from './repo';
import { newKidStats } from '../rewards/scoring';
import { DEFAULT_DIFFICULTY } from '../game/difficulty';

const KEY = 'dragonbrush.demo.v1';

interface DemoDb {
  user: AppUser | null;
  kids: Record<string, Omit<Kid, 'id'>>;
  sessions: Record<string, unknown[]>;
  rewards: Record<string, Omit<CustomReward, 'id'>>;
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return { user: null, kids: {}, sessions: {}, rewards: {} };
}

let db = load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Private mode: keep in memory only.
  }
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  fn();
  return () => {
    listeners.delete(fn);
  };
}

const newId = () => Math.random().toString(36).slice(2, 10);

const kidsList = () =>
  Object.entries(db.kids)
    .map(([id, k]) => normalizeKid(id, k))
    .sort((a, b) => a.createdAt - b.createdAt);

export const localRepo: Repo = {
  mode: 'demo',

  onAuth(cb) {
    let last: string | undefined;
    return subscribe(() => {
      const key = JSON.stringify(db.user);
      if (key !== last) {
        last = key;
        cb(db.user);
      }
    });
  },
  async signInWithGoogle() {
    throw new Error('demo');
  },
  async signInWithEmail() {
    throw new Error('demo');
  },
  async signUpWithEmail() {
    throw new Error('demo');
  },
  async signInDemo(name) {
    db.user = { uid: 'demo', displayName: name || 'Parent', email: null };
    save();
  },
  async signOut() {
    db.user = null;
    save();
  },

  // Demo mode lives on one device, so there is one family and no sharing.
  async resolveFamily() {
    return 'demo';
  },
  watchFamily(_fid, cb) {
    return subscribe(() =>
      cb(db.user ? { id: 'demo', members: [db.user.uid], memberNames: { [db.user.uid]: db.user.displayName } } : null),
    );
  },
  async createInvite() {
    throw new Error('demo');
  },
  async joinFamily() {
    throw new Error('demo');
  },
  async removeMember() {
    throw new Error('demo');
  },

  watchKids(_uid, cb) {
    return subscribe(() => cb(kidsList()));
  },
  async addKid(_uid, profile) {
    const id = newId();
    db.kids[id] = { ...newKidStats(), ...profile, createdAt: Date.now(), difficulty: DEFAULT_DIFFICULTY };
    save();
    return id;
  },
  async editKid(_uid, kidId, profile) {
    Object.assign(db.kids[kidId], profile);
    save();
  },
  async setDifficulty(_uid, kidId, difficulty) {
    db.kids[kidId].difficulty = difficulty;
    save();
  },
  async setBrushModes(_uid, kidId, brushModes) {
    db.kids[kidId].brushModes = brushModes;
    save();
  },
  async setKidVoice(_uid, kidId, voice) {
    db.kids[kidId].voice = voice;
    save();
  },
  async deleteKid(_uid, kidId) {
    delete db.kids[kidId];
    delete db.sessions[kidId];
    save();
  },
  async updateKid(_uid, kidId, fn) {
    const kid = normalizeKid(kidId, db.kids[kidId]);
    const { stats, result, session } = fn(kid);
    db.kids[kidId] = kidDoc({ ...kid, ...stats });
    if (session) (db.sessions[kidId] ??= []).push(session);
    save();
    return result;
  },

  watchSessions(_uid, kidId, from, to, cb) {
    return subscribe(() =>
      cb(
        ((db.sessions[kidId] ?? []) as SessionRecord[])
          .filter((s) => s.endedAt >= from && s.endedAt < to)
          .sort((a, b) => a.endedAt - b.endedAt),
      ),
    );
  },

  watchRewards(_uid, cb) {
    return subscribe(() =>
      cb(
        Object.entries(db.rewards)
          .map(([id, r]) => ({ ...r, id }))
          .sort((a, b) => a.price - b.price),
      ),
    );
  },
  async addReward(_uid, r) {
    db.rewards[newId()] = { ...r, redemptions: [], createdAt: Date.now() };
    save();
  },
  async deleteReward(_uid, rewardId) {
    delete db.rewards[rewardId];
    save();
  },
  async redeemReward(_uid, kid, reward) {
    const k = db.kids[kid.id];
    if (k.points < reward.price) throw new NotEnoughPointsError();
    k.points -= reward.price;
    db.rewards[reward.id].redemptions.push({ kidId: kid.id, kidName: kid.name, at: Date.now(), given: false });
    save();
  },
  async markRewardGiven(_uid, reward, index) {
    db.rewards[reward.id].redemptions[index].given = true;
    save();
  },

  reportError(report) {
    // Demo mode has no backend; the error is already in the console.
    void report;
  },

  deleteNeedsPassword() {
    return false;
  },
  async deleteAccount() {
    db = { user: null, kids: {}, sessions: {}, rewards: {} };
    save();
  },
};

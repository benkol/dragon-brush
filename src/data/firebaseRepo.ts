import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebaseConfig, RECAPTCHA_SITE_KEY, USE_EMULATORS } from '../config';
import { INVITE_TTL_MS, JoinError, kidDoc, newInviteCode, normalizeKid, NotEnoughPointsError, type KidUpdate, type Repo } from './repo';
import type { AppUser, CustomReward, Family, Kid, SessionRecord } from './types';
import { newKidStats } from '../rewards/scoring';
import { DEFAULT_DIFFICULTY } from '../game/difficulty';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
} else if (RECAPTCHA_SITE_KEY) {
  // App Check: proves requests come from this app, so the database can
  // refuse anything else once enforcement is on (Firebase console).
  // On localhost a debug token is printed in the console instead; add it
  // under App Check → Manage debug tokens to use the real project locally.
  if (location.hostname === 'localhost') (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  // reCAPTCHA Enterprise: classic reCAPTCHA v3 is deprecated for App Check.
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
}

const familyRef = (fid: string) => doc(db, 'families', fid);
const kidsCol = (fid: string) => collection(db, 'families', fid, 'kids');
const kidRef = (fid: string, kidId: string) => doc(db, 'families', fid, 'kids', kidId);
const sessionsCol = (fid: string, kidId: string) => collection(db, 'families', fid, 'kids', kidId, 'sessions');
const rewardsCol = (fid: string) => collection(db, 'families', fid, 'customRewards');
const userRef = (uid: string) => doc(db, 'users', uid);

/**
 * Commits a batch without waiting for the server when offline: the write is
 * applied to the local cache right away and synced later.
 */
async function commitSoon(batch: ReturnType<typeof writeBatch>) {
  const p = batch.commit();
  p.catch((e) => console.error('[firestore] commit failed', e));
  await Promise.race([p, new Promise((r) => setTimeout(r, 1500))]);
}

const code = (e: unknown) => (e as { code?: string }).code;

/** The family's data if this parent may read it, else null (missing or not a member). */
async function readFamily(fid: string, uid: string): Promise<Family | null> {
  try {
    const snap = await getDoc(familyRef(fid));
    const data = snap.data();
    if (!data || !(data.members as string[]).includes(uid)) return null;
    return { id: fid, members: data.members, memberNames: data.memberNames ?? {} };
  } catch (e) {
    if (code(e) === 'permission-denied') return null;
    throw e;
  }
}

/** Creates a family with this parent as its only member. Prefers the id `uid`. */
async function createFamily(user: AppUser): Promise<string> {
  const data = { members: [user.uid], memberNames: { [user.uid]: user.displayName }, createdAt: Date.now() };
  try {
    await setDoc(familyRef(user.uid), data);
    return user.uid;
  } catch (e) {
    // families/{uid} exists but this parent was removed from it.
    if (code(e) !== 'permission-denied') throw e;
    const ref = doc(collection(db, 'families'));
    await setDoc(ref, data);
    return ref.id;
  }
}

/** Copies kids (with history) and prizes saved before families existed. */
async function migrateLegacy(uid: string, fid: string) {
  const [kids, rewards] = await Promise.all([
    getDocs(collection(db, 'parents', uid, 'kids')),
    getDocs(collection(db, 'parents', uid, 'customRewards')),
  ]);
  const writes: [ReturnType<typeof doc>, object][] = [];
  for (const k of kids.docs) {
    writes.push([kidRef(fid, k.id), k.data()]);
    const sessions = await getDocs(collection(db, 'parents', uid, 'kids', k.id, 'sessions'));
    sessions.docs.forEach((s) => writes.push([doc(sessionsCol(fid, k.id), s.id), s.data()]));
  }
  rewards.docs.forEach((r) => writes.push([doc(rewardsCol(fid), r.id), r.data()]));
  // Batches are limited to 500 writes. set() is idempotent, so a retry after
  // an interrupted copy is safe.
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    writes.slice(i, i + 400).forEach(([ref, data]) => batch.set(ref, data));
    await batch.commit();
  }
}

export const firebaseRepo: Repo = {
  mode: 'firebase',

  onAuth(cb) {
    return onAuthStateChanged(auth, (u) => {
      cb(u ? { uid: u.uid, displayName: u.displayName ?? u.email ?? '', email: u.email } : null);
    });
  },
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      // Popups are often blocked in home-screen apps; fall back to a redirect.
      if (code(e) === 'auth/popup-blocked' || code(e) === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
      } else throw e;
    }
  },
  async signInWithEmail(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  },
  async signUpWithEmail(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
  },
  async signInDemo() {
    throw new Error('Demo mode is off');
  },
  async signOut() {
    await signOut(auth);
  },

  async resolveFamily(user) {
    const userSnap = await getDoc(userRef(user.uid));
    const saved = userSnap.data() as { familyId?: string; migrated?: boolean } | undefined;
    if (saved?.familyId && (await readFamily(saved.familyId, user.uid))) return saved.familyId;

    // No family yet, or removed from the one we had: use our own (or a new one).
    const own = await readFamily(user.uid, user.uid);
    const fid = own ? own.id : await createFamily(user);
    if (!saved?.migrated) await migrateLegacy(user.uid, fid);
    await setDoc(userRef(user.uid), { familyId: fid, migrated: true, displayName: user.displayName }, { merge: true });
    return fid;
  },
  watchFamily(fid, cb) {
    return onSnapshot(
      familyRef(fid),
      (snap) => {
        const d = snap.data();
        cb(d ? { id: fid, members: d.members, memberNames: d.memberNames ?? {} } : null);
      },
      () => cb(null),
    );
  },
  async createInvite(fid, user) {
    const expiresAt = Date.now() + INVITE_TTL_MS;
    const invite = {
      familyId: fid,
      createdBy: user.uid,
      createdByName: user.displayName,
      used: false,
      expiresAt: Timestamp.fromMillis(expiresAt),
    };
    // A clash among 31^8 codes is very unlikely; retry once just in case.
    for (let attempt = 0; ; attempt++) {
      const c = newInviteCode();
      try {
        await setDoc(doc(db, 'invites', c), invite);
        return { code: c, expiresAt };
      } catch (e) {
        if (attempt > 0) throw e;
      }
    }
  },
  async joinFamily(user, inviteCode) {
    const snap = await getDoc(doc(db, 'invites', inviteCode));
    const inv = snap.data();
    if (!inv) throw new JoinError('invalid');
    if (inv.used) throw new JoinError('used');
    if ((inv.expiresAt as Timestamp).toMillis() < Date.now()) throw new JoinError('expired');
    if (await readFamily(inv.familyId, user.uid)) throw new JoinError('already_member');

    const batch = writeBatch(db);
    batch.update(familyRef(inv.familyId), {
      members: arrayUnion(user.uid),
      [`memberNames.${user.uid}`]: user.displayName,
      joinCode: inviteCode,
    });
    batch.update(doc(db, 'invites', inviteCode), { used: true, usedBy: user.uid });
    batch.set(userRef(user.uid), { familyId: inv.familyId, migrated: true }, { merge: true });
    // Joining needs the server to check the code, so wait for it.
    await batch.commit();
    return inv.familyId;
  },
  async removeMember(fid, uid) {
    await updateDoc(familyRef(fid), { members: arrayRemove(uid), [`memberNames.${uid}`]: deleteField() });
  },

  watchKids(fid, cb) {
    return onSnapshot(query(kidsCol(fid), orderBy('createdAt')), (snap) =>
      cb(snap.docs.map((d) => normalizeKid(d.id, d.data() as Partial<Kid>))),
    );
  },
  async addKid(fid, profile) {
    const ref = doc(kidsCol(fid));
    const batch = writeBatch(db);
    batch.set(ref, { ...newKidStats(), ...profile, createdAt: Date.now(), difficulty: DEFAULT_DIFFICULTY });
    await commitSoon(batch);
    return ref.id;
  },
  async editKid(fid, kidId, profile) {
    await updateDoc(kidRef(fid, kidId), { ...profile });
  },
  async setDifficulty(fid, kidId, difficulty) {
    const batch = writeBatch(db);
    batch.update(kidRef(fid, kidId), { difficulty });
    await commitSoon(batch);
  },
  async setBrushModes(fid, kidId, brushModes) {
    const batch = writeBatch(db);
    batch.update(kidRef(fid, kidId), { brushModes });
    await commitSoon(batch);
  },
  async deleteKid(fid, kidId) {
    await deleteKidData(fid, kidId);
  },
  async updateKid<T>(fid: string, kidId: string, fn: (kid: Kid) => KidUpdate<T>): Promise<T> {
    const ref = kidRef(fid, kidId);
    const write = (kid: Kid, u: KidUpdate<T>, set: (r: ReturnType<typeof doc>, d: object) => void) => {
      set(ref, kidDoc({ ...kid, ...u.stats }));
      if (u.session) set(doc(sessionsCol(fid, kidId)), u.session);
    };

    if (navigator.onLine) {
      try {
        // A transaction re-reads and retries if the other parent saved in between.
        return await runTransaction(db, async (tx) => {
          const kid = normalizeKid(kidId, (await tx.get(ref)).data() as Partial<Kid>);
          const u = fn(kid);
          write(kid, u, (r, d) => tx.set(r, d));
          return u.result;
        });
      } catch (e) {
        if (code(e) !== 'unavailable') throw e;
      }
    }
    // Offline: apply on top of the cached copy and sync later, so a brush is never lost.
    const kid = normalizeKid(kidId, (await getDoc(ref)).data() as Partial<Kid>);
    const u = fn(kid);
    const batch = writeBatch(db);
    write(kid, u, (r, d) => batch.set(r, d));
    await commitSoon(batch);
    return u.result;
  },

  watchSessions(fid, kidId, from, to, cb) {
    const q = query(sessionsCol(fid, kidId), where('endedAt', '>=', from), where('endedAt', '<', to), orderBy('endedAt'));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as SessionRecord)));
  },

  watchRewards(fid, cb) {
    return onSnapshot(query(rewardsCol(fid), orderBy('price')), (snap) =>
      cb(snap.docs.map((d) => ({ ...(d.data() as Omit<CustomReward, 'id'>), id: d.id }))),
    );
  },
  async addReward(fid, r) {
    await setDoc(doc(rewardsCol(fid)), { ...r, redemptions: [], createdAt: Date.now() });
  },
  async deleteReward(fid, rewardId) {
    await deleteDoc(doc(rewardsCol(fid), rewardId));
  },
  async redeemReward(fid, kid, reward) {
    await runTransaction(db, async (tx) => {
      const points = ((await tx.get(kidRef(fid, kid.id))).data()?.points as number) ?? 0;
      if (points < reward.price) throw new NotEnoughPointsError();
      tx.update(kidRef(fid, kid.id), { points: points - reward.price });
      tx.update(doc(rewardsCol(fid), reward.id), {
        redemptions: arrayUnion({ kidId: kid.id, kidName: kid.name, at: Date.now(), given: false }),
      });
    });
  },
  async markRewardGiven(fid, reward, index) {
    const redemptions = reward.redemptions.map((r, i) => (i === index ? { ...r, given: true } : r));
    await updateDoc(doc(rewardsCol(fid), reward.id), { redemptions });
  },

  reportError(report) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    // Fire and forget: queued while offline, never blocks the app. Firestore
    // deletes reports after `expireAt` (TTL policy, see README).
    const expireAt = Timestamp.fromMillis(Date.now() + ERROR_TTL_MS);
    addDoc(collection(db, 'errors'), { ...report, uid, expireAt }).catch(() => {});
  },

  deleteNeedsPassword() {
    return auth.currentUser?.providerData.some((p) => p.providerId === 'password') ?? false;
  },
  async deleteAccount(fid, password) {
    const user = auth.currentUser;
    if (!user) throw new Error('not signed in');
    // Firebase only deletes accounts that signed in recently, so confirm first.
    if (password) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, password));
    else await reauthenticateWithPopup(user, new GoogleAuthProvider());

    const family = await readFamily(fid, user.uid);
    if (family && family.members.length > 1) {
      // Others still use this family: just leave it.
      await updateDoc(familyRef(fid), { members: arrayRemove(user.uid), [`memberNames.${user.uid}`]: deleteField() });
    } else if (family) {
      const kids = await getDocs(kidsCol(fid));
      for (const k of kids.docs) await deleteKidData(fid, k.id);
      await deleteAll((await getDocs(rewardsCol(fid))).docs.map((d) => d.ref));
      await deleteDoc(familyRef(fid));
    }
    // Pre-family data, if any is left.
    const legacyKids = await getDocs(collection(db, 'parents', user.uid, 'kids'));
    for (const k of legacyKids.docs) {
      await deleteAll((await getDocs(collection(k.ref, 'sessions'))).docs.map((d) => d.ref));
      await deleteDoc(k.ref);
    }
    await deleteAll((await getDocs(collection(db, 'parents', user.uid, 'customRewards'))).docs.map((d) => d.ref));
    await deleteDoc(doc(db, 'parents', user.uid));
    await deleteDoc(userRef(user.uid));
    await deleteUser(user);
  },
};

/** Error reports are kept this long. */
const ERROR_TTL_MS = 90 * 86_400_000;

async function deleteAll(refs: ReturnType<typeof doc>[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

/** A kid and their whole brushing history. */
async function deleteKidData(fid: string, kidId: string) {
  await deleteAll((await getDocs(sessionsCol(fid, kidId))).docs.map((d) => d.ref));
  await deleteDoc(kidRef(fid, kidId));
}

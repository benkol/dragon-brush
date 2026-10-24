// Security rules tests. Run against the emulator: `npm run test:rules`.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';

let env: RulesTestEnvironment;
const A = 'parentA';
const B = 'parentB';
const C = 'parentC';
const FID = A;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const hours = (h: number) => Timestamp.fromMillis(Date.now() + h * 3_600_000);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-dragon-brush',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // Parent A's family with one kid, created through the rules.
  const a = as(A);
  await assertSucceeds(setDoc(doc(a, 'families', FID), { members: [A], memberNames: { [A]: 'Alice' } }));
  await assertSucceeds(setDoc(doc(a, 'families', FID, 'kids', 'noa'), { name: 'Noa', points: 10 }));
});

async function inviteFor(fid: string, code: string, extra: object = {}) {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'invites', code), { familyId: fid, createdBy: A, used: false, expiresAt: hours(24), ...extra }),
  );
}

/** The batch the app sends to join a family. */
function joinBatch(uid: string, code: string, fid = FID, members = arrayUnion(uid)) {
  const db = as(uid);
  const batch = writeBatch(db);
  batch.update(doc(db, 'families', fid), { members, [`memberNames.${uid}`]: 'Bob', joinCode: code });
  batch.update(doc(db, 'invites', code), { used: true, usedBy: uid });
  batch.set(doc(db, 'users', uid), { familyId: fid, migrated: true }, { merge: true });
  return batch.commit();
}

describe('families', () => {
  it('members can read and write their kids', async () => {
    await assertSucceeds(getDoc(doc(as(A), 'families', FID, 'kids', 'noa')));
    await assertSucceeds(updateDoc(doc(as(A), 'families', FID, 'kids', 'noa'), { points: 20 }));
  });

  it('outsiders cannot read or write the family or its kids', async () => {
    const b = as(B);
    await assertFails(getDoc(doc(b, 'families', FID)));
    await assertFails(getDoc(doc(b, 'families', FID, 'kids', 'noa')));
    await assertFails(getDocs(collection(b, 'families', FID, 'kids')));
    await assertFails(setDoc(doc(b, 'families', FID, 'kids', 'evil'), { name: 'x' }));
    await assertFails(updateDoc(doc(b, 'families', FID), { members: arrayUnion(B) }));
  });

  it('signed-out users get nothing', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'families', FID)));
    await assertFails(getDoc(doc(anon, 'families', FID, 'kids', 'noa')));
  });

  it('a new family must have only its creator as member', async () => {
    await assertSucceeds(setDoc(doc(as(B), 'families', B), { members: [B], memberNames: {} }));
    await assertFails(setDoc(doc(as(C), 'families', 'x'), { members: [C, A], memberNames: {} }));
    await assertFails(setDoc(doc(as(C), 'families', 'y'), { members: [A], memberNames: {} }));
  });

  it('cannot take over an existing family by "creating" it', async () => {
    await assertFails(setDoc(doc(as(B), 'families', FID), { members: [B], memberNames: {} }));
  });

  it('members cannot leave the family with no members', async () => {
    await assertFails(updateDoc(doc(as(A), 'families', FID), { members: [] }));
  });

  it('a member can remove another member, who then loses access', async () => {
    await inviteFor(FID, 'CODE0001');
    await assertSucceeds(joinBatch(B, 'CODE0001'));
    await assertSucceeds(updateDoc(doc(as(A), 'families', FID), { members: arrayRemove(B) }));
    await assertFails(getDoc(doc(as(B), 'families', FID, 'kids', 'noa')));
  });
});

describe('invites', () => {
  it('a valid code lets a parent join and then share the kids', async () => {
    await inviteFor(FID, 'CODE0001');
    await assertSucceeds(getDoc(doc(as(B), 'invites', 'CODE0001')));
    await assertSucceeds(joinBatch(B, 'CODE0001'));
    await assertSucceeds(getDoc(doc(as(B), 'families', FID, 'kids', 'noa')));
    await assertSucceeds(updateDoc(doc(as(B), 'families', FID, 'kids', 'noa'), { points: 30 }));
  });

  it('a code works only once', async () => {
    await inviteFor(FID, 'CODE0001');
    await assertSucceeds(joinBatch(B, 'CODE0001'));
    await assertFails(joinBatch(C, 'CODE0001'));
  });

  it('expired codes are rejected', async () => {
    await inviteFor(FID, 'CODE0002', { expiresAt: hours(-1) });
    await assertFails(joinBatch(B, 'CODE0002'));
  });

  it('a code for another family does not open this one', async () => {
    await assertSucceeds(setDoc(doc(as(C), 'families', C), { members: [C], memberNames: {} }));
    await inviteFor(C, 'CODE0003');
    await assertFails(joinBatch(B, 'CODE0003', FID));
  });

  it('joining without marking the code used is rejected', async () => {
    await inviteFor(FID, 'CODE0004');
    const db = as(B);
    await assertFails(updateDoc(doc(db, 'families', FID), { members: arrayUnion(B), joinCode: 'CODE0004' }));
  });

  it('a joiner can only add themselves', async () => {
    await inviteFor(FID, 'CODE0005');
    await assertFails(joinBatch(B, 'CODE0005', FID, arrayUnion(B, C)));
  });

  it('a joiner cannot remove existing members', async () => {
    await inviteFor(FID, 'CODE0006');
    await assertFails(joinBatch(B, 'CODE0006', FID, [B] as unknown as ReturnType<typeof arrayUnion>));
  });

  it('only members can create invites for their family', async () => {
    const valid = { familyId: FID, used: false, expiresAt: hours(24) };
    await assertSucceeds(setDoc(doc(as(A), 'invites', 'NEW00001'), { ...valid, createdBy: A }));
    await assertFails(setDoc(doc(as(B), 'invites', 'NEW00002'), { ...valid, createdBy: B }));
  });

  it('invites cannot be pre-used or last more than 2 days', async () => {
    await assertFails(setDoc(doc(as(A), 'invites', 'NEW00003'), { familyId: FID, createdBy: A, used: true, expiresAt: hours(24) }));
    await assertFails(setDoc(doc(as(A), 'invites', 'NEW00004'), { familyId: FID, createdBy: A, used: false, expiresAt: hours(24 * 30) }));
  });

  it('nobody can list invite codes', async () => {
    await inviteFor(FID, 'CODE0007');
    await assertFails(getDocs(collection(as(B), 'invites')));
    await assertFails(getDocs(collection(as(A), 'invites')));
  });
});

describe('error reports', () => {
  const report = (uid: string, extra: object = {}) => ({
    message: 'Error: boom',
    stack: 'at x',
    where: 'render',
    url: '/',
    ua: 'TestPhone',
    version: '2026-10-24T10:00',
    lang: 'en',
    at: 1,
    uid,
    expireAt: Timestamp.fromMillis(Date.now() + 90 * 86_400_000),
    ...extra,
  });

  it('signed-in parents can add a well-formed report about themselves', async () => {
    await assertSucceeds(addDoc(collection(as(A), 'errors'), report(A)));
  });

  it('reports are write-only, signed-in only, and cannot pretend to be someone else', async () => {
    await assertFails(getDocs(collection(as(A), 'errors')));
    await assertFails(addDoc(collection(env.unauthenticatedContext().firestore(), 'errors'), report(A)));
    await assertFails(addDoc(collection(as(A), 'errors'), report(B)));
  });

  it('rejects extra fields and oversized reports', async () => {
    await assertFails(addDoc(collection(as(A), 'errors'), report(A, { kids: ['Noa'] })));
    await assertFails(addDoc(collection(as(A), 'errors'), report(A, { stack: 'x'.repeat(5000) })));
  });

  it('reports must expire within about 90 days', async () => {
    await assertFails(addDoc(collection(as(A), 'errors'), report(A, { expireAt: Timestamp.fromMillis(Date.now() + 400 * 86_400_000) })));
    const { expireAt: _drop, ...noExpiry } = report(A);
    await assertFails(addDoc(collection(as(A), 'errors'), noExpiry));
  });
});

describe('deleting an account', () => {
  it('the only parent can delete the family; nobody else can', async () => {
    await assertFails(deleteDoc(doc(as(B), 'families', FID)));
    await assertSucceeds(deleteDoc(doc(as(A), 'families', FID, 'kids', 'noa')));
    await assertSucceeds(deleteDoc(doc(as(A), 'families', FID)));
  });

  it('a family shared with another parent cannot be deleted', async () => {
    await inviteFor(FID, 'CODE0009');
    await assertSucceeds(joinBatch(B, 'CODE0009'));
    await assertFails(deleteDoc(doc(as(A), 'families', FID)));
  });
});

describe('users and legacy data', () => {
  it('a parent can only read and write their own user doc', async () => {
    await assertSucceeds(setDoc(doc(as(A), 'users', A), { familyId: FID }));
    await assertFails(getDoc(doc(as(B), 'users', A)));
    await assertFails(setDoc(doc(as(B), 'users', A), { familyId: B }));
  });

  it('pre-family data stays private to its parent', async () => {
    await assertSucceeds(setDoc(doc(as(A), 'parents', A, 'kids', 'old'), { name: 'Old' }));
    await assertFails(getDoc(doc(as(B), 'parents', A, 'kids', 'old')));
  });
});

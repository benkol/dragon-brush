// Seeds the local emulators: parent A with pre-family (legacy) data, and parent B.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const signUp = async (email, password, displayName) => {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
  });
  const j = await r.json();
  // Set the display name too (signUp ignores it).
  await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: j.idToken, displayName }),
  });
  return j.localId;
};

const PASSWORD = 'Test-Dragon-4821';
const a = await signUp('parent.a@test.dev', PASSWORD, 'Alice');
const b = await signUp('parent.b@test.dev', PASSWORD, 'Bob');

const env = await initializeTestEnvironment({ projectId: 'demo-dragon-brush', firestore: { host: '127.0.0.1', port: 8085 } });
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'parents', a, 'kids', 'noa'), { name: 'Noa', avatarColor: '#4fc3ff', points: 120, streak: 3, bestStreak: 3, createdAt: 1 });
  await setDoc(doc(db, 'parents', a, 'kids', 'noa', 'sessions', 's1'), { completed: true, pointsAwarded: 18, endedAt: 1 });
  await setDoc(doc(db, 'parents', a, 'customRewards', 'r1'), { title: 'Ice cream', emoji: '🍦', price: 200, redemptions: [], createdAt: 1 });
});
await env.cleanup();
console.log(JSON.stringify({ a, b }));

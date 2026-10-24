# Dragon Brush 🐲🪥

A mobile web game that makes toothbrushing fun. The front camera tracks the kid's head, and a cute 3D dragon mirrors it. When the kid opens wide, the dragon breathes fire. The kid aims the fire at a marshmallow in each corner (top-right → top-left → bottom-left → bottom-right), 30 seconds each, for a full 2-minute brush. Tilting toward each corner with the mouth open helps the parent reach every area.

Points, streaks, stickers, a hatching dragon egg, level-ups and real-life prizes keep kids coming back.

## Run it

```bash
npm install
npm run dev
```

Without a Firebase config, the app runs in **demo mode**, which saves progress on the device only.

**Try it on a computer (no camera):** open `/kid/<id>/brush?debug=1&round=5`. Move the mouse to aim, and hold the space bar or the mouse button to open the mouth. Press F to simulate losing the face. `round=5` makes each target 5 seconds.

**Try it on a phone:** run `npm run dev:phone`. The phone must be on the same Wi-Fi. Open the `https://<your-computer-ip>:5173` URL it prints and accept the self-signed certificate warning. Camera access needs HTTPS.

## Firebase setup (login + cloud saving)

1. Create a project at <https://console.firebase.google.com>.
2. Go to **Build → Authentication → Sign-in method** and enable **Google** and **Email/Password**.
3. Go to **Build → Firestore Database** and create a database in production mode.
4. Go to **Project settings → Your apps** and add a **Web app**. Copy its config into `.env.local`, using `.env.example` as the template.
5. Deploy the security rules and hosting:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   npm run deploy
   ```
6. Add your hosting domain under **Authentication → Settings → Authorized domains** if it isn't there already.

Local emulators: run `firebase emulators:start`, then set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local`.

## How points work

| Event | Points |
|---|---|
| Finished brush (max 2 per day, ≥ 6 h apart) | 10 |
| Each target hit without wandering off more than 3 times | +2 |
| Second brush of the day | +5 |
| Streak multiplier (a day counts with 2 brushes) | ×1.5 at 3+ days, ×2 at 7+ |
| Streak treasure chests at 3 / 7 / 14 / 30 / 100 days | 25 / 60 / 120 / 250 / 1000 |
| Perfect week (14/14) | +100 |

Other rewards:
- A **shield** (bought in the shop, or free at 14 days) saves the streak after one missed day.
- Every 7 full days **hatches an egg** into a surprise baby dragon.
- A 30-day streak unlocks the **Golden Dragon**.
- Dragons **level up** as the kid brushes and grow **wings** at level 5.

Spend points on hats, glasses, necklaces, fire colors, foods to grill, backgrounds and dragons. Parents can also create **real-life prizes** (for example "Ice cream trip") that kids buy with points. Redeemed prizes show up in the Grown-ups screen.

## Code map

- `src/game/gameMachine.ts`: pure brushing state machine (countdown, rounds, pause-while-not-hitting, eating, celebration)
- `src/game/aim.ts`: head pose → aim point, corner targets, hit test, mouth hysteresis
- `src/game/faceTracker.ts`: MediaPipe Face Landmarker (head pose from landmarks, `jawOpen` blendshape, One-Euro smoothing) plus the debug input
- `src/game/runner.ts`: frame loop gluing face input, game state, 3D scene, audio and HUD
- `src/game/scene/`: procedural Three.js dragons, accessories, foods, fire particles and preview renders
- `src/game/audio.ts`: synthesized sound effects (Web Audio, no files)
- `src/rewards/scoring.ts`: points, streaks, shields, eggs, levels and purchases (pure, unit-tested)
- `src/data/`: `Repo` interface with Firestore and demo (localStorage) implementations

Run the tests with `npm test`. Security-rule tests need Java and the emulator: `npm run test:rules`.

## App Check (protects the database)

App Check makes Firestore accept requests only from this app, using reCAPTCHA v3 invisibly.

1. Create a **reCAPTCHA v3** key at <https://www.google.com/recaptcha/admin/create>. Add the domains `dragon-brush.web.app`, `dragon-brush.firebaseapp.com` and `localhost`.
2. Firebase console → **App Check** → **Apps** → your web app → **reCAPTCHA** → paste the **secret key** and save.
3. Put the **site key** in `.env.local` as `VITE_RECAPTCHA_SITE_KEY=…`, then run `npm run deploy`.
4. Wait a day or two and watch **App Check → APIs → Cloud Firestore**. Most requests should be "verified". Phones running an older version of the app show as unverified until they update.
5. Click **Enforce** for Cloud Firestore. From then on, requests without App Check are refused.

On `localhost` against the real project, the browser console prints an App Check **debug token**. Add it under App Check → **Manage debug tokens**, or local testing will be refused once enforcement is on.

## Error reports

Crashes are saved to the `errors` collection (Firestore). The app can only write reports, not read them. Read them in the Firebase console.

Each report has an `expireAt` date, 90 days out. To have Firestore delete old reports automatically, add a TTL policy once: Firebase console → **Firestore → TTL** (in the Google Cloud console) → **Create policy** → collection group `errors`, timestamp field `expireAt`.

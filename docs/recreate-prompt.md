Build "Dragon Brush", a mobile-first web game that makes kids (3-8) brush their teeth for 2 minutes. Cute, colorful, rounded UI. English + Hebrew (full RTL), language toggle. On a desktop, show a "Best on a phone" notice once per visit.

GAME (parent brushes the kid's teeth, phone held facing the kid)
- Front camera + on-device face tracking (e.g. MediaPipe Face Landmarker). The video never leaves the phone.
- A cute 3D cartoon dragon head (Three.js, toon shading) mirrors the kid's head: turn, tilt, nod, and opening the mouth. Mouth open = the dragon breathes fire (particles); the fire goes where the kid's head points.
- Start: "look straight at me" (calibrates neutral pose), then a 3-2-1 countdown.
- A marshmallow on a stick appears in each corner in turn: top-right, top-left, bottom-left, bottom-right. Each needs 30 s of fire on it (2 min total). Its timer runs only while the fire is on it (short slips forgiven), with a ring timer. It slowly chars, then the dragon eats it (chomp, cheer).
- End: celebration (dragon dance, confetti, fanfare), then a summary with points.
- Per-kid difficulty: Easy/Medium/Hard changes how far the head must turn, how wide to open the mouth, target size and forgiveness. Easy shows a marker where the fire will land.
- If the kid tilts the head sideways for a moment: a "Head straight!" hint.
- No face for 4 s: "hold the phone further away"; after 20 s offer "play without the camera" (the dragon aims by itself; still counts).

BRUSH BY MYSELF (kid alone, phone on a stand)
- No aiming; the camera only checks the kid is there (the timer pauses if they leave for 3+ s).
- A guided 2 minutes: 4 zones (same order) × 3 steps of 10 s: outside (cheek side), inside (tongue side), chewing tops. Front-teeth tip: hold the brush upright. Then 10 s of tongue, then "Spit, don't rinse!".
- A panel under the dragon (never covering it): a mouth map drawn as a mirror where unbrushed teeth have stains, the current zone is white with a blue outline + sparkles and its stains fade, and brushed teeth are clean white. Plus a side-view tooth showing which surface, a 10 s ring, and the zone name.
- The dragon holds a toothbrush and brushes the same zone in small circles. Its fangs start stained, get whiter, and sparkle at the end.

VOICE
- Friendly spoken lines for every step (countdown, directions, cheers, hints), in the app language. On/off per kid, plus a speaker button in game.

REWARDS
- Points per completed brush (max 2 counted per day, a gap between them), a steady-aim bonus, and a bonus for the second brush of the day.
- Streak of days with 2 brushes, and streak shields that save one missed day.
- Dragon egg: hatches a new dragon after N full days. Dragons level up with XP (wings at a high level).
- Shop: hats, glasses, necklaces, fire colors, foods (broccoli = funny "yuck"), backgrounds, new dragons.
- Sticker album of achievements (first brush, early bird, 7-day streak...). Weekly mini-challenge.
- Holidays/seasons (Hanukkah, Purim, Halloween...): costumes, greetings, double points. Birthday-week gift. Tooth-fairy and brave-dentist moments.
- Real-life prizes set by parents (e.g. "ice cream = 200 points"); kids redeem them and parents mark them given.

PARENTS
- Sign in (Google or email). Families: two parents share the same kids via an invite code; data syncs (cloud database, works offline).
- Pick a kid, then the kid's home: dragon, streak, today's brushes, egg progress, challenge, "Brush with a grown-up" / "Brush by myself", Shop, Dress up, Stickers, Prizes.
- Grown-ups screen in tabs:
  - Account: privacy note, delete account
  - Kids: card per kid with difficulty, brushing modes allowed (both / grown-up / myself), voice on/off, "log a brush done without the app", and a history calendar
  - Family: invites
  - Prizes
  - How points work

Make it delightful, bouncy and kid-proof: big buttons, little text, sound effects.

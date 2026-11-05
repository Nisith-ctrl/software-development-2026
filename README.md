# LifeSync

A web app that helps learners on the autism spectrum practise real-life routines in a digital copy of
their own world. Caregivers and educators build routines from photos and videos of the learner's real
places, the learner taps through them with errorless prompting, a heart-rate wearable can pause the
routine for a calm-down break, and the teaching team gets progress data for IEP meetings.

See [PLAN.md](PLAN.md) for the build plan and roadmap.

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app starts with demo data: two learners (Sam and Maya), three
routines and two weeks of Sam's practice history, so the dashboard has something to show.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (adaptive prompting rules) |
| `npm run build` | Type check and production build into `dist/` |

## Try the main features

1. **Grown-ups → Wearable → Use simulator** to fake a heart-rate feed (or connect a Bluetooth
   heart-rate strap in Chrome or Edge).
2. Go back to the start screen, tap **Sam**, then **Pay at the grocery store**.
3. Tap a choice other than the right one: it fades and the right one gets an outline. No error
   message, which is how errorless learning works.
4. Open the **♥** button in the bottom-left corner and press **Spike**. After a few seconds above
   the threshold, the routine pauses and the calm screen opens.
5. Finish the routine, then open **Grown-ups → Progress data** to see the session, the calm break,
   sticking points and the help level for each step. **Export CSV** gives one row per step attempt.
6. **Grown-ups → Routines** to edit a routine and add your own photos or videos to each step.

## How it works

- **Storage**: everything lives in the browser's IndexedDB (`src/lib/db.ts`), including uploaded
  media. There is no server yet, so data stays on the device. Use **Overview → Download backup**
  to move it.
- **Prompt levels**: Full (only the right choice can be tapped) → Highlight → Delayed (hint after
  5 s) → Independent. `src/lib/adaptive.ts` fades help after two clean completions and adds help
  back after repeated redirects or a calm break.
- **Heart rate**: `src/lib/heartRate.tsx` reads the standard Bluetooth Heart Rate profile or runs
  a simulator. Each learner has their own threshold, hold time and minimum break length.

## Project layout

```
src/
  lib/          data model, storage, adaptive rules, audio, heart rate, export
  components/   calm-down screen, rewards, media, chart, hold-to-exit button
  pages/        learner screens (Home, LearnerHome, Player)
  pages/admin/  grown-up screens (routines, learners, dashboard, wearable)
```

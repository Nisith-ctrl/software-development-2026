# LifeSync build plan

LifeSync helps learners on the autism spectrum practise real routines inside a digital copy of their
own world, with errorless prompting, calming tools that respond to heart rate, and data for the IEP
team. This plan covers the first working version (v0.1). Deployment is out of scope for now.

## Stack

| Part | Choice | Why |
| --- | --- | --- |
| UI | React 18 + TypeScript, built with Vite | Fast dev loop, typed data model |
| Routing | React Router | Separate learner and grown-up areas |
| Storage | IndexedDB in the browser | Works offline, holds photos and videos as blobs, no server needed yet |
| Sound | Web Audio API | Chimes and calming music without shipping audio files |
| Wearable | Web Bluetooth Heart Rate profile + a simulator | Real straps/watches that broadcast HR, and a simulator for demos |
| Tests | Vitest | Unit tests for the adaptive prompting rules |

A backend (accounts, sync between caregiver devices, secure sharing) comes later. Every data call
goes through `src/lib/store.tsx`, so swapping IndexedDB for an API is a contained change.

## Feature scope for v0.1

### 1. "My World" routine builder (grown-ups)
- Create routines (daily living, social, academic) made of ordered steps.
- Each step: an instruction, a photo or video of the learner's real place (uploaded from the
  device), an emoji fallback, and 2–3 tap choices with one correct answer.
- First/Then: each routine names its "Then" reward ("First brush teeth, then tablet time").
- Assign routines to learners; reorder steps with buttons (no drag needed).

### 2. Learner player with errorless learning
- Full-screen, one step at a time, big tap targets only (no dragging or pinching).
- First/Then board before starting, "Now / Next" strip while playing.
- Four prompt levels, from most to least help:
  - **Full**: only the correct choice can be tapped, and it glows.
  - **Highlight**: all choices tappable, correct one outlined from the start.
  - **Delayed**: outline appears after 5 seconds without a tap.
  - **Independent**: no outline unless the learner taps a different choice.
- A tap on another choice never shows an error. It fades and the correct choice is outlined.
- Read-aloud for each instruction (speech synthesis).
- Reinforcement per learner: token board, special-interest animation, or a soft chime.
- Exit from learner mode needs a 2-second press, so learners don't leave by accident.

### 3. Bio-responsive calm-down
- Heart-rate source: Bluetooth heart-rate device or the built-in simulator.
- Per-learner threshold (bpm) and how long it must stay above it before acting.
- When triggered, the routine pauses and a dark, distraction-free calm screen opens with the
  learner's chosen tools: breathing pacer, deep-pressure visual, calming music.
- "I'm ready" unlocks after a minimum calm time; the routine resumes where it stopped.
- A manual "I need a break" button is always on screen.

### 4. Educator & IEP dashboard
- Per learner: sessions, completion rate, average time, calm-down events.
- Current prompt level per step, and a chart of prompting over time per routine.
- Sticking points: steps ranked by redirected taps and time spent.
- Export CSV (one row per step attempt) and a JSON backup; print view for IEP meetings.

### 5. Adaptive prompting
- Rule-based fading for v0.1 (`src/lib/adaptive.ts`):
  - two clean completions in a row at a level → one level less help;
  - two or more redirected taps, or a calm-down during the step → one level more help.
- Kept as a pure function so a learned model can replace it later.

## Build order

1. Scaffold Vite + React + TS, design tokens, layout.
2. Data model, IndexedDB wrapper, media storage, seed demo data.
3. Learner home and player (prompt levels, rewards, First/Then).
4. Heart-rate provider (Bluetooth + simulator) and calm-down module.
5. Routine builder and learner settings.
6. Dashboard, charts, exports.
7. Unit tests, type check, production build, click-through in a browser.

## Later (not in v0.1)
- Accounts and roles (parent, teacher, therapist) with a real backend and encrypted sync.
- Apple Watch / Fitbit through their health APIs (needs a native companion app; browsers can only
  reach devices that broadcast the standard Bluetooth heart-rate profile).
- Tap-on-photo hotspots ("tap the toothbrush in the picture").
- Learned model for prompt fading; FERPA/HIPAA review before handling real student data.

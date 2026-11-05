# LifeSync requirements

Version 0.2 · Tier 1 working build

## 1. Problem

Learners on the autism spectrum often master a life skill in a structured classroom or clinic but
can't carry it out in the real, unpredictable place where it matters: a noisy supermarket, a
crowded bus, their own bathroom at home. This is the **generalization gap**. Most learning apps
make it worse by teaching with cartoons or stock photos that look nothing like the learner's world,
and they stop at "the learner finished the lesson" without checking whether the skill transferred.

## 2. Theme alignment

TSA 2026–27 High School Software Development theme:

> Develop a software application that improves how people learn, teach, practice, or develop new
> skills ... an engaging, effective, and user-centered software solution.

| Theme word             | How LifeSync addresses it                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Learn**              | Learners rehearse routines one step at a time inside photos and videos of their own places.                                    |
| **Teach**              | Educators and parents build those routines without code and see where each learner gets stuck.                                 |
| **Practice**           | Errorless prompting lets learners practise without failure; help fades as they improve.                                        |
| **Develop new skills** | Real-world check-ins measure whether the skill transferred, which is the goal of practising.                                   |
| **Engaging**           | Rewards are matched to each learner: a token board, a special-interest animation or a chime.                                   |
| **Effective**          | Uses established methods (video modelling, errorless learning, most-to-least prompting) and tracks the data an IEP team needs. |
| **User-centred**       | Built for autistic learners' sensory and motor needs: calm colours, tap-only input, read-aloud, a heart-rate-aware calm-down.  |

## 3. Users

| Persona                                     | Goal                                                   | Main screens                             |
| ------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| **Learner** (child or teen on the spectrum) | Practise a routine without stress                      | Start, Learner home, Player, Calm screen |
| **Educator / therapist**                    | Build routines, track progress, report to the IEP team | Routines, Progress data                  |
| **Parent / caregiver**                      | Practise at home, log real-world tries                 | Routines, Progress data, Wearable        |

## 4. Functional requirements

Status: ✅ done in this build · 🟡 partial · ⏳ planned. Each requirement lists the code that
implements it and the automated test that checks it.

### FR-1 "My World" routine builder

| ID     | Requirement                                                                                                  | Status | Code                                               | Test                 |
| ------ | ------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------- | -------------------- |
| FR-1.1 | A grown-up can create, edit and delete routines with a name, type, emoji and "Then" reward.                  | ✅     | `pages/admin/Routines.tsx`, `domain/repository.ts` | `repository.test.ts` |
| FR-1.2 | Each step can hold a photo or video of the learner's real place, stored on the device.                       | ✅     | `services/db.ts`, `components/MediaView.tsx`       | Manual T-3           |
| FR-1.3 | Each step has 2–4 tap choices with exactly one right answer; steps can be reordered with buttons.            | ✅     | `pages/admin/Routines.tsx`                         | `validation.test.ts` |
| FR-1.4 | A routine can't be saved with missing names, labels or right answers; problems are listed in plain language. | ✅     | `domain/validation.ts`                             | `validation.test.ts` |
| FR-1.5 | Routines are assigned to one or more learners.                                                               | ✅     | `pages/admin/Routines.tsx`                         | Manual T-3           |

### FR-2 Learner player and errorless learning

| ID     | Requirement                                                                                                       | Status | Code                                    | Test                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------- | ------------------------------------ |
| FR-2.1 | Each routine opens with a First/Then board; a Now/Next strip shows during steps.                                  | ✅     | `pages/Player.tsx`                      | `Player.test.tsx`                    |
| FR-2.2 | Four prompt levels: Full (only the right choice is tappable), Highlight, Delayed (hint after 5 s), Independent.   | ✅     | `domain/session.ts`                     | `session.test.ts`, `Player.test.tsx` |
| FR-2.3 | A tap on another choice never shows an error. It fades, the right choice is outlined, and the redirect is logged. | ✅     | `domain/session.ts`                     | `session.test.ts`, `Player.test.tsx` |
| FR-2.4 | Choice order is shuffled each session so learners can't memorise a position.                                      | ✅     | `domain/session.ts`                     | `session.test.ts`                    |
| FR-2.5 | Every interaction is a single tap; no dragging or pinching. Instructions can be read aloud.                       | ✅     | `pages/Player.tsx`, `services/audio.ts` | Manual T-1                           |
| FR-2.6 | Rewards after each step match the learner: token board, special-interest animation or chime.                      | ✅     | `components/Reward.tsx`                 | Manual T-1                           |
| FR-2.7 | Leaving learner mode needs a 2-second press so it can't happen by accident.                                       | ✅     | `components/HoldButton.tsx`             | Manual T-1                           |

### FR-3 Bio-responsive calm-down

| ID     | Requirement                                                                                                                                              | Status | Code                                            | Test                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- | ------------------------------------ |
| FR-3.1 | Heart rate comes from a Bluetooth heart-rate device or a built-in simulator.                                                                             | ✅     | `services/heartRate.tsx`, `domain/heartRate.ts` | `csv.test.ts` (parser), Manual T-2   |
| FR-3.2 | When heart rate stays above the learner's threshold for their hold time, the routine pauses and the calm screen opens. A short spike doesn't trigger it. | ✅     | `domain/stress.ts`                              | `stress.test.ts`                     |
| FR-3.3 | The calm screen is dark and distraction-free, with the learner's chosen tools: breathing pacer, deep-pressure visual, calm music.                        | ✅     | `components/CalmDown.tsx`                       | Manual T-2                           |
| FR-3.4 | "I'm ready" unlocks after a minimum break; the routine resumes on the same step and break time isn't counted against the step.                           | ✅     | `domain/session.ts`                             | `session.test.ts`, `Player.test.tsx` |
| FR-3.5 | An "I need a break" button is always available.                                                                                                          | ✅     | `pages/Player.tsx`                              | `Player.test.tsx`                    |

### FR-4 Educator and IEP dashboard

| ID     | Requirement                                                                                  | Status | Code                                              | Test              |
| ------ | -------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------- | ----------------- |
| FR-4.1 | Per learner: sessions, completion rate, average time and calm breaks.                        | ✅     | `domain/metrics.ts`                               | `metrics.test.ts` |
| FR-4.2 | Sticking points: the steps with the most redirects or calm breaks.                           | ✅     | `domain/metrics.ts`                               | `metrics.test.ts` |
| FR-4.3 | Current help level per step and a chart of help over time per routine.                       | ✅     | `domain/metrics.ts`, `components/PromptChart.tsx` | `metrics.test.ts` |
| FR-4.4 | Export practice data (one row per step attempt) and real-world check-ins as CSV; print view. | ✅     | `domain/csv.ts`                                   | `csv.test.ts`     |

### FR-5 Adaptive prompting

| ID     | Requirement                                                                                                  | Status | Code                 | Test                                     |
| ------ | ------------------------------------------------------------------------------------------------------------ | ------ | -------------------- | ---------------------------------------- |
| FR-5.1 | Help fades one level after two clean completions and comes back after two or more redirects or a calm break. | ✅     | `domain/adaptive.ts` | `adaptive.test.ts`, `repository.test.ts` |
| FR-5.2 | Replace the rules with a model trained on session data.                                                      | ⏳     |                      |                                          |

### FR-6 Real-world check-ins (generalization tracking)

| ID     | Requirement                                                                                                                                  | Status | Code                                                    | Test              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------- | ----------------- |
| FR-6.1 | A grown-up logs how the learner did a routine in the real place: on their own, with help, or not yet, plus where and a note.                 | ✅     | `components/RealWorldPanel.tsx`, `domain/repository.ts` | Manual T-4        |
| FR-6.2 | Each routine compares in-app mastery with real-world success and labels it: Practising, **Generalization gap**, Transferring or Generalized. | ✅     | `domain/metrics.ts`                                     | `metrics.test.ts` |

### FR-7 Data

| ID     | Requirement                                                              | Status | Code                                | Test                 |
| ------ | ------------------------------------------------------------------------ | ------ | ----------------------------------- | -------------------- |
| FR-7.1 | Everything is saved on the device and survives a reload.                 | ✅     | `services/db.ts`, `state/store.tsx` | Manual T-5           |
| FR-7.2 | Download and restore a backup; older backups are upgraded automatically. | ✅     | `domain/repository.ts` (`migrate`)  | `repository.test.ts` |

## 5. Non-functional requirements

| ID                   | Requirement                                                                                                              | How it's met                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| NFR-1 Accessibility  | Tap targets ≥ 44 px (choices ≥ 96 px), visible focus, labelled controls, read-aloud, `prefers-reduced-motion` respected. | `styles.css`, ARIA labels     |
| NFR-2 Sensory safety | No flashing, no error sounds, muted video by default, low-saturation colours, slow animations.                           | `styles.css`, `MediaView.tsx` |
| NFR-3 Privacy        | No accounts, no server, no tracking; data stays in the browser.                                                          | `services/db.ts`              |
| NFR-4 Offline        | Works without internet after the first load (needed for a TSA demo with no Wi-Fi).                                       | Static build, IndexedDB       |
| NFR-5 Devices        | Usable from phone (375 px) to desktop.                                                                                   | Responsive CSS                |
| NFR-6 Quality        | Strict TypeScript, lint, formatting and tests run on every push.                                                         | `.github/workflows/ci.yml`    |

## 6. Out of scope for Tier 1

Accounts and syncing between devices, Apple Watch and Fitbit (they don't broadcast to browsers and
need a companion app), tapping a hotspot inside a photo, and a learned prompting model.

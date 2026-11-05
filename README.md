# LifeSync

**TSA High School Software Development, 2026–27 · Team 1.** Theme: _improve how people learn, teach,
practice, or develop new skills._

LifeSync helps learners on the autism spectrum close the **generalization gap**: the distance
between doing a skill in a classroom and doing it in the real, noisy world. Grown-ups build
routines from photos and videos of the learner's own places. The learner practises them with
errorless prompting that fades as they improve. A heart-rate wearable can pause practice for a
calm-down break. Then real-world check-ins show whether the skill actually transferred.

## Project documents

| Document                                                                                                           | Contents                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [Requirements](docs/REQUIREMENTS.md)                                                                               | Problem, theme alignment, users, numbered requirements traced to code and tests |
| [Design](docs/DESIGN.md)                                                                                           | Architecture, data model, session state machine, algorithms, design decisions   |
| [Testing](docs/TESTING.md)                                                                                         | Test strategy, automated results, manual test cases                             |
| [Requirements and design note (PDF)](docs/submission/SoftwareDevelopment_Team1_Tier1_Requirements-Design-Note.pdf) | One-page Tier 1 note                                                            |
| [Demo script](docs/DEMO-SCRIPT.md)                                                                                 | Script for the screen recording                                                 |
| [Plan](PLAN.md)                                                                                                    | Build history and roadmap                                                       |

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app starts with demo data: two learners (Sam and Maya), three
routines, two weeks of Sam's practice history and some real-world check-ins.

| Command                 | What it does                                          |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload                            |
| `npm test`              | All unit and integration tests                        |
| `npm run test:coverage` | Tests with a coverage report                          |
| `npm run check`         | Type check, lint, format check and tests (same as CI) |
| `npm run build`         | Production build into `dist/`                         |

## Features

1. **"My World" routine builder**: steps with photos or videos of the learner's real places,
   tap choices, a First/Then reward, and validation that explains what to fix.
2. **Errorless learning player**: four prompt levels (Full, Highlight, Delayed, Independent).
   An off-target tap is never marked wrong; the right choice is shown instead.
3. **Bio-responsive calm-down**: Bluetooth heart-rate device or simulator. Sustained high heart
   rate pauses the routine and opens a dark calm screen with breathing, pressure and music tools.
4. **Adaptive prompting**: help fades after two clean completions and comes back when the
   learner struggles.
5. **Real-world check-ins**: grown-ups log how the learner did in the real place. Each routine
   is labelled Practising, Generalization gap, Transferring or Generalized.
6. **IEP dashboard**: sticking points, help per step, help over time, CSV export, print view.

## Code structure

```
src/
  domain/       Pure TypeScript: rules and calculations, no React or browser APIs (unit tested)
    session.ts      practice session state machine
    adaptive.ts     prompt fading rules
    stress.ts       when heart rate should open the calm screen
    metrics.ts      dashboard numbers and the generalization gap
    repository.ts   data operations and migration of old saves
    validation.ts   routine and learner checks
    csv.ts          IEP exports
  services/     Browser APIs: IndexedDB, Web Bluetooth, Web Audio, downloads
  state/        React store that applies domain operations and saves them
  components/   Reusable UI (calm screen, rewards, chart, real-world panel)
  pages/        Learner screens and the grown-up area (pages/admin)
```

Data stays in the browser's IndexedDB. There is no server or account yet.

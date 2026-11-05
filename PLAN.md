# LifeSync plan

This file tracks how the project is built and what comes next. Requirements live in
[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) and the technical design in
[docs/DESIGN.md](docs/DESIGN.md).

## Process

We work in short iterations. Each one starts from the requirements, updates the design where
needed, implements behind tests, and checks the result in the browser against the manual test
list in [docs/TESTING.md](docs/TESTING.md). CI runs the type check, lint, format check, tests
and build on every push.

## Iterations

### v0.1: first working version (done)

- Routine builder with photo/video steps, learner player with prompt levels and First/Then.
- Heart-rate calm-down with Bluetooth and simulator, rule-based adaptive prompting.
- Progress dashboard with CSV export; demo data.

### v0.2: Tier 1 build (done)

- Added **real-world check-ins** and the **generalization gap** status. These measure the problem
  the app exists to solve, not only practice inside the app.
- Moved all rules into a pure `domain/` layer: the session state machine, calm-down trigger,
  metrics, validation and data migration.
- Routine and learner forms are validated with plain-language messages.
- Grew the test suite from 7 to 62 tests (unit and integration), with coverage reporting.
- Added ESLint, Prettier and GitHub Actions CI.
- Wrote requirements with traceability, design, test plan and the one-page Tier 1 note.

### v0.3: Tier 2 (next)

- Tap-on-photo hotspots ("tap the toothbrush in the picture").
- Practice in the real place: a phone mode that runs the routine during the real task.
- Prompting model trained on session data, in place of the fixed rules.
- More manual testing with real users and a real Bluetooth strap.

### Later

- Accounts and roles (parent, teacher, therapist) with a backend and encrypted sync.
- Apple Watch / Fitbit through a native companion app.
- FERPA review before handling real student data.

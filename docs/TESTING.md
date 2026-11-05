# LifeSync test plan

## Strategy

| Level       | What                                                                                                                                                 | Tool                             | Where                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------- |
| Unit        | Every rule in `src/domain`: session state machine, adaptive prompting, calm-down trigger, metrics, validation, CSV, data migration, Bluetooth parser | Vitest                           | `src/domain/*.test.ts`      |
| Integration | The real Player, store and reducer together: errorless taps, rewards, session saving, calm break                                                     | Vitest + Testing Library (jsdom) | `src/pages/Player.test.tsx` |
| Static      | Strict TypeScript, ESLint (including React hooks rules), Prettier                                                                                    | `tsc`, `eslint`, `prettier`      | `npm run check`             |
| Continuous  | All of the above plus a production build on every push and pull request                                                                              | GitHub Actions                   | `.github/workflows/ci.yml`  |
| Manual      | Things that need real hardware or senses: sound, Bluetooth, uploads, layout                                                                          | Browser checklist below          | This file                   |

Run everything:

```bash
npm run check
npm run test:coverage
```

## Automated results (v0.2)

62 tests in 8 files, all passing. Coverage of the domain layer and Player: 93% of statements,
89% of branches.

| File                 | Tests | Covers                     |
| -------------------- | ----- | -------------------------- |
| `session.test.ts`    | 13    | FR-2.1–2.4, FR-3.4         |
| `repository.test.ts` | 11    | FR-1.1, FR-5.1, FR-7.2     |
| `metrics.test.ts`    | 9     | FR-4.1–4.3, FR-6.2         |
| `adaptive.test.ts`   | 7     | FR-5.1                     |
| `validation.test.ts` | 7     | FR-1.3, FR-1.4             |
| `csv.test.ts`        | 6     | FR-4.4, FR-3.1 (parser)    |
| `stress.test.ts`     | 5     | FR-3.2                     |
| `Player.test.tsx`    | 4     | FR-2.1–2.3, FR-3.4, FR-3.5 |

## Manual test cases

Run in Chrome or Edge with `npm run dev`. "Pass" means checked on the v0.2 build.

| ID  | Steps                                                                                                                    | Expected                                                                                                                                                     | Result                  |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| T-1 | Start screen → Sam → Pay at the grocery store → Start. Tap an off-target choice, then the right one. Finish the routine. | First/Then board, Now/Next strip, faded off-target choice, outlined target, "Nice work!" reward, finish screen with the Then reward. Hold to exit needs 2 s. | Pass                    |
| T-2 | Grown-ups → Wearable → Use simulator. Start a routine, open ♥ in the corner, press Spike.                               | After ~5 s above 110 bpm the dark calm screen opens with Breathe / Squeeze / Music. "I'm ready" unlocks after 20 s; the routine resumes on the same step.    | Pass                    |
| T-3 | Grown-ups → Routines → Brush my teeth → Add photo/video on step 1 → Save and try it.                                     | The photo shows in the Player instead of the emoji.                                                                                                          | Pass                    |
| T-4 | Grown-ups → Progress data → Sam → Brush my teeth → Log a real-world try → "Did it on their own".                         | Check-in appears in the list; status and bars update. Demo data shows a "Generalization gap" for tooth-brushing.                                             | Pass                    |
| T-5 | Make any change, reload the page.                                                                                        | The change is still there.                                                                                                                                   | Pass                    |
| T-6 | Try to save a routine with an empty choice label.                                                                        | Save is blocked and a plain-language list says what to fix.                                                                                                  | Pass                    |
| T-7 | Turn on "reduce motion" in the OS, open the calm screen and a reward.                                                    | No animation; text and controls still work.                                                                                                                  | Not yet run             |
| T-8 | Connect a real Bluetooth heart-rate strap from Grown-ups → Wearable.                                                     | Live bpm shows and drives the calm trigger.                                                                                                                  | Not yet run (no device) |

import { describe, expect, it } from 'vitest';
import { nextPromptState, START_STATE } from './adaptive';
import type { StepLog } from './types';

const log = (over: Partial<StepLog> = {}): StepLog => ({
  stepId: 's1',
  promptLevel: 3,
  wrongTaps: 0,
  durationMs: 4000,
  calmDuringStep: false,
  ...over,
});

describe('nextPromptState', () => {
  it('starts new steps at full help', () => {
    expect(nextPromptState(undefined, log())).toEqual({ level: 3, streak: 1 });
  });

  it('fades one level after two clean completions', () => {
    const once = nextPromptState(START_STATE, log());
    expect(nextPromptState(once, log())).toEqual({ level: 2, streak: 0 });
  });

  it('never fades below independent', () => {
    expect(nextPromptState({ level: 0, streak: 1 }, log())).toEqual({ level: 0, streak: 2 });
  });

  it('resets the streak on a single redirected tap without adding help', () => {
    expect(nextPromptState({ level: 1, streak: 1 }, log({ wrongTaps: 1 }))).toEqual({ level: 1, streak: 0 });
  });

  it('adds help after repeated redirects', () => {
    expect(nextPromptState({ level: 1, streak: 1 }, log({ wrongTaps: 2 }))).toEqual({ level: 2, streak: 0 });
  });

  it('adds help when a calm-down happened during the step', () => {
    expect(nextPromptState({ level: 0, streak: 1 }, log({ calmDuringStep: true }))).toEqual({ level: 1, streak: 0 });
  });

  it('caps help at full', () => {
    expect(nextPromptState({ level: 3, streak: 0 }, log({ wrongTaps: 4 }))).toEqual({ level: 3, streak: 0 });
  });
});

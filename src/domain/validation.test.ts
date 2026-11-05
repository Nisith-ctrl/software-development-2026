import { describe, expect, it } from 'vitest';
import { createSeedData } from './seed';
import { choice, learner, routine, step } from './testData';
import { validateLearner, validateRoutine } from './validation';

describe('validateRoutine', () => {
  it('accepts a complete routine', () => {
    expect(validateRoutine(routine())).toEqual([]);
  });

  it('accepts every demo routine', () => {
    for (const r of createSeedData(0).routines) expect(validateRoutine(r), r.title).toEqual([]);
  });

  it('requires a name, a Then reward and at least one step', () => {
    expect(validateRoutine(routine({ title: ' ', thenReward: '', steps: [] }))).toHaveLength(3);
  });

  it('requires exactly one right choice per step', () => {
    const none = step('s1', { choices: [choice('a'), choice('b')] });
    const two = step('s2', { choices: [choice('a', true), choice('b', true)] });
    expect(validateRoutine(routine({ steps: [none, two] }))).toEqual([
      'Step 1: mark exactly one right choice.',
      'Step 2: mark exactly one right choice.',
    ]);
  });

  it('requires an instruction, two choices and labels', () => {
    const bad = step('s1', { instruction: '', choices: [{ ...choice('a', true), label: '' }] });
    expect(validateRoutine(routine({ steps: [bad] }))).toEqual([
      'Step 1: say what the learner does.',
      'Step 1: add at least two choices.',
      'Step 1: every choice needs a label.',
    ]);
  });
});

describe('validateLearner', () => {
  it('accepts a complete learner', () => {
    expect(validateLearner(learner())).toEqual([]);
  });

  it('catches missing name, no calm tools and out-of-range numbers', () => {
    const errors = validateLearner(
      learner({ name: '', calmTools: [], hrThreshold: 40, hrSustainSeconds: 0, tokensPerReward: 20 }),
    );
    expect(errors).toHaveLength(5);
  });
});

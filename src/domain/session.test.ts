import { describe, expect, it } from 'vitest';
import { buildPlan, createSession, hintVisibleAtStart, sessionReducer, shuffle, type SessionState } from './session';
import { routine } from './testData';
import type { PromptLevel } from './types';

const keepOrder = <T>(xs: T[]) => xs;

function started(level: PromptLevel = 2): SessionState {
  const plan = buildPlan(routine(), () => level, keepOrder);
  return sessionReducer(createSession(plan), { type: 'start', now: 0 });
}

describe('buildPlan', () => {
  it('freezes each step at its current prompt level', () => {
    const plan = buildPlan(routine(), (id) => (id === 's1' ? 3 : 0), keepOrder);
    expect(plan.map((p) => p.level)).toEqual([3, 0]);
  });

  it('shuffles choices without losing any', () => {
    const plan = buildPlan(
      routine(),
      () => 2,
      (xs) => [...xs].reverse(),
    );
    expect(plan[0].choices.map((c) => c.id)).toEqual(['wrong', 'right']);
  });
});

describe('shuffle', () => {
  it('returns a permutation and leaves the input alone', () => {
    const input = [1, 2, 3, 4];
    const out = shuffle(input, () => 0);
    expect([...out].sort()).toEqual([1, 2, 3, 4]);
    expect(input).toEqual([1, 2, 3, 4]);
  });
});

describe('sessionReducer', () => {
  it('starts on the First/Then board and moves to step 1 on start', () => {
    const plan = buildPlan(routine(), () => 2, keepOrder);
    const s = createSession(plan);
    expect(s.phase).toBe('first-then');
    const next = sessionReducer(s, { type: 'start', now: 100 });
    expect(next).toMatchObject({ phase: 'step', index: 0, stepStartedAt: 100 });
  });

  it('shows the hint from the start only at Full and Highlight', () => {
    expect([3, 2, 1, 0].map((l) => hintVisibleAtStart(l as PromptLevel))).toEqual([true, true, false, false]);
    expect(started(1).hintShown).toBe(false);
    expect(started(2).hintShown).toBe(true);
  });

  it('treats an off-target tap as errorless: fades it, reveals the target, stays on the step', () => {
    const s = sessionReducer(started(0), { type: 'tap', choiceId: 'wrong', now: 500 });
    expect(s).toMatchObject({ phase: 'step', wrongTaps: 1, faded: ['wrong'], hintShown: true });
  });

  it('ignores taps on locked-out choices at Full help', () => {
    const before = started(3);
    expect(sessionReducer(before, { type: 'tap', choiceId: 'wrong', now: 1 })).toBe(before);
  });

  it('logs the step on the correct tap and shows the reward', () => {
    let s = sessionReducer(started(0), { type: 'tap', choiceId: 'wrong', now: 1000 });
    s = sessionReducer(s, { type: 'tap', choiceId: 'right', now: 3000 });
    expect(s.phase).toBe('reward');
    expect(s.logs).toEqual([
      { stepId: 's1', promptLevel: 0, wrongTaps: 1, durationMs: 3000, calmDuringStep: false, peakHr: undefined },
    ]);
  });

  it('advances through every step and then finishes', () => {
    let s = started();
    s = sessionReducer(s, { type: 'tap', choiceId: 'right', now: 1 });
    s = sessionReducer(s, { type: 'advance', now: 2 });
    expect(s).toMatchObject({ phase: 'step', index: 1, wrongTaps: 0, faded: [] });
    s = sessionReducer(s, { type: 'tap', choiceId: 'right', now: 3 });
    s = sessionReducer(s, { type: 'advance', now: 4 });
    expect(s.phase).toBe('done');
    expect(s.logs).toHaveLength(2);
  });

  it('records peak heart rate for the current step', () => {
    let s = sessionReducer(started(), { type: 'heart-rate', bpm: 95 });
    s = sessionReducer(s, { type: 'heart-rate', bpm: 88 });
    s = sessionReducer(s, { type: 'tap', choiceId: 'right', now: 10 });
    expect(s.logs[0].peakHr).toBe(95);
  });

  describe('calm breaks', () => {
    it('blocks taps while the calm screen is open', () => {
      const open = sessionReducer(started(), { type: 'open-calm', trigger: 'heart-rate', hr: 120, now: 1000 });
      expect(sessionReducer(open, { type: 'tap', choiceId: 'right', now: 1100 })).toBe(open);
    });

    it('logs the break, flags the step and leaves break time out of the step duration', () => {
      let s = sessionReducer(started(), { type: 'open-calm', trigger: 'heart-rate', hr: 120, now: 1000 });
      s = sessionReducer(s, { type: 'close-calm', now: 31_000 });
      expect(s.calm).toBeNull();
      expect(s.calmEvents).toEqual([{ at: 1000, stepId: 's1', trigger: 'heart-rate', hr: 120, durationMs: 30_000 }]);
      s = sessionReducer(s, { type: 'tap', choiceId: 'right', now: 35_000 });
      expect(s.logs[0]).toMatchObject({ durationMs: 5000, calmDuringStep: true });
    });

    it('does not open twice', () => {
      const once = sessionReducer(started(), { type: 'open-calm', trigger: 'manual', now: 1 });
      expect(sessionReducer(once, { type: 'open-calm', trigger: 'heart-rate', now: 2 })).toBe(once);
    });
  });
});

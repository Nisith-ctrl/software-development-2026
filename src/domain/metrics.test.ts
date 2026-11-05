import { describe, expect, it } from 'vitest';
import { generalization, helpTrend, learnerSummary, logsByStep, stepStats, stickingPoints } from './metrics';
import { appData, routine, session, stepLog } from './testData';
import type { RealWorldCheck } from './types';
import { promptKey } from './types';

const check = (id: string, result: RealWorldCheck['result'], at: number): RealWorldCheck => ({
  id,
  learnerId: 'l1',
  routineId: 'r1',
  at,
  place: 'Home',
  result,
  note: '',
});

describe('learnerSummary', () => {
  it('summarises sessions, completion, time and calm breaks', () => {
    const sessions = [
      session({ id: 'a', startedAt: 0, endedAt: 10_000 }),
      session({ id: 'b', startedAt: 0, endedAt: 20_000 }),
      session({ id: 'c', completed: false, calmEvents: [{ at: 0, trigger: 'manual', durationMs: 1 }] }),
    ];
    expect(learnerSummary(sessions)).toEqual({
      sessions: 3,
      completionRate: 2 / 3,
      avgDurationMs: 15_000,
      calmBreaks: 1,
    });
  });

  it('handles no sessions', () => {
    expect(learnerSummary([])).toEqual({ sessions: 0, completionRate: 0, avgDurationMs: 0, calmBreaks: 0 });
  });
});

describe('step statistics', () => {
  const sessions = [
    session({ steps: [stepLog('s1', { wrongTaps: 2, durationMs: 6000 }), stepLog('s2')] }),
    session({ steps: [stepLog('s1', { wrongTaps: 1, durationMs: 4000, calmDuringStep: true }), stepLog('s2')] }),
  ];

  it('groups logs by step and averages them', () => {
    const byStep = logsByStep(sessions);
    expect(stepStats(byStep.get('s1')!)).toEqual({ tries: 2, avgWrongTaps: 1.5, avgDurationMs: 5000, calmBreaks: 1 });
  });

  it('lists only steps the learner struggles with, worst first', () => {
    const points = stickingPoints([routine()], logsByStep(sessions));
    expect(points.map((p) => p.step.id)).toEqual(['s1']);
  });

  it('charts average prompt level per session for a routine', () => {
    const trend = helpTrend(
      [session({ startedAt: 5, steps: [stepLog('s1', { promptLevel: 3 }), stepLog('s2', { promptLevel: 1 })] })],
      'r1',
    );
    expect(trend).toEqual([{ at: 5, level: 2 }]);
  });
});

describe('generalization', () => {
  const mastered = {
    [promptKey('l1', 's1')]: { level: 0 as const, streak: 0 },
    [promptKey('l1', 's2')]: { level: 1 as const, streak: 0 },
  };

  it('reports no data before any practice or check-in', () => {
    expect(generalization(appData(), 'l1', routine()).status).toBe('no-data');
  });

  it('flags a gap when the app skill is mastered but real-world tries still need help', () => {
    const data = appData({
      sessions: [session()],
      prompts: mastered,
      realWorldChecks: [check('a', 'with-help', 1), check('b', 'not-yet', 2)],
    });
    const g = generalization(data, 'l1', routine());
    expect(g).toMatchObject({ appMastery: 1, realWorldRate: 0, status: 'gap' });
    expect(g.checks.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('calls it generalized after three independent real-world tries in a row', () => {
    const data = appData({
      sessions: [session()],
      prompts: mastered,
      realWorldChecks: [
        check('a', 'not-yet', 1),
        check('b', 'independent', 2),
        check('c', 'independent', 3),
        check('d', 'independent', 4),
      ],
    });
    expect(generalization(data, 'l1', routine())).toMatchObject({ realWorldRate: 1, status: 'generalized' });
  });

  it('shows transfer in progress when some real-world tries succeed', () => {
    const data = appData({
      sessions: [session()],
      realWorldChecks: [check('a', 'independent', 1), check('b', 'with-help', 2)],
    });
    expect(generalization(data, 'l1', routine()).status).toBe('generalizing');
  });
});

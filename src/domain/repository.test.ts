import { describe, expect, it } from 'vitest';
import { applySession, migrate, promptStateFor, removeLearner, upsertLearner, upsertRoutine } from './repository';
import { createSeedData } from './seed';
import { appData, learner, routine, session, stepLog } from './testData';
import { DATA_VERSION } from './types';

describe('repository', () => {
  it('adds a new learner and updates an existing one', () => {
    const added = upsertLearner(appData(), learner({ id: 'l2', name: 'Sam' }));
    expect(added.learners.map((l) => l.id)).toEqual(['l1', 'l2']);
    const renamed = upsertLearner(added, learner({ id: 'l2', name: 'Samuel' }));
    expect(renamed.learners.find((l) => l.id === 'l2')?.name).toBe('Samuel');
  });

  it('unassigns routines when a learner is removed', () => {
    const data = removeLearner(appData(), 'l1');
    expect(data.learners).toEqual([]);
    expect(data.routines[0].assignedTo).toEqual([]);
  });

  it('stamps routines with the time they were saved', () => {
    expect(upsertRoutine(appData(), routine(), 42).routines[0].updatedAt).toBe(42);
  });

  it('saves a session, awards tokens and moves prompt levels', () => {
    const data = applySession(appData(), session({ steps: [stepLog('s1'), stepLog('s2', { wrongTaps: 3 })] }), 2);
    expect(data.sessions).toHaveLength(1);
    expect(data.learners[0].tokens).toBe(2);
    expect(promptStateFor(data, 'l1', 's1')).toEqual({ level: 3, streak: 1 });
    expect(promptStateFor(data, 'l1', 's2')).toEqual({ level: 3, streak: 0 });
  });

  it('does not change the data it was given', () => {
    const before = appData();
    const snapshot = JSON.stringify(before);
    applySession(before, session(), 1);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('migrate', () => {
  it('upgrades version 1 data by adding real-world check-ins', () => {
    const v1: Record<string, unknown> = { ...appData(), version: 1 };
    delete v1.realWorldChecks;
    expect(migrate(v1)).toMatchObject({ version: DATA_VERSION, realWorldChecks: [] });
  });

  it('accepts current data unchanged', () => {
    const data = createSeedData(0);
    expect(migrate(data)).toBe(data);
  });

  it.each([null, 'text', {}, { version: 99, learners: [], routines: [], sessions: [] }])('rejects %j', (raw) => {
    expect(migrate(raw)).toBeNull();
  });
});

import type { AppData, Choice, Learner, Routine, Session, Step, StepLog } from './types';
import { DATA_VERSION } from './types';

// Small builders shared by the unit tests.

export const choice = (id: string, correct = false): Choice => ({ id, label: `Choice ${id}`, emoji: '🙂', correct });

export const step = (id: string, over: Partial<Step> = {}): Step => ({
  id,
  instruction: `Do ${id}`,
  emoji: '📍',
  choices: [choice('right', true), choice('wrong')],
  ...over,
});

export const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1',
  title: 'Test routine',
  emoji: '⭐',
  category: 'daily-living',
  thenReward: 'Play time',
  thenEmoji: '🎉',
  steps: [step('s1'), step('s2')],
  assignedTo: ['l1'],
  updatedAt: 0,
  ...over,
});

export const learner = (over: Partial<Learner> = {}): Learner => ({
  id: 'l1',
  name: 'Alex',
  avatar: '🙂',
  rewardStyle: 'tokens',
  interestEmoji: '⭐',
  tokensPerReward: 5,
  calmTools: ['breathing'],
  hrThreshold: 110,
  hrSustainSeconds: 5,
  calmMinSeconds: 0,
  readAloud: false,
  tokens: 0,
  ...over,
});

export const stepLog = (stepId: string, over: Partial<StepLog> = {}): StepLog => ({
  stepId,
  promptLevel: 3,
  wrongTaps: 0,
  durationMs: 4000,
  calmDuringStep: false,
  ...over,
});

export const session = (over: Partial<Session> = {}): Session => ({
  id: 'sess1',
  learnerId: 'l1',
  routineId: 'r1',
  startedAt: 1_000,
  endedAt: 11_000,
  completed: true,
  steps: [stepLog('s1'), stepLog('s2')],
  calmEvents: [],
  ...over,
});

export const appData = (over: Partial<AppData> = {}): AppData => ({
  version: DATA_VERSION,
  learners: [learner()],
  routines: [routine()],
  sessions: [],
  prompts: {},
  realWorldChecks: [],
  ...over,
});

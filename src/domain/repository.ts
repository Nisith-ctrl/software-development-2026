import { nextPromptState, START_STATE } from './adaptive';
import type { AppData, Learner, PromptState, RealWorldCheck, Routine, Session } from './types';
import { DATA_VERSION, promptKey } from './types';

// Pure operations on AppData. The React store calls these; tests call them directly.

const upsert = <T extends { id: string }>(items: T[], item: T) =>
  items.some((x) => x.id === item.id) ? items.map((x) => (x.id === item.id ? item : x)) : [...items, item];

export const upsertLearner = (data: AppData, learner: Learner): AppData => ({
  ...data,
  learners: upsert(data.learners, learner),
});

export const removeLearner = (data: AppData, id: string): AppData => ({
  ...data,
  learners: data.learners.filter((l) => l.id !== id),
  routines: data.routines.map((r) => ({ ...r, assignedTo: r.assignedTo.filter((a) => a !== id) })),
});

export const upsertRoutine = (data: AppData, routine: Routine, now = Date.now()): AppData => ({
  ...data,
  routines: upsert(data.routines, { ...routine, updatedAt: now }),
});

export const removeRoutine = (data: AppData, id: string): AppData => ({
  ...data,
  routines: data.routines.filter((r) => r.id !== id),
});

/** Saves a finished or stopped session and moves each step's prompt level (FR-5.1). */
export function applySession(data: AppData, session: Session, tokensEarned: number): AppData {
  const prompts = { ...data.prompts };
  for (const log of session.steps) {
    const key = promptKey(session.learnerId, log.stepId);
    prompts[key] = nextPromptState(prompts[key], log);
  }
  return {
    ...data,
    sessions: [...data.sessions, session],
    prompts,
    learners: data.learners.map((l) => (l.id === session.learnerId ? { ...l, tokens: l.tokens + tokensEarned } : l)),
  };
}

export const addRealWorldCheck = (data: AppData, check: RealWorldCheck): AppData => ({
  ...data,
  realWorldChecks: [...data.realWorldChecks, check],
});

export const removeRealWorldCheck = (data: AppData, id: string): AppData => ({
  ...data,
  realWorldChecks: data.realWorldChecks.filter((c) => c.id !== id),
});

export const promptStateFor = (data: AppData, learnerId: string, stepId: string): PromptState =>
  data.prompts[promptKey(learnerId, stepId)] ?? START_STATE;

/** Upgrades saved data and backups from older versions. Returns null for anything else. */
export function migrate(raw: unknown): AppData | null {
  const v = raw as Omit<Partial<AppData>, 'version'> & { version?: number };
  if (
    !v ||
    typeof v !== 'object' ||
    !Array.isArray(v.learners) ||
    !Array.isArray(v.routines) ||
    !Array.isArray(v.sessions)
  ) {
    return null;
  }
  if (v.version === 1) {
    return { ...(v as unknown as AppData), version: DATA_VERSION, realWorldChecks: [] };
  }
  if (v.version === DATA_VERSION && Array.isArray(v.realWorldChecks)) {
    return v as unknown as AppData;
  }
  return null;
}

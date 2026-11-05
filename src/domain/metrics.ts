import { promptStateFor } from './repository';
import type { AppData, RealWorldCheck, Routine, Session, Step, StepLog } from './types';

// Progress calculations behind the educator dashboard (requirements FR-4.x, FR-6.x).

export const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const sessionDurationMs = (s: Session) => (s.endedAt ?? s.startedAt) - s.startedAt;

export const sessionsFor = (data: AppData, learnerId: string) =>
  data.sessions.filter((s) => s.learnerId === learnerId).sort((a, b) => a.startedAt - b.startedAt);

export interface LearnerSummary {
  sessions: number;
  completionRate: number;
  avgDurationMs: number;
  calmBreaks: number;
}

export function learnerSummary(sessions: Session[]): LearnerSummary {
  const completed = sessions.filter((s) => s.completed);
  return {
    sessions: sessions.length,
    completionRate: sessions.length ? completed.length / sessions.length : 0,
    avgDurationMs: average(completed.map(sessionDurationMs)),
    calmBreaks: sessions.reduce((n, s) => n + s.calmEvents.length, 0),
  };
}

export function logsByStep(sessions: Session[]): Map<string, StepLog[]> {
  const map = new Map<string, StepLog[]>();
  for (const s of sessions) {
    for (const log of s.steps) map.set(log.stepId, [...(map.get(log.stepId) ?? []), log]);
  }
  return map;
}

export interface StepStats {
  tries: number;
  avgWrongTaps: number;
  avgDurationMs: number;
  calmBreaks: number;
}

export function stepStats(logs: StepLog[]): StepStats {
  return {
    tries: logs.length,
    avgWrongTaps: average(logs.map((l) => l.wrongTaps)),
    avgDurationMs: average(logs.map((l) => l.durationMs)),
    calmBreaks: logs.filter((l) => l.calmDuringStep).length,
  };
}

export interface StickingPoint extends StepStats {
  routine: Routine;
  step: Step;
  index: number;
}

/** Steps with calm breaks or at least one redirect every other try, worst first. */
export function stickingPoints(routines: Routine[], byStep: Map<string, StepLog[]>, limit = 5): StickingPoint[] {
  return routines
    .flatMap((routine) =>
      routine.steps.map((step, index) => ({ routine, step, index, ...stepStats(byStep.get(step.id) ?? []) })),
    )
    .filter((x) => x.tries > 0 && (x.avgWrongTaps >= 0.5 || x.calmBreaks > 0))
    .sort((a, b) => b.calmBreaks - a.calmBreaks || b.avgWrongTaps - a.avgWrongTaps)
    .slice(0, limit);
}

/** Average prompt level per session for one routine: the "help over time" line. */
export const helpTrend = (sessions: Session[], routineId: string) =>
  sessions
    .filter((s) => s.routineId === routineId && s.steps.length > 0)
    .map((s) => ({ at: s.startedAt, level: average(s.steps.map((l) => l.promptLevel)) }));

export type GeneralizationStatus = 'no-data' | 'practising' | 'gap' | 'generalizing' | 'generalized';

export interface Generalization {
  /** Share of the routine's steps that need little or no help in the app (Delayed or Independent). */
  appMastery: number;
  /** Share of the last few real-world check-ins done on their own. */
  realWorldRate: number;
  checks: RealWorldCheck[];
  status: GeneralizationStatus;
}

export const MASTERY_LEVEL = 1;
export const RECENT_CHECKS = 3;
const MASTERED = 0.8;

/**
 * Compares in-app mastery with how the learner does in the real place.
 * "gap" is the case LifeSync exists for: the skill is mastered on screen
 * but hasn't transferred yet, so the team should practise in the real setting.
 */
export function generalization(data: AppData, learnerId: string, routine: Routine): Generalization {
  const steps = routine.steps;
  const mastered = steps.filter((s) => promptStateFor(data, learnerId, s.id).level <= MASTERY_LEVEL).length;
  const appMastery = steps.length ? mastered / steps.length : 0;

  const checks = data.realWorldChecks
    .filter((c) => c.learnerId === learnerId && c.routineId === routine.id)
    .sort((a, b) => b.at - a.at);
  const recent = checks.slice(0, RECENT_CHECKS);
  const realWorldRate = recent.length ? recent.filter((c) => c.result === 'independent').length / recent.length : 0;

  const hasPractice = data.sessions.some((s) => s.learnerId === learnerId && s.routineId === routine.id);
  let status: GeneralizationStatus;
  if (!hasPractice && checks.length === 0) status = 'no-data';
  else if (realWorldRate >= MASTERED && recent.length >= RECENT_CHECKS) status = 'generalized';
  else if (appMastery >= MASTERED && realWorldRate < 0.5) status = 'gap';
  else if (realWorldRate > 0) status = 'generalizing';
  else status = 'practising';

  return { appMastery, realWorldRate, checks, status };
}

export const GENERALIZATION_COPY: Record<GeneralizationStatus, { label: string; advice: string }> = {
  'no-data': { label: 'Not started', advice: 'Practise in the app first, then try it in the real place.' },
  practising: {
    label: 'Practising',
    advice: 'Keep practising in the app. Log a real-world try when the learner is ready.',
  },
  gap: {
    label: 'Generalization gap',
    advice:
      'Mastered in the app but not yet in real life. Practise in the real place, and check that the photos match it.',
  },
  generalizing: { label: 'Transferring', advice: 'Starting to work in real life. Keep logging tries.' },
  generalized: { label: 'Generalized', advice: 'Done on their own in real life. Consider fading app practice.' },
};

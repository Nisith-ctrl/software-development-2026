import { localIsoDate } from './dates';
import type { AppData, Learner } from './types';
import { PROMPT_LABELS, REAL_WORLD_LABELS } from './types';

type Cell = string | number | boolean | undefined;

/** Quotes a value when it holds a comma, quote or newline (RFC 4180). */
export const csvCell = (v: Cell) => {
  const s = v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (rows: Cell[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

/** One row per step attempt, the shape most IEP data sheets expect (FR-4.4). */
export function sessionsToCsv(data: AppData, learner: Learner): string {
  const header = [
    'learner',
    'date',
    'routine',
    'step_number',
    'step',
    'prompt_level',
    'redirected_taps',
    'seconds',
    'calm_break_during_step',
    'peak_hr',
    'session_completed',
  ];
  const rows = data.sessions
    .filter((s) => s.learnerId === learner.id)
    .sort((a, b) => a.startedAt - b.startedAt)
    .flatMap((s) => {
      const routine = data.routines.find((r) => r.id === s.routineId);
      return s.steps.map((log): Cell[] => {
        const index = routine?.steps.findIndex((st) => st.id === log.stepId) ?? -1;
        const step = index >= 0 ? routine!.steps[index] : undefined;
        return [
          learner.name,
          localIsoDate(s.startedAt),
          routine?.title ?? '(deleted routine)',
          step ? index + 1 : '',
          step?.instruction ?? '(deleted step)',
          PROMPT_LABELS[log.promptLevel],
          log.wrongTaps,
          (log.durationMs / 1000).toFixed(1),
          log.calmDuringStep,
          log.peakHr,
          s.completed,
        ];
      });
    });
  return toCsv([header, ...rows]);
}

export function realWorldToCsv(data: AppData, learner: Learner): string {
  const header = ['learner', 'date', 'routine', 'place', 'result', 'note'];
  const rows = data.realWorldChecks
    .filter((c) => c.learnerId === learner.id)
    .sort((a, b) => a.at - b.at)
    .map((c): Cell[] => [
      learner.name,
      localIsoDate(c.at),
      data.routines.find((r) => r.id === c.routineId)?.title ?? '(deleted routine)',
      c.place,
      REAL_WORLD_LABELS[c.result],
      c.note,
    ]);
  return toCsv([header, ...rows]);
}

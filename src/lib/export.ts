import type { AppData, Learner } from './types';
import { PROMPT_LABELS } from './types';

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number | boolean | undefined) => {
  const s = v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per step attempt, the shape most IEP data sheets expect. */
export function sessionsToCsv(data: AppData, learner: Learner): string {
  const header = [
    'learner', 'date', 'routine', 'step_number', 'step', 'prompt_level', 'redirected_taps',
    'seconds', 'calm_break_during_step', 'peak_hr', 'session_completed',
  ];
  const rows = data.sessions
    .filter((s) => s.learnerId === learner.id)
    .sort((a, b) => a.startedAt - b.startedAt)
    .flatMap((s) => {
      const routine = data.routines.find((r) => r.id === s.routineId);
      return s.steps.map((log) => {
        const index = routine?.steps.findIndex((st) => st.id === log.stepId) ?? -1;
        return [
          learner.name,
          new Date(s.startedAt).toISOString().slice(0, 10),
          routine?.title ?? '(deleted routine)',
          index >= 0 ? index + 1 : '',
          index >= 0 ? routine!.steps[index].instruction : '(deleted step)',
          PROMPT_LABELS[log.promptLevel],
          log.wrongTaps,
          (log.durationMs / 1000).toFixed(1),
          log.calmDuringStep,
          log.peakHr,
          s.completed,
        ];
      });
    });
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(data: AppData, learner: Learner) {
  const date = new Date().toISOString().slice(0, 10);
  download(`lifesync-${learner.name.toLowerCase()}-${date}.csv`, sessionsToCsv(data, learner), 'text/csv');
}

export function downloadBackup(data: AppData) {
  const date = new Date().toISOString().slice(0, 10);
  download(`lifesync-backup-${date}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export function isAppData(value: unknown): value is AppData {
  const v = value as AppData;
  return Boolean(v && v.version === 1 && Array.isArray(v.learners) && Array.isArray(v.routines) && Array.isArray(v.sessions));
}

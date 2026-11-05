import { realWorldToCsv, sessionsToCsv } from '../domain/csv';
import { localIsoDate } from '../domain/dates';
import type { AppData, Learner } from '../domain/types';

// Browser file downloads. The content itself is built by pure functions in domain/csv.ts.

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const today = () => localIsoDate();
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function downloadSessionsCsv(data: AppData, learner: Learner) {
  download(`lifesync-${slug(learner.name)}-practice-${today()}.csv`, sessionsToCsv(data, learner), 'text/csv');
}

export function downloadRealWorldCsv(data: AppData, learner: Learner) {
  download(`lifesync-${slug(learner.name)}-real-world-${today()}.csv`, realWorldToCsv(data, learner), 'text/csv');
}

export function downloadBackup(data: AppData) {
  download(`lifesync-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

import { describe, expect, it } from 'vitest';
import { csvCell, realWorldToCsv, sessionsToCsv } from './csv';
import { localIsoDate } from './dates';
import { parseHeartRate } from './heartRate';
import { appData, learner, session, stepLog } from './testData';

describe('csvCell', () => {
  it('quotes values that contain commas, quotes or newlines', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('sessionsToCsv', () => {
  it('writes one row per step attempt with readable prompt levels', () => {
    const data = appData({
      sessions: [
        session({
          startedAt: new Date(2026, 10, 4, 21, 30).getTime(),
          steps: [stepLog('s1', { promptLevel: 1, wrongTaps: 2, durationMs: 4500 })],
        }),
      ],
    });
    const [header, row] = sessionsToCsv(data, learner()).split('\n');
    expect(header.split(',')).toContain('prompt_level');
    expect(row).toBe('Alex,2026-11-04,Test routine,1,Do s1,Delayed,2,4.5,false,,true');
  });

  it('only includes the chosen learner', () => {
    const data = appData({ sessions: [session({ learnerId: 'someone-else' })] });
    expect(sessionsToCsv(data, learner()).split('\n')).toHaveLength(1);
  });
});

describe('realWorldToCsv', () => {
  it('writes each check-in with its result label', () => {
    const data = appData({
      realWorldChecks: [
        {
          id: 'c',
          learnerId: 'l1',
          routineId: 'r1',
          at: new Date(2026, 10, 1, 12).getTime(),
          place: 'Home',
          result: 'with-help',
          note: 'Needed a reminder',
        },
      ],
    });
    expect(realWorldToCsv(data, learner()).split('\n')[1]).toBe(
      'Alex,2026-11-01,Test routine,Home,Did it with help,Needed a reminder',
    );
  });
});

describe('localIsoDate', () => {
  it('uses the local calendar day, even late in the evening', () => {
    expect(localIsoDate(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04');
    expect(localIsoDate(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});

describe('parseHeartRate', () => {
  it('reads 8-bit and 16-bit heart rate values', () => {
    expect(parseHeartRate(new DataView(new Uint8Array([0x00, 72]).buffer))).toBe(72);
    expect(parseHeartRate(new DataView(new Uint8Array([0x01, 0x2c, 0x01]).buffer))).toBe(300);
  });
});

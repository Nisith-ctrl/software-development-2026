import { describe, expect, it } from 'vitest';
import { checkStress, INITIAL_STRESS, type StressMonitor } from './stress';

const settings = { threshold: 110, sustainSeconds: 5 };

/** Feeds one reading per second and returns the seconds at which the calm screen fired. */
function run(readings: number[], active = true) {
  let monitor: StressMonitor = INITIAL_STRESS;
  const fired: number[] = [];
  readings.forEach((bpm, second) => {
    const r = checkStress(monitor, bpm, second * 1000, settings, active);
    monitor = r.monitor;
    if (r.trigger) fired.push(second);
  });
  return fired;
}

describe('checkStress', () => {
  it('never fires below the threshold', () => {
    expect(run([80, 95, 109, 109, 109, 109, 109, 109])).toEqual([]);
  });

  it('fires once heart rate has stayed high for the full hold time', () => {
    expect(run([90, 115, 116, 118, 117, 119, 120])).toEqual([6]);
  });

  it('ignores a brief spike', () => {
    expect(run([115, 118, 90, 115, 116, 95, 90])).toEqual([]);
  });

  it('does not fire again until heart rate drops below the threshold', () => {
    const high = Array(14).fill(120);
    expect(run(high)).toEqual([5]);
    expect(run([...Array(6).fill(120), 90, ...Array(6).fill(120)])).toEqual([5, 12]);
  });

  it('does nothing while inactive (no step on screen or already on a break)', () => {
    expect(run(Array(10).fill(130), false)).toEqual([]);
  });
});

/**
 * Decides when rising heart rate should pause a routine (requirement FR-3.2).
 *
 * The calm screen opens only after heart rate has stayed at or above the
 * learner's threshold for their full hold time, so one noisy reading doesn't
 * interrupt practice. After it fires, it stays disarmed until heart rate drops
 * back under the threshold, so it can't fire again the moment a break ends.
 */

export interface StressSettings {
  threshold: number;
  sustainSeconds: number;
}

export interface StressMonitor {
  aboveSince: number | null;
  armed: boolean;
}

export const INITIAL_STRESS: StressMonitor = { aboveSince: null, armed: true };

export function checkStress(
  monitor: StressMonitor,
  bpm: number,
  now: number,
  settings: StressSettings,
  /** False while there's no step on screen or a break is already open. */
  active: boolean,
): { monitor: StressMonitor; trigger: boolean } {
  if (bpm < settings.threshold) {
    return { monitor: INITIAL_STRESS, trigger: false };
  }
  if (!active || !monitor.armed) {
    return { monitor: { ...monitor, aboveSince: null }, trigger: false };
  }
  const aboveSince = monitor.aboveSince ?? now;
  if (now - aboveSince >= settings.sustainSeconds * 1000) {
    return { monitor: { aboveSince: null, armed: false }, trigger: true };
  }
  return { monitor: { aboveSince, armed: true }, trigger: false };
}

import type { PromptLevel, PromptState, StepLog } from './types';

export const START_STATE: PromptState = { level: 3, streak: 0 };

/** Clean completions needed at a level before help fades one level. */
export const FADE_AFTER = 2;
/** Redirected taps in one attempt that bring back one level of help. */
export const BUMP_AT_WRONG_TAPS = 2;

/**
 * Most-to-least prompting: start with full help, fade it as the learner shows
 * they can do the step, and bring it back as soon as they struggle.
 */
export function nextPromptState(prev: PromptState | undefined, log: StepLog): PromptState {
  const state = prev ?? START_STATE;

  if (log.calmDuringStep || log.wrongTaps >= BUMP_AT_WRONG_TAPS) {
    return { level: Math.min(3, state.level + 1) as PromptLevel, streak: 0 };
  }

  if (log.wrongTaps > 0) {
    return { level: state.level, streak: 0 };
  }

  const streak = state.streak + 1;
  if (streak >= FADE_AFTER && state.level > 0) {
    return { level: (state.level - 1) as PromptLevel, streak: 0 };
  }
  return { level: state.level, streak: Math.min(streak, FADE_AFTER) };
}

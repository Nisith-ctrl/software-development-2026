import type { CalmEvent, Choice, PromptLevel, Routine, StepLog } from './types';

/**
 * State machine for one practice session (requirements FR-2.x, FR-3.x).
 *
 *   first-then ──start──▶ step ──correct tap──▶ reward ──advance──▶ step … ──▶ done
 *                          │  ▲
 *                 open-calm│  │close-calm   (calm can open from any step, pauses the clock)
 *                          ▼  │
 *                         calm overlay
 *
 * Pure and framework-free so every transition is unit tested.
 */

export type Phase = 'first-then' | 'step' | 'reward' | 'done';

export interface PlannedStep {
  stepId: string;
  instruction: string;
  emoji: string;
  mediaId?: string;
  mediaKind?: 'image' | 'video';
  level: PromptLevel;
  choices: Choice[];
}

export interface CalmState {
  trigger: CalmEvent['trigger'];
  at: number;
  hr?: number;
}

export interface SessionState {
  phase: Phase;
  index: number;
  plan: PlannedStep[];
  stepStartedAt: number;
  wrongTaps: number;
  faded: string[];
  hintShown: boolean;
  calmDuringStep: boolean;
  peakHr: number;
  calm: CalmState | null;
  logs: StepLog[];
  calmEvents: CalmEvent[];
}

export type SessionAction =
  | { type: 'start'; now: number }
  | { type: 'tap'; choiceId: string; now: number }
  | { type: 'advance'; now: number }
  | { type: 'reveal-hint' }
  | { type: 'heart-rate'; bpm: number }
  | { type: 'open-calm'; trigger: CalmEvent['trigger']; hr?: number; now: number }
  | { type: 'close-calm'; now: number };

/** Prompt levels Full (3) and Highlight (2) show the target from the start. */
export const hintVisibleAtStart = (level: PromptLevel) => level >= 2;

/** At Full help only the correct choice can be tapped, which makes errors impossible. */
export const isLockedOut = (level: PromptLevel, choice: Choice) => level === 3 && !choice.correct;

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Freezes prompt levels and choice order at the start of a session so nothing
 * shifts under the learner mid-routine. Choice order is shuffled to avoid
 * position bias (always tapping the left button).
 */
export function buildPlan(
  routine: Routine,
  levelFor: (stepId: string) => PromptLevel,
  order: (choices: Choice[]) => Choice[] = shuffle,
): PlannedStep[] {
  return routine.steps.map((s) => ({
    stepId: s.id,
    instruction: s.instruction,
    emoji: s.emoji,
    mediaId: s.mediaId,
    mediaKind: s.mediaKind,
    level: levelFor(s.id),
    choices: order(s.choices),
  }));
}

export function createSession(plan: PlannedStep[]): SessionState {
  return {
    phase: 'first-then',
    index: 0,
    plan,
    stepStartedAt: 0,
    wrongTaps: 0,
    faded: [],
    hintShown: false,
    calmDuringStep: false,
    peakHr: 0,
    calm: null,
    logs: [],
    calmEvents: [],
  };
}

function enterStep(state: SessionState, index: number, now: number): SessionState {
  return {
    ...state,
    phase: 'step',
    index,
    stepStartedAt: now,
    wrongTaps: 0,
    faded: [],
    hintShown: hintVisibleAtStart(state.plan[index].level),
    calmDuringStep: false,
    peakHr: 0,
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'start':
      if (state.phase !== 'first-then' || state.plan.length === 0) return state;
      return enterStep(state, 0, action.now);

    case 'tap': {
      if (state.phase !== 'step' || state.calm) return state;
      const current = state.plan[state.index];
      const choice = current.choices.find((c) => c.id === action.choiceId);
      if (!choice || isLockedOut(current.level, choice)) return state;

      if (!choice.correct) {
        // Errorless correction: no error feedback, the target is revealed instead.
        return {
          ...state,
          wrongTaps: state.wrongTaps + 1,
          faded: state.faded.includes(choice.id) ? state.faded : [...state.faded, choice.id],
          hintShown: true,
        };
      }

      const log: StepLog = {
        stepId: current.stepId,
        promptLevel: current.level,
        wrongTaps: state.wrongTaps,
        durationMs: action.now - state.stepStartedAt,
        calmDuringStep: state.calmDuringStep,
        peakHr: state.peakHr || undefined,
      };
      return { ...state, phase: 'reward', logs: [...state.logs, log] };
    }

    case 'advance':
      if (state.phase !== 'reward') return state;
      return state.index + 1 < state.plan.length
        ? enterStep(state, state.index + 1, action.now)
        : { ...state, phase: 'done' };

    case 'reveal-hint':
      return state.phase === 'step' ? { ...state, hintShown: true } : state;

    case 'heart-rate':
      return state.phase === 'step' ? { ...state, peakHr: Math.max(state.peakHr, action.bpm) } : state;

    case 'open-calm':
      if (state.calm || state.phase === 'done') return state;
      return {
        ...state,
        calm: { trigger: action.trigger, at: action.now, hr: action.hr },
        calmDuringStep: state.calmDuringStep || state.phase === 'step',
      };

    case 'close-calm': {
      if (!state.calm) return state;
      const durationMs = action.now - state.calm.at;
      const event: CalmEvent = {
        at: state.calm.at,
        stepId: state.phase === 'step' ? state.plan[state.index].stepId : undefined,
        trigger: state.calm.trigger,
        hr: state.calm.hr,
        durationMs,
      };
      return {
        ...state,
        calm: null,
        calmEvents: [...state.calmEvents, event],
        // Break time doesn't count toward how long the step took.
        stepStartedAt: state.stepStartedAt + durationMs,
      };
    }
  }
}

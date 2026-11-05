/** 3 = most help (Full), 0 = no help (Independent). */
export type PromptLevel = 0 | 1 | 2 | 3;

export const PROMPT_LABELS: Record<PromptLevel, string> = {
  3: 'Full',
  2: 'Highlight',
  1: 'Delayed',
  0: 'Independent',
};

export type CalmTool = 'breathing' | 'pressure' | 'music';
export type RewardStyle = 'tokens' | 'interest' | 'chime';
export type RoutineCategory = 'daily-living' | 'social' | 'academic' | 'community';

export const CATEGORY_LABELS: Record<RoutineCategory, string> = {
  'daily-living': 'Daily living',
  social: 'Social',
  academic: 'Academic',
  community: 'Out and about',
};

export interface Learner {
  id: string;
  name: string;
  avatar: string;
  rewardStyle: RewardStyle;
  /** Emoji used for the special-interest reward animation. */
  interestEmoji: string;
  tokensPerReward: number;
  calmTools: CalmTool[];
  /** Heart rate (bpm) that counts as rising stress for this learner. */
  hrThreshold: number;
  /** How long HR must stay at or above the threshold before the calm screen opens. */
  hrSustainSeconds: number;
  /** Minimum time on the calm screen before "I'm ready" unlocks. */
  calmMinSeconds: number;
  readAloud: boolean;
  tokens: number;
}

export interface Choice {
  id: string;
  label: string;
  emoji: string;
  correct: boolean;
}

export interface Step {
  id: string;
  instruction: string;
  emoji: string;
  mediaId?: string;
  mediaKind?: 'image' | 'video';
  choices: Choice[];
}

export interface Routine {
  id: string;
  title: string;
  emoji: string;
  category: RoutineCategory;
  thenReward: string;
  thenEmoji: string;
  steps: Step[];
  assignedTo: string[];
  updatedAt: number;
}

export interface StepLog {
  stepId: string;
  promptLevel: PromptLevel;
  /** Taps on a choice other than the target. Shown as "redirects", never as errors to the learner. */
  wrongTaps: number;
  durationMs: number;
  calmDuringStep: boolean;
  peakHr?: number;
}

export interface CalmEvent {
  at: number;
  stepId?: string;
  trigger: 'heart-rate' | 'manual';
  hr?: number;
  durationMs: number;
}

export interface Session {
  id: string;
  learnerId: string;
  routineId: string;
  startedAt: number;
  endedAt?: number;
  completed: boolean;
  steps: StepLog[];
  calmEvents: CalmEvent[];
}

export type RealWorldResult = 'independent' | 'with-help' | 'not-yet';

export const REAL_WORLD_LABELS: Record<RealWorldResult, string> = {
  independent: 'Did it on their own',
  'with-help': 'Did it with help',
  'not-yet': 'Not yet',
};

/**
 * A grown-up's note of how the learner did the routine in the real place.
 * Comparing these with in-app progress is how LifeSync measures the generalization gap.
 */
export interface RealWorldCheck {
  id: string;
  learnerId: string;
  routineId: string;
  at: number;
  place: string;
  result: RealWorldResult;
  note: string;
}

export interface PromptState {
  level: PromptLevel;
  /** Clean completions in a row at the current level. */
  streak: number;
}

export const DATA_VERSION = 2;

export interface AppData {
  version: typeof DATA_VERSION;
  learners: Learner[];
  routines: Routine[];
  sessions: Session[];
  /** Keyed by `${learnerId}:${stepId}`. */
  prompts: Record<string, PromptState>;
  realWorldChecks: RealWorldCheck[];
}

export const promptKey = (learnerId: string, stepId: string) => `${learnerId}:${stepId}`;

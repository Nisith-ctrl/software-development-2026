import type { Learner, Routine } from './types';

/** Problems that would make a routine confusing or unplayable (requirement FR-1.4). */
export function validateRoutine(routine: Routine): string[] {
  const errors: string[] = [];
  if (!routine.title.trim()) errors.push('Give the routine a name.');
  if (!routine.thenReward.trim()) errors.push('Add a "Then" reward so the learner knows what comes after.');
  if (routine.steps.length === 0) errors.push('Add at least one step.');

  routine.steps.forEach((step, i) => {
    const n = i + 1;
    if (!step.instruction.trim()) errors.push(`Step ${n}: say what the learner does.`);
    if (step.choices.length < 2) errors.push(`Step ${n}: add at least two choices.`);
    const correct = step.choices.filter((c) => c.correct).length;
    if (correct !== 1) errors.push(`Step ${n}: mark exactly one right choice.`);
    if (step.choices.some((c) => !c.label.trim())) errors.push(`Step ${n}: every choice needs a label.`);
  });
  return errors;
}

export function validateLearner(learner: Learner): string[] {
  const errors: string[] = [];
  if (!learner.name.trim()) errors.push('Add a name.');
  if (learner.calmTools.length === 0) errors.push('Pick at least one calm tool.');
  if (learner.hrThreshold < 70 || learner.hrThreshold > 200)
    errors.push('Heart-rate threshold should be between 70 and 200 bpm.');
  if (learner.hrSustainSeconds < 1) errors.push('Hold time should be at least 1 second.');
  if (learner.tokensPerReward < 2 || learner.tokensPerReward > 10)
    errors.push('Token board should have 2 to 10 tokens.');
  return errors;
}

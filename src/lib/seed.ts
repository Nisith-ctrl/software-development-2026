import { nextPromptState } from './adaptive';
import type { AppData, Choice, Learner, PromptLevel, Routine, Session, Step } from './types';
import { promptKey } from './types';

const c = (id: string, label: string, emoji: string, correct = false): Choice => ({ id, label, emoji, correct });

const step = (id: string, instruction: string, emoji: string, choices: Choice[]): Step => ({
  id,
  instruction,
  emoji,
  choices,
});

const sam: Learner = {
  id: 'learner_sam',
  name: 'Sam',
  avatar: '🦖',
  rewardStyle: 'interest',
  interestEmoji: '🚂',
  tokensPerReward: 5,
  calmTools: ['breathing', 'pressure', 'music'],
  hrThreshold: 110,
  hrSustainSeconds: 5,
  calmMinSeconds: 20,
  readAloud: true,
  tokens: 3,
};

const maya: Learner = {
  id: 'learner_maya',
  name: 'Maya',
  avatar: '🦋',
  rewardStyle: 'tokens',
  interestEmoji: '⭐',
  tokensPerReward: 4,
  calmTools: ['breathing', 'music'],
  hrThreshold: 115,
  hrSustainSeconds: 6,
  calmMinSeconds: 30,
  readAloud: false,
  tokens: 0,
};

const brushTeeth: Routine = {
  id: 'routine_teeth',
  title: 'Brush my teeth',
  emoji: '🪥',
  category: 'daily-living',
  thenReward: 'Tablet time',
  thenEmoji: '📱',
  assignedTo: [sam.id, maya.id],
  updatedAt: 0,
  steps: [
    step('teeth_1', 'Go to the bathroom sink.', '🚰', [
      c('a', 'Bathroom sink', '🚰', true),
      c('b', 'Kitchen', '🍳'),
    ]),
    step('teeth_2', 'Put a small dot of toothpaste on the brush.', '🪥', [
      c('a', 'Toothpaste', '🧴', true),
      c('b', 'Soap', '🧼'),
    ]),
    step('teeth_3', 'Brush the top teeth. Count to 10.', '😁', [
      c('a', 'Brush top teeth', '⬆️', true),
      c('b', 'Rinse now', '💧'),
    ]),
    step('teeth_4', 'Brush the bottom teeth. Count to 10.', '😬', [
      c('a', 'Brush bottom teeth', '⬇️', true),
      c('b', 'Put brush away', '📦'),
    ]),
    step('teeth_5', 'Spit and rinse with water.', '💧', [
      c('a', 'Spit and rinse', '💧', true),
      c('b', 'Swallow', '🙅'),
    ]),
    step('teeth_6', 'Put the brush back in the cup.', '🥤', [
      c('a', 'Brush in the cup', '🥤', true),
      c('b', 'Leave it on the sink', '🚰'),
    ]),
  ],
};

const grocery: Routine = {
  id: 'routine_grocery',
  title: 'Pay at the grocery store',
  emoji: '🛒',
  category: 'community',
  thenReward: 'Pick a snack',
  thenEmoji: '🍎',
  assignedTo: [sam.id],
  updatedAt: 0,
  steps: [
    step('shop_1', 'Find a checkout line with a light on.', '💡', [
      c('a', 'Line with light on', '💡', true),
      c('b', 'Line with light off', '⚫'),
      c('c', 'Leave the store', '🚪'),
    ]),
    step('shop_2', 'Wait behind the person in front of you.', '🧍', [
      c('a', 'Wait my turn', '⏳', true),
      c('b', 'Go to the front', '⏩'),
    ]),
    step('shop_3', 'Put your items on the moving belt.', '🧺', [
      c('a', 'Items on the belt', '🧺', true),
      c('b', 'Keep items in the cart', '🛒'),
    ]),
    step('shop_4', 'Say "Hi" to the cashier.', '👋', [
      c('a', '"Hi!"', '👋', true),
      c('b', 'Look away', '🙈'),
    ]),
    step('shop_5', 'Tap your card on the reader when the screen says so.', '💳', [
      c('a', 'Tap the card', '💳', true),
      c('b', 'Put card away', '👛'),
    ]),
    step('shop_6', 'Take your bag and say "Thank you".', '🛍️', [
      c('a', 'Bag and "Thank you"', '🛍️', true),
      c('b', 'Leave the bag', '🚶'),
    ]),
  ],
};

const greeting: Routine = {
  id: 'routine_greeting',
  title: 'Say hello to a classmate',
  emoji: '👋',
  category: 'social',
  thenReward: 'Free choice time',
  thenEmoji: '🧩',
  assignedTo: [sam.id, maya.id],
  updatedAt: 0,
  steps: [
    step('hello_1', 'You see a classmate in the hallway.', '🏫', [
      c('a', 'Look at their face', '🙂', true),
      c('b', 'Walk past fast', '🏃'),
    ]),
    step('hello_2', 'Wave and say "Hi, [name]!"', '👋', [
      c('a', 'Wave and say hi', '👋', true),
      c('b', 'Say nothing', '😶'),
    ]),
    step('hello_3', 'Wait for them to answer.', '⏳', [
      c('a', 'Wait and listen', '👂', true),
      c('b', 'Walk away', '🚶'),
    ]),
    step('hello_4', 'Smile and keep walking to class.', '🚪', [
      c('a', 'Smile, go to class', '😊', true),
      c('b', 'Stop in the hallway', '🛑'),
    ]),
  ],
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Two weeks of plausible history for Sam so the dashboard has something to show.
 * Prompt states are replayed through the same rules the player uses.
 */
function demoHistory(learner: Learner, routines: Routine[], now: number) {
  const sessions: Session[] = [];
  const prompts: AppData['prompts'] = {};
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const plan: Array<[Routine, number]> = [
    [routines[0], 13], [routines[2], 12], [routines[0], 11], [routines[1], 10],
    [routines[0], 9], [routines[2], 8], [routines[0], 7], [routines[1], 6],
    [routines[0], 5], [routines[2], 4], [routines[1], 3], [routines[0], 2],
    [routines[1], 1],
  ];

  plan.forEach(([routine, daysAgo], i) => {
    const startedAt = now - daysAgo * DAY + 8 * 60 * 60 * 1000;
    let t = startedAt;
    const calmEvents: Session['calmEvents'] = [];
    const steps = routine.steps.map((s) => {
      const key = promptKey(learner.id, s.id);
      const level: PromptLevel = (prompts[key] ?? { level: 3 }).level;
      const hardStep = s.id === 'shop_4' || s.id === 'hello_2';
      const wrongTaps = level === 3 ? 0 : hardStep ? (rand() < 0.6 ? 2 : 1) : rand() < 0.15 ? 1 : 0;
      const calmDuringStep = routine.id === 'routine_grocery' && hardStep && i < 8;
      const durationMs = Math.round((hardStep ? 9000 : 4000) + rand() * 5000 + wrongTaps * 2500);
      t += durationMs;
      if (calmDuringStep) {
        const calmMs = 45000 + Math.round(rand() * 30000);
        calmEvents.push({ at: t, stepId: s.id, trigger: 'heart-rate', hr: 118 + Math.round(rand() * 10), durationMs: calmMs });
        t += calmMs;
      }
      const log = { stepId: s.id, promptLevel: level, wrongTaps, durationMs, calmDuringStep, peakHr: 84 + Math.round(rand() * 20) };
      prompts[key] = nextPromptState(prompts[key], log);
      return log;
    });
    sessions.push({
      id: `session_demo_${i}`,
      learnerId: learner.id,
      routineId: routine.id,
      startedAt,
      endedAt: t,
      completed: true,
      steps,
      calmEvents,
    });
  });

  return { sessions, prompts };
}

export function createSeedData(now = Date.now()): AppData {
  const routines = [brushTeeth, grocery, greeting].map((r) => ({ ...r, updatedAt: now }));
  const { sessions, prompts } = demoHistory(sam, routines, now);
  return {
    version: 1,
    learners: [sam, maya],
    routines,
    sessions,
    prompts,
  };
}

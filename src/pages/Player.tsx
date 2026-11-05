import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalmDown } from '../components/CalmDown';
import { HoldButton } from '../components/HoldButton';
import { MediaView } from '../components/MediaView';
import { InterestFloat, StepReward, TokenBoard } from '../components/Reward';
import { playChime, speak } from '../lib/audio';
import { useHeartRate } from '../lib/heartRate';
import { newId } from '../lib/id';
import { useStore } from '../lib/store';
import type { CalmEvent, Choice, PromptLevel, StepLog } from '../lib/types';

type Phase = 'first-then' | 'step' | 'reward' | 'done';

const DELAYED_HINT_MS = 5000;
const REWARD_MS = 1800;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Player() {
  const { learnerId, routineId } = useParams();
  const navigate = useNavigate();
  const { data, promptFor, recordSession, saveLearner } = useStore();
  const hr = useHeartRate();

  const learner = data.learners.find((l) => l.id === learnerId);
  const routine = data.routines.find((r) => r.id === routineId);

  // Snapshot prompt levels and choice order once, so nothing shifts mid-routine.
  const plan = useMemo(
    () =>
      routine?.steps.map((s) => ({
        step: s,
        level: (learner ? promptFor(learner.id, s.id).level : 3) as PromptLevel,
        choices: shuffle(s.choices),
      })) ?? [],
    [routine?.id, learner?.id],
  );

  const [phase, setPhase] = useState<Phase>('first-then');
  const [index, setIndex] = useState(0);
  const [faded, setFaded] = useState<string[]>([]);
  const [hintShown, setHintShown] = useState(false);
  const [calm, setCalm] = useState<null | { trigger: CalmEvent['trigger']; at: number; hr?: number }>(null);
  const [tokens, setTokens] = useState(learner?.tokens ?? 0);

  const session = useRef({ id: newId('session'), startedAt: Date.now(), logs: [] as StepLog[], calmEvents: [] as CalmEvent[] });
  const stepRef = useRef({ startedAt: 0, wrongTaps: 0, calmDuringStep: false, peakHr: 0 });
  const hrAboveSince = useRef<number | null>(null);
  const hrArmed = useRef(true);
  const saved = useRef(false);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const current = plan[index];

  // Start the clock for each step and read it aloud if the learner uses that.
  useEffect(() => {
    if (phase !== 'step' || !current) return;
    stepRef.current = { startedAt: Date.now(), wrongTaps: 0, calmDuringStep: false, peakHr: 0 };
    setFaded([]);
    setHintShown(current.level >= 2);
    if (learner?.readAloud) speak(current.step.instruction);
    if (current.level === 1) {
      const t = window.setTimeout(() => setHintShown(true), DELAYED_HINT_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase, index]);

  // Bio-responsive pause: sustained heart rate above the learner's threshold opens the calm screen.
  useEffect(() => {
    if (!learner || hr.bpm === null) return;
    if (phase === 'step') stepRef.current.peakHr = Math.max(stepRef.current.peakHr, hr.bpm);
    if (hr.bpm < learner.hrThreshold) {
      hrAboveSince.current = null;
      hrArmed.current = true;
      return;
    }
    if (phase !== 'step' || calm || !hrArmed.current) return;
    hrAboveSince.current ??= Date.now();
    if (Date.now() - hrAboveSince.current >= learner.hrSustainSeconds * 1000) {
      hrArmed.current = false; // re-arms once heart rate comes back under the threshold
      openCalm('heart-rate', hr.bpm);
    }
  }, [hr.bpm]);

  useEffect(() => {
    if (phase !== 'done') return;
    finishSession(true);
    if (learner?.rewardStyle !== 'interest') playChime();
  }, [phase]);

  if (!learner || !routine) {
    return (
      <main className="page narrow">
        <p>That routine isn't available.</p>
        <Link to="/">Back to start</Link>
      </main>
    );
  }

  const openCalm = (trigger: CalmEvent['trigger'], bpm?: number) => {
    window.speechSynthesis?.cancel();
    stepRef.current.calmDuringStep = phase === 'step';
    setCalm({ trigger, at: Date.now(), hr: bpm });
  };

  const closeCalm = () => {
    if (!calm) return;
    const durationMs = Date.now() - calm.at;
    session.current.calmEvents.push({
      at: calm.at,
      stepId: phase === 'step' ? current?.step.id : undefined,
      trigger: calm.trigger,
      hr: calm.hr,
      durationMs,
    });
    stepRef.current.startedAt += durationMs; // break time doesn't count toward the step
    setCalm(null);
  };

  const finishSession = (completed: boolean) => {
    if (saved.current) return;
    saved.current = true;
    if (session.current.logs.length === 0) return;
    recordSession({
      id: session.current.id,
      learnerId: learner.id,
      routineId: routine.id,
      startedAt: session.current.startedAt,
      endedAt: Date.now(),
      completed,
      steps: session.current.logs,
      calmEvents: session.current.calmEvents,
    });
    saveLearner({ ...learner, tokens: tokensRef.current });
  };
  const tapChoice = (choice: Choice) => {
    if (!current || phase !== 'step') return;
    if (!choice.correct) {
      // Errorless correction: no "wrong" feedback, the target is simply shown.
      stepRef.current.wrongTaps += 1;
      setFaded((f) => (f.includes(choice.id) ? f : [...f, choice.id]));
      setHintShown(true);
      return;
    }
    const s = stepRef.current;
    session.current.logs.push({
      stepId: current.step.id,
      promptLevel: current.level,
      wrongTaps: s.wrongTaps,
      durationMs: Date.now() - s.startedAt,
      calmDuringStep: s.calmDuringStep,
      peakHr: s.peakHr || undefined,
    });
    setTokens((t) => t + 1);
    setPhase('reward');
    window.setTimeout(() => {
      if (index + 1 < plan.length) {
        setIndex(index + 1);
        setPhase('step');
      } else {
        setPhase('done');
      }
    }, REWARD_MS);
  };

  const exit = () => {
    finishSession(false);
    navigate(`/learn/${learner.id}`);
  };


  return (
    <main className="player">
      <header className="player-bar">
        <HoldButton onHold={exit} className="player-exit">
          Hold to exit
        </HoldButton>
        {phase !== 'first-then' && phase !== 'done' && (
          <ol className="progress-dots" aria-label={`Step ${index + 1} of ${plan.length}`}>
            {plan.map((p, i) => (
              <li key={p.step.id} className={i < index || (i === index && phase === 'reward') ? 'is-done' : i === index ? 'is-now' : ''} />
            ))}
          </ol>
        )}
        {phase === 'step' && (
          <button type="button" className="break-button" onClick={() => openCalm('manual')}>
            <span aria-hidden>🌙</span> I need a break
          </button>
        )}
      </header>

      {phase === 'first-then' && (
        <section className="first-then">
          <div className="ft-card">
            <span className="ft-label">First</span>
            <span className="ft-emoji" aria-hidden>{routine.emoji}</span>
            <span className="ft-title">{routine.title}</span>
          </div>
          <span className="ft-arrow" aria-hidden>→</span>
          <div className="ft-card is-then">
            <span className="ft-label">Then</span>
            <span className="ft-emoji" aria-hidden>{routine.thenEmoji}</span>
            <span className="ft-title">{routine.thenReward}</span>
          </div>
          <button type="button" className="big-button" onClick={() => setPhase('step')}>
            Start
          </button>
        </section>
      )}

      {(phase === 'step' || phase === 'reward') && current && (
        <section className="step-view" aria-live="polite">
          <div className="now-next">
            <span className="now-tag">Now</span>
            {plan[index + 1] ? (
              <span className="next-tag">
                Next: <span aria-hidden>{plan[index + 1].step.emoji}</span> {plan[index + 1].step.instruction}
              </span>
            ) : (
              <span className="next-tag">
                Then: <span aria-hidden>{routine.thenEmoji}</span> {routine.thenReward}
              </span>
            )}
          </div>

          <MediaView
            mediaId={current.step.mediaId}
            kind={current.step.mediaKind}
            emoji={current.step.emoji}
            alt={current.step.instruction}
            className="step-media"
          />

          <div className="instruction-row">
            <h1 className="instruction">{current.step.instruction}</h1>
            <button type="button" className="icon-button" onClick={() => speak(current.step.instruction)} aria-label="Read aloud">
              🔊
            </button>
          </div>

          {phase === 'reward' ? (
            <StepReward learner={learner} tokens={tokens} />
          ) : (
            <div className="choices" role="group" aria-label="Choose what to do">
              {current.choices.map((choice) => {
                const lockedOut = current.level === 3 && !choice.correct;
                const isTarget = choice.correct && hintShown;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={[
                      'choice',
                      isTarget ? (current.level === 3 ? 'is-target-full' : 'is-target') : '',
                      faded.includes(choice.id) || lockedOut ? 'is-faded' : '',
                    ].join(' ')}
                    disabled={lockedOut}
                    onClick={() => tapChoice(choice)}
                  >
                    <span className="choice-emoji" aria-hidden>{choice.emoji}</span>
                    <span>{choice.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {phase === 'done' && (
        <section className="done-view">
          {learner.rewardStyle === 'interest' && <InterestFloat emoji={learner.interestEmoji} />}
          <h1>You did it, {learner.name}!</h1>
          <p className="done-sub">You finished “{routine.title}”.</p>
          {learner.rewardStyle === 'tokens' && (
            <TokenBoard filled={tokens % learner.tokensPerReward || learner.tokensPerReward} total={learner.tokensPerReward} />
          )}
          <div className="ft-card is-then">
            <span className="ft-label">Now it's time for</span>
            <span className="ft-emoji" aria-hidden>{routine.thenEmoji}</span>
            <span className="ft-title">{routine.thenReward}</span>
          </div>
          <Link className="button big-button" to={`/learn/${learner.id}`}>
            Back to my routines
          </Link>
        </section>
      )}

      {calm && <CalmDown tools={learner.calmTools} minSeconds={learner.calmMinSeconds} onReady={closeCalm} />}

      {hr.source === 'simulator' && <SimulatorDock threshold={learner.hrThreshold} />}
    </main>
  );
}

/** Small grown-up panel for demoing the heart-rate trigger without a wearable. */
function SimulatorDock({ threshold }: { threshold: number }) {
  const hr = useHeartRate();
  const [open, setOpen] = useState(false);
  return (
    <aside className={`sim-dock ${open ? 'is-open' : ''}`} aria-label="Heart-rate simulator">
      <button type="button" className="sim-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        ♥ {hr.bpm ?? '--'}
      </button>
      {open && (
        <div className="sim-body">
          <label>
            Simulated heart rate: {hr.simTarget} bpm
            <input type="range" min={60} max={150} value={hr.simTarget} onChange={(e) => hr.setSimTarget(Number(e.target.value))} />
          </label>
          <p className="muted small">Calm screen opens at {threshold} bpm.</p>
          <div className="row">
            <button type="button" onClick={() => hr.setSimTarget(threshold + 15)}>Spike</button>
            <button type="button" onClick={() => hr.setSimTarget(80)}>Settle</button>
          </div>
        </div>
      )}
    </aside>
  );
}

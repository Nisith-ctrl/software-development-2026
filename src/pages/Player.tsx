import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalmDown } from '../components/CalmDown';
import { HoldButton } from '../components/HoldButton';
import { MediaView } from '../components/MediaView';
import { InterestFloat, StepReward, TokenBoard } from '../components/Reward';
import { newId } from '../domain/id';
import { buildPlan, createSession, isLockedOut, sessionReducer, type SessionState } from '../domain/session';
import { checkStress, INITIAL_STRESS } from '../domain/stress';
import type { Learner, Routine } from '../domain/types';
import { playChime, speak } from '../services/audio';
import { useHeartRate } from '../services/heartRate';
import { useStore } from '../state/store';

export const DELAYED_HINT_MS = 5000;
export const REWARD_MS = 1800;

/** Route wrapper: looks up the learner and routine, then hands off to the session view. */
export function Player() {
  const { learnerId, routineId } = useParams();
  const { data } = useStore();
  const learner = data.learners.find((l) => l.id === learnerId);
  const routine = data.routines.find((r) => r.id === routineId);

  if (!learner || !routine || routine.steps.length === 0) {
    return (
      <main className="page narrow">
        <p>That routine isn't available.</p>
        <Link to="/">Back to start</Link>
      </main>
    );
  }
  return <PracticeSession key={`${learner.id}:${routine.id}`} learner={learner} routine={routine} />;
}

function PracticeSession({ learner, routine }: { learner: Learner; routine: Routine }) {
  const navigate = useNavigate();
  const { promptFor, recordSession } = useStore();
  const hr = useHeartRate();

  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    createSession(buildPlan(routine, (stepId) => promptFor(learner.id, stepId).level)),
  );
  const meta = useRef({ id: newId('session'), startedAt: Date.now(), saved: false });
  const stress = useRef(INITIAL_STRESS);
  const latest = useRef<SessionState>(state);
  latest.current = state;

  const { phase, index, plan, calm } = state;
  const current = plan[index];
  // Snapshot: the store adds earned tokens to the learner when the session is saved.
  const startTokens = useRef(learner.tokens).current;
  const tokens = startTokens + state.logs.length;

  // Each new step: read it aloud, and schedule the delayed hint for prompt level 1.
  useEffect(() => {
    if (phase !== 'step') return;
    if (learner.readAloud) speak(current.instruction);
    if (current.level !== 1) return;
    const t = window.setTimeout(() => dispatch({ type: 'reveal-hint' }), DELAYED_HINT_MS);
    return () => window.clearTimeout(t);
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // After the step reward, move on.
  useEffect(() => {
    if (phase !== 'reward') return;
    const t = window.setTimeout(() => dispatch({ type: 'advance', now: Date.now() }), REWARD_MS);
    return () => window.clearTimeout(t);
  }, [phase, index]);

  // Bio-responsive pause: sustained high heart rate opens the calm screen.
  useEffect(() => {
    if (hr.bpm === null) return;
    dispatch({ type: 'heart-rate', bpm: hr.bpm });
    const result = checkStress(
      stress.current,
      hr.bpm,
      Date.now(),
      { threshold: learner.hrThreshold, sustainSeconds: learner.hrSustainSeconds },
      latest.current.phase === 'step' && !latest.current.calm,
    );
    stress.current = result.monitor;
    if (result.trigger) openCalm('heart-rate', hr.bpm);
  }, [hr.bpm]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (completed: boolean) => {
    const s = latest.current;
    if (meta.current.saved || s.logs.length === 0) return;
    meta.current.saved = true;
    recordSession(
      {
        id: meta.current.id,
        learnerId: learner.id,
        routineId: routine.id,
        startedAt: meta.current.startedAt,
        endedAt: Date.now(),
        completed,
        steps: s.logs,
        calmEvents: s.calmEvents,
      },
      s.logs.length,
    );
  };

  useEffect(() => {
    if (phase !== 'done') return;
    save(true);
    if (learner.rewardStyle !== 'interest') playChime();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCalm(trigger: 'heart-rate' | 'manual', bpm?: number) {
    window.speechSynthesis?.cancel();
    dispatch({ type: 'open-calm', trigger, hr: bpm, now: Date.now() });
  }

  const exit = () => {
    save(false);
    navigate(`/learn/${learner.id}`);
  };

  return (
    <main className="player">
      <header className="player-bar">
        <HoldButton onHold={exit} className="player-exit">
          Hold to exit
        </HoldButton>
        {(phase === 'step' || phase === 'reward') && (
          <ol className="progress-dots" aria-label={`Step ${index + 1} of ${plan.length}`}>
            {plan.map((p, i) => (
              <li
                key={p.stepId}
                className={i < index || (i === index && phase === 'reward') ? 'is-done' : i === index ? 'is-now' : ''}
              />
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
          <FirstThenCard label="First" emoji={routine.emoji} title={routine.title} />
          <span className="ft-arrow" aria-hidden>
            →
          </span>
          <FirstThenCard label="Then" emoji={routine.thenEmoji} title={routine.thenReward} isThen />
          <button type="button" className="big-button" onClick={() => dispatch({ type: 'start', now: Date.now() })}>
            Start
          </button>
        </section>
      )}

      {(phase === 'step' || phase === 'reward') && (
        <section className="step-view" aria-live="polite">
          <div className="now-next">
            <span className="now-tag">Now</span>
            <span className="next-tag">
              {plan[index + 1] ? (
                <>
                  Next: <span aria-hidden>{plan[index + 1].emoji}</span> {plan[index + 1].instruction}
                </>
              ) : (
                <>
                  Then: <span aria-hidden>{routine.thenEmoji}</span> {routine.thenReward}
                </>
              )}
            </span>
          </div>

          <MediaView
            mediaId={current.mediaId}
            kind={current.mediaKind}
            emoji={current.emoji}
            alt={current.instruction}
            className="step-media"
          />

          <div className="instruction-row">
            <h1 className="instruction">{current.instruction}</h1>
            <button
              type="button"
              className="icon-button"
              onClick={() => speak(current.instruction)}
              aria-label="Read aloud"
            >
              🔊
            </button>
          </div>

          {phase === 'reward' ? (
            <StepReward learner={learner} tokens={tokens} />
          ) : (
            <div className="choices" role="group" aria-label="Choose what to do">
              {current.choices.map((choice) => {
                const lockedOut = isLockedOut(current.level, choice);
                const isTarget = choice.correct && state.hintShown;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={[
                      'choice',
                      isTarget ? (current.level === 3 ? 'is-target-full' : 'is-target') : '',
                      state.faded.includes(choice.id) || lockedOut ? 'is-faded' : '',
                    ].join(' ')}
                    disabled={lockedOut}
                    onClick={() => dispatch({ type: 'tap', choiceId: choice.id, now: Date.now() })}
                  >
                    <span className="choice-emoji" aria-hidden>
                      {choice.emoji}
                    </span>
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
            <TokenBoard
              filled={tokens % learner.tokensPerReward || learner.tokensPerReward}
              total={learner.tokensPerReward}
            />
          )}
          <FirstThenCard label="Now it's time for" emoji={routine.thenEmoji} title={routine.thenReward} isThen />
          <Link className="button big-button" to={`/learn/${learner.id}`}>
            Back to my routines
          </Link>
        </section>
      )}

      {calm && (
        <CalmDown
          tools={learner.calmTools}
          minSeconds={learner.calmMinSeconds}
          onReady={() => dispatch({ type: 'close-calm', now: Date.now() })}
        />
      )}

      {hr.source === 'simulator' && <SimulatorDock threshold={learner.hrThreshold} />}
    </main>
  );
}

function FirstThenCard({
  label,
  emoji,
  title,
  isThen = false,
}: {
  label: string;
  emoji: string;
  title: string;
  isThen?: boolean;
}) {
  return (
    <div className={`ft-card ${isThen ? 'is-then' : ''}`}>
      <span className="ft-label">{label}</span>
      <span className="ft-emoji" aria-hidden>
        {emoji}
      </span>
      <span className="ft-title">{title}</span>
    </div>
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
            <input
              type="range"
              min={60}
              max={150}
              value={hr.simTarget}
              onChange={(e) => hr.setSimTarget(Number(e.target.value))}
            />
          </label>
          <p className="muted small">Calm screen opens at {threshold} bpm.</p>
          <div className="row">
            <button type="button" onClick={() => hr.setSimTarget(threshold + 15)}>
              Spike
            </button>
            <button type="button" onClick={() => hr.setSimTarget(80)}>
              Settle
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

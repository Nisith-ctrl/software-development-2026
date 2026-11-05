import { useState } from 'react';
import { PromptChart } from '../../components/PromptChart';
import { RealWorldPanel } from '../../components/RealWorldPanel';
import {
  generalization,
  helpTrend,
  learnerSummary,
  logsByStep,
  sessionDurationMs,
  sessionsFor,
  stepStats,
  stickingPoints,
} from '../../domain/metrics';
import { PROMPT_LABELS } from '../../domain/types';
import { downloadRealWorldCsv, downloadSessionsCsv } from '../../services/files';
import { useStore } from '../../state/store';

const secs = (ms: number) => `${Math.round(ms / 1000)}s`;

export function Dashboard() {
  const { data, promptFor } = useStore();
  const [learnerId, setLearnerId] = useState(data.learners[0]?.id);
  const learner = data.learners.find((l) => l.id === learnerId);

  if (!learner) return <p>Add a learner to see progress data.</p>;

  const sessions = sessionsFor(data, learner.id);
  const summary = learnerSummary(sessions);
  const byStep = logsByStep(sessions);
  const routines = data.routines.filter(
    (r) => r.assignedTo.includes(learner.id) || sessions.some((s) => s.routineId === r.id),
  );
  const sticking = stickingPoints(routines, byStep);

  return (
    <div className="dashboard">
      <div className="page-head">
        <h1>Progress data</h1>
        <div className="row no-print">
          <button type="button" onClick={() => downloadSessionsCsv(data, learner)}>
            Export practice CSV
          </button>
          <button type="button" className="secondary" onClick={() => downloadRealWorldCsv(data, learner)}>
            Export real-world CSV
          </button>
          <button type="button" className="secondary" onClick={() => window.print()}>
            Print for IEP
          </button>
        </div>
      </div>

      <div className="tabs no-print" role="tablist" aria-label="Learner">
        {data.learners.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === learner.id}
            onClick={() => setLearnerId(l.id)}
          >
            {l.avatar} {l.name}
          </button>
        ))}
      </div>
      <p className="print-only">
        Learner: {learner.name} · Printed {new Date().toLocaleDateString()}
      </p>

      <div className="stat-grid">
        <Stat value={summary.sessions} label="Sessions" />
        <Stat value={`${Math.round(summary.completionRate * 100)}%`} label="Finished" />
        <Stat value={secs(summary.avgDurationMs)} label="Average time" />
        <Stat value={summary.calmBreaks} label="Calm breaks" />
      </div>

      {sticking.length > 0 && (
        <section className="card">
          <h2>Sticking points</h2>
          <p className="muted small">
            Steps with the most redirected taps or calm breaks. Good targets for more practice or a clearer photo.
          </p>
          <ul className="sticking">
            {sticking.map((x) => (
              <li key={x.step.id}>
                <span aria-hidden>{x.step.emoji}</span>
                <span className="list-main">
                  <strong>{x.step.instruction}</strong>
                  <span className="muted small">
                    {x.routine.title}, step {x.index + 1} · {x.avgWrongTaps.toFixed(1)} redirects per try ·{' '}
                    {secs(x.avgDurationMs)} average
                    {x.calmBreaks > 0 && ` · ${x.calmBreaks} calm break${x.calmBreaks > 1 ? 's' : ''}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {routines.map((r) => (
        <section key={r.id} className="card">
          <h2>
            <span aria-hidden>{r.emoji}</span> {r.title}
          </h2>
          <RealWorldPanel learnerId={learner.id} routine={r} gen={generalization(data, learner.id, r)} />
          <h3>Help needed in the app</h3>
          <PromptChart title={`Help needed for ${r.title}`} points={helpTrend(sessions, r.id)} />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Step</th>
                  <th scope="col">Help level now</th>
                  <th scope="col">Tries</th>
                  <th scope="col">Redirects / try</th>
                  <th scope="col">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {r.steps.map((step, i) => {
                  const stats = stepStats(byStep.get(step.id) ?? []);
                  const level = promptFor(learner.id, step.id).level;
                  return (
                    <tr key={step.id}>
                      <td>{i + 1}</td>
                      <td>{step.instruction}</td>
                      <td>
                        <span className={`level level-${level}`}>{PROMPT_LABELS[level]}</span>
                      </td>
                      <td>{stats.tries}</td>
                      <td>{stats.tries ? stats.avgWrongTaps.toFixed(1) : '–'}</td>
                      <td>{stats.tries ? secs(stats.avgDurationMs) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="card">
        <h2>Recent sessions</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Routine</th>
                <th scope="col">Result</th>
                <th scope="col">Time</th>
                <th scope="col">Calm breaks</th>
              </tr>
            </thead>
            <tbody>
              {[...sessions]
                .reverse()
                .slice(0, 15)
                .map((s) => (
                  <tr key={s.id}>
                    <td>
                      {new Date(s.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td>{data.routines.find((r) => r.id === s.routineId)?.title ?? '(deleted)'}</td>
                    <td>{s.completed ? 'Finished' : `Stopped at step ${s.steps.length + 1}`}</td>
                    <td>{secs(sessionDurationMs(s))}</td>
                    <td>
                      {s.calmEvents.length
                        ? s.calmEvents
                            .map(
                              (c) =>
                                `${c.trigger === 'manual' ? 'asked' : `HR ${c.hr ?? '?'}`} (${secs(c.durationMs)})`,
                            )
                            .join(', ')
                        : '–'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {sessions.length === 0 && <p className="muted">No sessions yet.</p>}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

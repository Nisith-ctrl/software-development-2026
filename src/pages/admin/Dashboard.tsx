import { useState } from 'react';
import { PromptChart } from '../../components/PromptChart';
import { downloadCsv } from '../../lib/export';
import { useStore } from '../../lib/store';
import { PROMPT_LABELS, type Session, type StepLog } from '../../lib/types';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const secs = (ms: number) => `${Math.round(ms / 1000)}s`;
const sessionMs = (s: Session) => (s.endedAt ?? s.startedAt) - s.startedAt;

export function Dashboard() {
  const { data, promptFor } = useStore();
  const [learnerId, setLearnerId] = useState(data.learners[0]?.id);
  const learner = data.learners.find((l) => l.id === learnerId);

  if (!learner) return <p>Add a learner to see progress data.</p>;

  const sessions = data.sessions.filter((s) => s.learnerId === learner.id).sort((a, b) => a.startedAt - b.startedAt);
  const completed = sessions.filter((s) => s.completed);
  const calmEvents = sessions.flatMap((s) => s.calmEvents);
  const routines = data.routines.filter((r) => r.assignedTo.includes(learner.id) || sessions.some((s) => s.routineId === r.id));

  const logsByStep = new Map<string, StepLog[]>();
  sessions.forEach((s) => s.steps.forEach((log) => logsByStep.set(log.stepId, [...(logsByStep.get(log.stepId) ?? []), log])));

  const stickingPoints = routines
    .flatMap((r) => r.steps.map((step, i) => ({ routine: r, step, index: i, logs: logsByStep.get(step.id) ?? [] })))
    .filter((x) => x.logs.length > 0)
    .map((x) => ({
      ...x,
      wrong: avg(x.logs.map((l) => l.wrongTaps)),
      time: avg(x.logs.map((l) => l.durationMs)),
      calm: x.logs.filter((l) => l.calmDuringStep).length,
    }))
    .filter((x) => x.wrong >= 0.5 || x.calm > 0)
    .sort((a, b) => b.calm - a.calm || b.wrong - a.wrong)
    .slice(0, 5);

  return (
    <div className="dashboard">
      <div className="page-head">
        <h1>Progress data</h1>
        <div className="row no-print">
          <button type="button" onClick={() => downloadCsv(data, learner)}>Export CSV</button>
          <button type="button" className="secondary" onClick={() => window.print()}>Print for IEP</button>
        </div>
      </div>

      <div className="tabs no-print" role="tablist" aria-label="Learner">
        {data.learners.map((l) => (
          <button key={l.id} type="button" role="tab" aria-selected={l.id === learner.id} onClick={() => setLearnerId(l.id)}>
            {l.avatar} {l.name}
          </button>
        ))}
      </div>
      <p className="print-only">Learner: {learner.name} · Printed {new Date().toLocaleDateString()}</p>

      <div className="stat-grid">
        <div className="stat"><span className="stat-value">{sessions.length}</span><span className="stat-label">Sessions</span></div>
        <div className="stat">
          <span className="stat-value">{sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0}%</span>
          <span className="stat-label">Finished</span>
        </div>
        <div className="stat"><span className="stat-value">{secs(avg(completed.map(sessionMs)))}</span><span className="stat-label">Average time</span></div>
        <div className="stat"><span className="stat-value">{calmEvents.length}</span><span className="stat-label">Calm breaks</span></div>
      </div>

      {stickingPoints.length > 0 && (
        <section className="card">
          <h2>Sticking points</h2>
          <p className="muted small">Steps with the most redirected taps or calm breaks. Good targets for more practice or a clearer photo.</p>
          <ul className="sticking">
            {stickingPoints.map((x) => (
              <li key={x.step.id}>
                <span aria-hidden>{x.step.emoji}</span>
                <span className="list-main">
                  <strong>{x.step.instruction}</strong>
                  <span className="muted small">
                    {x.routine.title}, step {x.index + 1} · {x.wrong.toFixed(1)} redirects per try · {secs(x.time)} average
                    {x.calm > 0 && ` · ${x.calm} calm break${x.calm > 1 ? 's' : ''}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {routines.map((r) => {
        const rs = sessions.filter((s) => s.routineId === r.id && s.steps.length > 0);
        return (
          <section key={r.id} className="card">
            <h2><span aria-hidden>{r.emoji}</span> {r.title}</h2>
            <PromptChart title={`Help needed for ${r.title}`} points={rs.map((s) => ({ at: s.startedAt, level: avg(s.steps.map((l) => l.promptLevel)) }))} />
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
                    const logs = logsByStep.get(step.id) ?? [];
                    const level = promptFor(learner.id, step.id).level;
                    return (
                      <tr key={step.id}>
                        <td>{i + 1}</td>
                        <td>{step.instruction}</td>
                        <td><span className={`level level-${level}`}>{PROMPT_LABELS[level]}</span></td>
                        <td>{logs.length}</td>
                        <td>{logs.length ? avg(logs.map((l) => l.wrongTaps)).toFixed(1) : '–'}</td>
                        <td>{logs.length ? secs(avg(logs.map((l) => l.durationMs))) : '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

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
              {[...sessions].reverse().slice(0, 15).map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{data.routines.find((r) => r.id === s.routineId)?.title ?? '(deleted)'}</td>
                  <td>{s.completed ? 'Finished' : `Stopped at step ${s.steps.length + 1}`}</td>
                  <td>{secs(sessionMs(s))}</td>
                  <td>
                    {s.calmEvents.length
                      ? s.calmEvents.map((c) => `${c.trigger === 'manual' ? 'asked' : `HR ${c.hr ?? '?'}`} (${secs(c.durationMs)})`).join(', ')
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

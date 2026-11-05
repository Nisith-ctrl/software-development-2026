import { useState } from 'react';
import { localIsoDate } from '../domain/dates';
import { newId } from '../domain/id';
import { GENERALIZATION_COPY, type Generalization } from '../domain/metrics';
import { REAL_WORLD_LABELS, type RealWorldResult, type Routine } from '../domain/types';
import { useStore } from '../state/store';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const todayInput = () => localIsoDate();

/**
 * Closes the loop on the generalization gap: grown-ups log how the learner did
 * the routine in the real place, next to how they do in the app (FR-6.x).
 */
export function RealWorldPanel({
  learnerId,
  routine,
  gen,
}: {
  learnerId: string;
  routine: Routine;
  gen: Generalization;
}) {
  const { addRealWorldCheck, deleteRealWorldCheck } = useStore();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayInput);
  const [place, setPlace] = useState('');
  const [result, setResult] = useState<RealWorldResult>('with-help');
  const [note, setNote] = useState('');
  const copy = GENERALIZATION_COPY[gen.status];

  const submit = () => {
    addRealWorldCheck({
      id: newId('check'),
      learnerId,
      routineId: routine.id,
      // Noon local time keeps the date stable across time zones.
      at: new Date(`${date}T12:00:00`).getTime(),
      place: place.trim() || 'Real place',
      result,
      note: note.trim(),
    });
    setOpen(false);
    setPlace('');
    setNote('');
  };

  return (
    <div className="real-world">
      <div className={`gen-banner gen-${gen.status}`}>
        <div className="gen-bars" aria-hidden>
          <Bar label="In the app" value={gen.appMastery} />
          <Bar label="In real life" value={gen.realWorldRate} />
        </div>
        <div>
          <strong>{copy.label}</strong>
          <p className="small">
            {pct(gen.appMastery)} of steps need little or no help in the app; {pct(gen.realWorldRate)} of recent
            real-world tries were done on their own. {copy.advice}
          </p>
        </div>
      </div>

      <div className="page-head">
        <h3>Real-world check-ins</h3>
        <button
          type="button"
          className="secondary small-button no-print"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? 'Cancel' : '+ Log a real-world try'}
        </button>
      </div>

      {open && (
        <form
          className="checkin-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="field-row">
            <label className="field short">
              Date
              <input type="date" value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="field grow">
              Where
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Home bathroom, Publix on Main St…"
              />
            </label>
          </div>
          <fieldset className="field">
            <legend>How did it go?</legend>
            <div className="row">
              {(Object.keys(REAL_WORLD_LABELS) as RealWorldResult[]).map((r) => (
                <label key={r} className="radio">
                  <input
                    type="radio"
                    name={`result-${routine.id}`}
                    checked={result === r}
                    onChange={() => setResult(r)}
                  />
                  {REAL_WORLD_LABELS[r]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Note
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What helped, what got in the way"
            />
          </label>
          <button type="submit">Save check-in</button>
        </form>
      )}

      {gen.checks.length > 0 ? (
        <ul className="checkins">
          {gen.checks.map((c) => (
            <li key={c.id}>
              <span className={`result result-${c.result}`}>{REAL_WORLD_LABELS[c.result]}</span>
              <span className="list-main">
                <span>
                  {new Date(c.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {c.place}
                </span>
                {c.note && <span className="muted small">{c.note}</span>}
              </span>
              <button
                type="button"
                className="link-button no-print"
                onClick={() => confirm('Delete this check-in?') && deleteRealWorldCheck(c.id)}
                aria-label={`Delete check-in from ${new Date(c.at).toLocaleDateString()}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">No real-world tries logged yet.</p>
      )}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="gen-bar">
      <span className="small">{label}</span>
      <span className="gen-track">
        <span className="gen-fill" style={{ width: pct(value) }} />
      </span>
    </div>
  );
}

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { migrate } from '../../domain/repository';
import { createSeedData } from '../../domain/seed';
import { downloadBackup } from '../../services/files';
import { useStore } from '../../state/store';

export function Overview() {
  const { data, replaceAll } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = data.sessions.filter((s) => s.startedAt >= weekAgo);

  const restore = async (file: File) => {
    try {
      const parsed = migrate(JSON.parse(await file.text()));
      if (!parsed) throw new Error('not a LifeSync backup');
      replaceAll(parsed);
      setMessage('Backup restored.');
    } catch {
      setMessage('That file is not a LifeSync backup.');
    }
  };

  return (
    <>
      <h1>Overview</h1>
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">{data.learners.length}</span>
          <span className="stat-label">Learners</span>
        </div>
        <div className="stat">
          <span className="stat-value">{data.routines.length}</span>
          <span className="stat-label">Routines</span>
        </div>
        <div className="stat">
          <span className="stat-value">{thisWeek.length}</span>
          <span className="stat-label">Sessions this week</span>
        </div>
        <div className="stat">
          <span className="stat-value">{thisWeek.reduce((n, s) => n + s.calmEvents.length, 0)}</span>
          <span className="stat-label">Calm breaks this week</span>
        </div>
        <div className="stat">
          <span className="stat-value">{data.realWorldChecks.filter((c) => c.at >= weekAgo).length}</span>
          <span className="stat-label">Real-world tries this week</span>
        </div>
      </div>

      <section className="card">
        <h2>Get started</h2>
        <ol className="steps-list">
          <li>
            <Link to="/admin/learners">Set up a learner</Link>: rewards, calm tools and heart-rate threshold.
          </li>
          <li>
            <Link to="/admin/routines">Build a routine</Link> with photos or videos of the learner's real places.
          </li>
          <li>
            Hand the device over from the <Link to="/">start screen</Link>. The learner taps their name.
          </li>
          <li>
            After the learner tries the routine for real, log it under <Link to="/admin/data">progress data</Link>.
          </li>
          <li>Compare in-app and real-world progress, then export it for the IEP team.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted">
          Everything is stored on this device only. A backup holds learners, routines, session data and real-world
          check-ins. Uploaded photos and videos stay on this device and aren't included.
        </p>
        <div className="row">
          <button type="button" onClick={() => downloadBackup(data)}>
            Download backup
          </button>
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>
            Restore from backup
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (confirm('Replace all data on this device with the demo data?')) {
                replaceAll(createSeedData());
                setMessage('Demo data loaded.');
              }
            }}
          >
            Reset to demo data
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])}
          />
        </div>
        {message && <p role="status">{message}</p>}
      </section>
    </>
  );
}

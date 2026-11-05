import { Link } from 'react-router-dom';
import { useStore } from '../state/store';

export function Home() {
  const { data } = useStore();
  return (
    <main className="page home">
      <header className="home-header">
        <div className="brand">
          <img src="/icon.svg" alt="" width={40} height={40} />
          <span>LifeSync</span>
        </div>
        <Link className="button secondary" to="/admin">
          Grown-ups
        </Link>
      </header>

      <h1 className="home-title">Who is practising today?</h1>
      <div className="learner-tiles">
        {data.learners.map((l) => (
          <Link key={l.id} to={`/learn/${l.id}`} className="learner-tile">
            <span className="learner-avatar" aria-hidden>
              {l.avatar}
            </span>
            <span className="learner-name">{l.name}</span>
          </Link>
        ))}
      </div>
      {data.learners.length === 0 && (
        <p className="muted">
          No learners yet. A grown-up can add one in <Link to="/admin/learners/new">Grown-ups → Learners</Link>.
        </p>
      )}
    </main>
  );
}

import { Link, useNavigate, useParams } from 'react-router-dom';
import { HoldButton } from '../components/HoldButton';
import { TokenBoard } from '../components/Reward';
import { useStore } from '../state/store';

export function LearnerHome() {
  const { learnerId } = useParams();
  const navigate = useNavigate();
  const { data } = useStore();
  const learner = data.learners.find((l) => l.id === learnerId);

  if (!learner) {
    return (
      <main className="page narrow">
        <p>Learner not found.</p>
        <Link to="/">Back</Link>
      </main>
    );
  }

  const routines = data.routines.filter((r) => r.assignedTo.includes(learner.id) && r.steps.length > 0);

  return (
    <main className="page learner-home">
      <header className="learner-home-bar">
        <span className="learner-greeting">
          <span aria-hidden>{learner.avatar}</span> Hi, {learner.name}
        </span>
        <HoldButton onHold={() => navigate('/')}>Hold to go back</HoldButton>
      </header>

      {learner.rewardStyle === 'tokens' && (
        <div className="token-summary">
          <TokenBoard filled={learner.tokens % learner.tokensPerReward} total={learner.tokensPerReward} />
        </div>
      )}

      <h1 className="section-title">What are we practising?</h1>
      <div className="routine-tiles">
        {routines.map((r) => (
          <Link key={r.id} to={`/learn/${learner.id}/play/${r.id}`} className="routine-tile">
            <span className="routine-emoji" aria-hidden>
              {r.emoji}
            </span>
            <span className="routine-title">{r.title}</span>
            <span className="routine-steps">{r.steps.length} steps</span>
          </Link>
        ))}
      </div>
      {routines.length === 0 && <p className="muted">No routines yet. Ask a grown-up to add one.</p>}
    </main>
  );
}

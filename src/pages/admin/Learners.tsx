import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store';
import type { CalmTool, Learner, RewardStyle } from '../../lib/types';

export function LearnerList() {
  const { data } = useStore();
  return (
    <>
      <div className="page-head">
        <h1>Learners</h1>
        <Link className="button" to="/admin/learners/new">Add learner</Link>
      </div>
      <div className="list">
        {data.learners.map((l) => (
          <Link key={l.id} className="list-row" to={`/admin/learners/${l.id}`}>
            <span className="list-emoji" aria-hidden>{l.avatar}</span>
            <span className="list-main">
              <strong>{l.name}</strong>
              <span className="muted small">
                Calm screen at {l.hrThreshold} bpm · {data.routines.filter((r) => r.assignedTo.includes(l.id)).length} routines
              </span>
            </span>
            <span aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </>
  );
}

const blankLearner = (): Learner => ({
  id: newId('learner'),
  name: '',
  avatar: '🙂',
  rewardStyle: 'tokens',
  interestEmoji: '⭐',
  tokensPerReward: 5,
  calmTools: ['breathing', 'pressure', 'music'],
  hrThreshold: 110,
  hrSustainSeconds: 5,
  calmMinSeconds: 30,
  readAloud: true,
  tokens: 0,
});

const AVATARS = ['🙂', '🦖', '🦋', '🐢', '🚀', '🐱', '🦊', '🌈', '⚽', '🎨'];

export function LearnerEdit() {
  const { learnerId } = useParams();
  const navigate = useNavigate();
  const { data, saveLearner, deleteLearner } = useStore();
  const existing = data.learners.find((l) => l.id === learnerId);
  const [form, setForm] = useState<Learner>(existing ?? blankLearner());
  const isNew = !existing;

  const set = <K extends keyof Learner>(key: K, value: Learner[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleTool = (tool: CalmTool) =>
    set('calmTools', form.calmTools.includes(tool) ? form.calmTools.filter((t) => t !== tool) : [...form.calmTools, tool]);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        saveLearner({ ...form, name: form.name.trim() || 'Learner' });
        navigate('/admin/learners');
      }}
    >
      <h1>{isNew ? 'Add learner' : `Edit ${existing.name}`}</h1>

      <section className="card">
        <h2>About</h2>
        <label className="field">
          Name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus={isNew} />
        </label>
        <fieldset className="field">
          <legend>Picture</legend>
          <div className="emoji-picker">
            {AVATARS.map((a) => (
              <button key={a} type="button" aria-pressed={form.avatar === a} onClick={() => set('avatar', a)}>{a}</button>
            ))}
          </div>
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={form.readAloud} onChange={(e) => set('readAloud', e.target.checked)} />
          Read each step out loud automatically
        </label>
      </section>

      <section className="card">
        <h2>Rewards</h2>
        <fieldset className="field">
          <legend>After each step</legend>
          {(
            [
              ['tokens', 'Token board', 'Fills a star; a full board earns the reward.'],
              ['interest', 'Special-interest animation', 'Slow floating pictures of something they love.'],
              ['chime', 'Calm chime', 'A soft two-note sound.'],
            ] as Array<[RewardStyle, string, string]>
          ).map(([value, label, hint]) => (
            <label key={value} className="radio">
              <input type="radio" name="reward" checked={form.rewardStyle === value} onChange={() => set('rewardStyle', value)} />
              <span><strong>{label}</strong> <span className="muted small">{hint}</span></span>
            </label>
          ))}
        </fieldset>
        {form.rewardStyle === 'interest' && (
          <label className="field short">
            Special-interest emoji
            <input value={form.interestEmoji} onChange={(e) => set('interestEmoji', e.target.value)} maxLength={4} />
          </label>
        )}
        {form.rewardStyle === 'tokens' && (
          <label className="field short">
            Tokens on the board
            <input type="number" min={2} max={10} value={form.tokensPerReward} onChange={(e) => set('tokensPerReward', Number(e.target.value))} />
          </label>
        )}
      </section>

      <section className="card">
        <h2>Calm-down</h2>
        <fieldset className="field">
          <legend>Calm tools to offer</legend>
          {(
            [
              ['breathing', 'Breathing pacer'],
              ['pressure', 'Deep-pressure visual'],
              ['music', 'Calming music'],
            ] as Array<[CalmTool, string]>
          ).map(([tool, label]) => (
            <label key={tool} className="check">
              <input type="checkbox" checked={form.calmTools.includes(tool)} onChange={() => toggleTool(tool)} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="field-row">
          <label className="field short">
            Open calm screen at (bpm)
            <input type="number" min={70} max={200} value={form.hrThreshold} onChange={(e) => set('hrThreshold', Number(e.target.value))} />
          </label>
          <label className="field short">
            …after it stays high for (seconds)
            <input type="number" min={1} max={60} value={form.hrSustainSeconds} onChange={(e) => set('hrSustainSeconds', Number(e.target.value))} />
          </label>
          <label className="field short">
            Minimum break (seconds)
            <input type="number" min={0} max={600} value={form.calmMinSeconds} onChange={(e) => set('calmMinSeconds', Number(e.target.value))} />
          </label>
        </div>
        <p className="muted small">
          Tip: set the threshold about 20–30 bpm above the learner's resting heart rate, then adjust from the calm-break data.
        </p>
      </section>

      <div className="row">
        <button type="submit">Save</button>
        <Link className="button secondary" to="/admin/learners">Cancel</Link>
        {!isNew && (
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm(`Remove ${existing.name}? Their routines stay, but are no longer assigned to them.`)) {
                deleteLearner(existing.id);
                navigate('/admin/learners');
              }
            }}
          >
            Remove learner
          </button>
        )}
      </div>
    </form>
  );
}

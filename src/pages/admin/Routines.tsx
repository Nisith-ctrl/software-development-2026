import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MediaView } from '../../components/MediaView';
import { deleteMedia, putMedia } from '../../lib/db';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store';
import type { Choice, Routine, RoutineCategory, Step } from '../../lib/types';
import { CATEGORY_LABELS } from '../../lib/types';

const MAX_MEDIA_MB = 50;

export function RoutineList() {
  const { data } = useStore();
  return (
    <>
      <div className="page-head">
        <h1>Routines</h1>
        <Link className="button" to="/admin/routines/new">New routine</Link>
      </div>
      <div className="list">
        {data.routines.map((r) => (
          <Link key={r.id} className="list-row" to={`/admin/routines/${r.id}`}>
            <span className="list-emoji" aria-hidden>{r.emoji}</span>
            <span className="list-main">
              <strong>{r.title}</strong>
              <span className="muted small">
                {CATEGORY_LABELS[r.category]} · {r.steps.length} steps ·{' '}
                {r.assignedTo.map((id) => data.learners.find((l) => l.id === id)?.name).filter(Boolean).join(', ') || 'Not assigned'}
              </span>
            </span>
            <span aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </>
  );
}

const blankChoice = (correct = false): Choice => ({ id: newId('choice'), label: '', emoji: '', correct });
const blankStep = (): Step => ({ id: newId('step'), instruction: '', emoji: '📍', choices: [blankChoice(true), blankChoice()] });
const blankRoutine = (): Routine => ({
  id: newId('routine'),
  title: '',
  emoji: '⭐',
  category: 'daily-living',
  thenReward: '',
  thenEmoji: '🎉',
  steps: [blankStep()],
  assignedTo: [],
  updatedAt: Date.now(),
});

function StepEditor({
  step,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  step: Step;
  index: number;
  total: number;
  onChange: (s: Step) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const [uploadError, setUploadError] = useState<string>();
  const setChoice = (id: string, patch: Partial<Choice>) =>
    onChange({
      ...step,
      choices: step.choices.map((c) =>
        c.id === id ? { ...c, ...patch } : patch.correct ? { ...c, correct: false } : c,
      ),
    });

  const upload = async (file: File) => {
    setUploadError(undefined);
    if (file.size > MAX_MEDIA_MB * 1024 * 1024) {
      setUploadError(`Please use a file under ${MAX_MEDIA_MB} MB.`);
      return;
    }
    const mediaId = newId('media');
    await putMedia(mediaId, file);
    if (step.mediaId) void deleteMedia(step.mediaId);
    onChange({ ...step, mediaId, mediaKind: file.type.startsWith('video') ? 'video' : 'image' });
  };

  return (
    <li className="card step-editor">
      <div className="step-editor-head">
        <h3>Step {index + 1}</h3>
        <div className="row tight">
          <button type="button" className="secondary small-button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move step up">↑</button>
          <button type="button" className="secondary small-button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move step down">↓</button>
          <button type="button" className="danger small-button" onClick={onRemove} disabled={total === 1}>Remove</button>
        </div>
      </div>

      <div className="step-editor-body">
        <div className="step-media-edit">
          <MediaView mediaId={step.mediaId} kind={step.mediaKind} emoji={step.emoji || '📍'} alt={step.instruction} className="thumb" />
          <label className="button secondary upload">
            {step.mediaId ? 'Replace photo/video' : 'Add photo/video'}
            <input type="file" accept="image/*,video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {step.mediaId && (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                void deleteMedia(step.mediaId!);
                onChange({ ...step, mediaId: undefined, mediaKind: undefined });
              }}
            >
              Use emoji instead
            </button>
          )}
          {uploadError && <p className="error small">{uploadError}</p>}
        </div>

        <div className="step-fields">
          <label className="field">
            What the learner does
            <input value={step.instruction} onChange={(e) => onChange({ ...step, instruction: e.target.value })} placeholder="Put toothpaste on the brush." required />
          </label>
          <label className="field short">
            Emoji (shown when there's no photo)
            <input value={step.emoji} onChange={(e) => onChange({ ...step, emoji: e.target.value })} maxLength={4} />
          </label>

          <fieldset className="field">
            <legend>Choices (mark the right one)</legend>
            {step.choices.map((c) => (
              <div key={c.id} className="choice-edit">
                <input
                  type="radio"
                  name={`correct-${step.id}`}
                  checked={c.correct}
                  onChange={() => setChoice(c.id, { correct: true })}
                  aria-label="This is the right choice"
                />
                <input className="emoji-input" value={c.emoji} onChange={(e) => setChoice(c.id, { emoji: e.target.value })} maxLength={4} aria-label="Choice emoji" placeholder="🙂" />
                <input value={c.label} onChange={(e) => setChoice(c.id, { label: e.target.value })} placeholder={c.correct ? 'Right choice' : 'Other choice'} aria-label="Choice label" required />
                <button
                  type="button"
                  className="link-button"
                  disabled={step.choices.length <= 2}
                  onClick={() => {
                    const rest = step.choices.filter((x) => x.id !== c.id);
                    if (c.correct) rest[0] = { ...rest[0], correct: true };
                    onChange({ ...step, choices: rest });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            {step.choices.length < 4 && (
              <button type="button" className="link-button" onClick={() => onChange({ ...step, choices: [...step.choices, blankChoice()] })}>
                + Add choice
              </button>
            )}
          </fieldset>
        </div>
      </div>
    </li>
  );
}

export function RoutineEdit() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const { data, saveRoutine, deleteRoutine } = useStore();
  const existing = data.routines.find((r) => r.id === routineId);
  const [form, setForm] = useState<Routine>(existing ?? blankRoutine());
  const isNew = !existing;

  const set = <K extends keyof Routine>(key: K, value: Routine[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setStep = (i: number, s: Step) => set('steps', form.steps.map((x, j) => (j === i ? s : x)));
  const moveStep = (i: number, delta: number) => {
    const steps = [...form.steps];
    [steps[i], steps[i + delta]] = [steps[i + delta], steps[i]];
    set('steps', steps);
  };

  const save = (then: string) => {
    saveRoutine({ ...form, title: form.title.trim() || 'Untitled routine' });
    navigate(then);
  };

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        save('/admin/routines');
      }}
    >
      <h1>{isNew ? 'New routine' : `Edit “${existing.title}”`}</h1>

      <section className="card">
        <h2>Routine</h2>
        <div className="field-row">
          <label className="field grow">
            Name
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Take the bus to school" required autoFocus={isNew} />
          </label>
          <label className="field short">
            Emoji
            <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={4} />
          </label>
          <label className="field short">
            Type
            <select value={form.category} onChange={(e) => set('category', e.target.value as RoutineCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field grow">
            “Then” reward (First this routine, then…)
            <input value={form.thenReward} onChange={(e) => set('thenReward', e.target.value)} placeholder="Tablet time" required />
          </label>
          <label className="field short">
            Reward emoji
            <input value={form.thenEmoji} onChange={(e) => set('thenEmoji', e.target.value)} maxLength={4} />
          </label>
        </div>
        <fieldset className="field">
          <legend>Who practises this</legend>
          <div className="row">
            {data.learners.map((l) => (
              <label key={l.id} className="check">
                <input
                  type="checkbox"
                  checked={form.assignedTo.includes(l.id)}
                  onChange={(e) =>
                    set('assignedTo', e.target.checked ? [...form.assignedTo, l.id] : form.assignedTo.filter((a) => a !== l.id))
                  }
                />
                {l.avatar} {l.name}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <h2>Steps</h2>
      <p className="muted">
        Take photos or short videos from the learner's point of view in the real place: their sink, their bus stop, their
        classroom door.
      </p>
      <ol className="step-editors">
        {form.steps.map((s, i) => (
          <StepEditor
            key={s.id}
            step={s}
            index={i}
            total={form.steps.length}
            onChange={(next) => setStep(i, next)}
            onMove={(d) => moveStep(i, d)}
            onRemove={() => set('steps', form.steps.filter((x) => x.id !== s.id))}
          />
        ))}
      </ol>
      <button type="button" className="secondary" onClick={() => set('steps', [...form.steps, blankStep()])}>
        + Add step
      </button>

      <div className="row sticky-actions">
        <button type="submit">Save routine</button>
        {form.assignedTo[0] && (
          <button type="button" className="secondary" onClick={() => save(`/learn/${form.assignedTo[0]}/play/${form.id}`)}>
            Save and try it
          </button>
        )}
        <Link className="button secondary" to="/admin/routines">Cancel</Link>
        {!isNew && (
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm(`Delete “${existing.title}”?`)) {
                existing.steps.forEach((s) => s.mediaId && void deleteMedia(s.mediaId));
                deleteRoutine(existing.id);
                navigate('/admin/routines');
              }
            }}
          >
            Delete routine
          </button>
        )}
      </div>
    </form>
  );
}

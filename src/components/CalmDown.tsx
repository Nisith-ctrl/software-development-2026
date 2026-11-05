import { useEffect, useState } from 'react';
import { startCalmMusic } from '../services/audio';
import type { CalmTool } from '../domain/types';

interface Props {
  tools: CalmTool[];
  minSeconds: number;
  onReady: () => void;
}

const TOOL_LABELS: Record<CalmTool, { label: string; emoji: string }> = {
  breathing: { label: 'Breathe', emoji: '🌬️' },
  pressure: { label: 'Squeeze', emoji: '🤲' },
  music: { label: 'Music', emoji: '🎵' },
};

const BREATH_PHASES = [
  { text: 'Breathe in', seconds: 4 },
  { text: 'Hold', seconds: 2 },
  { text: 'Breathe out', seconds: 6 },
];

function BreathingPacer() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(
      () => setPhase((p) => (p + 1) % BREATH_PHASES.length),
      BREATH_PHASES[phase].seconds * 1000,
    );
    return () => window.clearTimeout(t);
  }, [phase]);
  const current = BREATH_PHASES[phase];
  return (
    <div className="calm-tool">
      <div
        className={`breath-circle phase-${phase}`}
        style={{ ['--phase-s' as string]: `${current.seconds}s` }}
        aria-hidden
      />
      <p className="calm-caption" aria-live="polite">
        {current.text}
      </p>
    </div>
  );
}

function PressureVisual() {
  return (
    <div className="calm-tool">
      <div className="pressure-wrap" aria-hidden>
        <div className="pressure-hand left" />
        <div className="pressure-ball" />
        <div className="pressure-hand right" />
      </div>
      <p className="calm-caption">Press your hands together slowly. Then let go.</p>
    </div>
  );
}

function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    return startCalmMusic();
  }, [playing]);
  return (
    <div className="calm-tool">
      <button type="button" className="calm-music-button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
        {playing ? '⏸ Stop music' : '▶ Play calm music'}
      </button>
      <p className="calm-caption">{playing ? 'Listen. Breathe slowly.' : 'Soft music, quiet volume.'}</p>
    </div>
  );
}

/** Locked, dark, distraction-free screen with the learner's own regulation tools. */
export function CalmDown({ tools, minSeconds, onReady }: Props) {
  const available = tools.length ? tools : (['breathing'] as CalmTool[]);
  const [tool, setTool] = useState<CalmTool>(available[0]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const ready = elapsed >= minSeconds;
  const progress = Math.min(1, elapsed / Math.max(1, minSeconds));

  return (
    <div className="calm-screen" role="dialog" aria-modal="true" aria-label="Calm down break">
      <h2 className="calm-title">Break time. You are safe.</h2>

      {tool === 'breathing' && <BreathingPacer />}
      {tool === 'pressure' && <PressureVisual />}
      {tool === 'music' && <MusicPlayer />}

      {available.length > 1 && (
        <div className="calm-tabs" role="group" aria-label="Choose a calm tool">
          {available.map((t) => (
            <button
              key={t}
              type="button"
              className={`calm-tab ${tool === t ? 'is-active' : ''}`}
              aria-pressed={tool === t}
              onClick={() => setTool(t)}
            >
              <span aria-hidden>{TOOL_LABELS[t].emoji}</span> {TOOL_LABELS[t].label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="calm-ready"
        disabled={!ready}
        onClick={onReady}
        style={{ ['--progress' as string]: progress }}
      >
        {ready ? "I'm ready" : 'Resting…'}
      </button>
    </div>
  );
}

import { PROMPT_LABELS, type PromptLevel } from '../lib/types';

interface Point {
  at: number;
  /** Average prompt level used in that session, 0–3. */
  level: number;
}

const W = 560;
const H = 200;
const PAD = { top: 12, right: 16, bottom: 28, left: 92 };

/** Average help per session. Independent sits at the top, so a rising line means progress. */
export function PromptChart({ points, title }: { points: Point[]; title: string }) {
  if (points.length === 0) return <p className="muted small">No sessions yet.</p>;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (level: number) => PAD.top + (level / 3) * innerH;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.level).toFixed(1)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: average help went from ${first.level.toFixed(1)} to ${last.level.toFixed(1)} over ${points.length} sessions (3 is full help, 0 is independent).`}
      >
        {([0, 1, 2, 3] as PromptLevel[]).map((l) => (
          <g key={l}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(l)} y2={y(l)} className="chart-grid" />
            <text x={PAD.left - 8} y={y(l) + 4} textAnchor="end" className="chart-label">{PROMPT_LABELS[l]}</text>
          </g>
        ))}
        <path d={path} className="chart-line" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.level)} r={4} className="chart-dot">
            <title>{`${fmt(p.at)}: ${p.level.toFixed(1)}`}</title>
          </circle>
        ))}
        <text x={x(0)} y={H - 6} textAnchor={points.length === 1 ? 'middle' : 'start'} className="chart-label">{fmt(first.at)}</text>
        {points.length > 1 && (
          <text x={x(points.length - 1)} y={H - 6} textAnchor="end" className="chart-label">{fmt(last.at)}</text>
        )}
      </svg>
    </figure>
  );
}

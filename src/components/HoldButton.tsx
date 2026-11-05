import { useRef, useState, type ReactNode } from 'react';

interface Props {
  onHold: () => void;
  holdMs?: number;
  children: ReactNode;
  className?: string;
}

/** Fires only after a sustained press, so learners don't leave a routine by accident. */
export function HoldButton({ onHold, holdMs = 2000, children, className = '' }: Props) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number>();

  const start = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onHold();
    }, holdMs);
  };
  const cancel = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };

  return (
    <button
      type="button"
      className={`hold-button ${holding ? 'is-holding' : ''} ${className}`}
      style={{ ['--hold-ms' as string]: `${holdMs}ms` }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && start()}
      onKeyUp={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" aria-hidden />
      <span className="hold-label">{children}</span>
    </button>
  );
}

import { useEffect } from 'react';
import { playChime } from '../services/audio';
import type { Learner } from '../domain/types';

export function TokenBoard({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="token-board" role="img" aria-label={`${filled} of ${total} tokens`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`token ${i < filled ? 'is-filled' : ''}`} aria-hidden>
          {i < filled ? '★' : ''}
        </span>
      ))}
    </div>
  );
}

/** Gentle floating emoji of the learner's special interest. Slow, no flashing. */
export function InterestFloat({ emoji }: { emoji: string }) {
  return (
    <div className="interest-float" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} style={{ left: `${8 + i * 13}%`, animationDelay: `${i * 0.35}s` }}>
          {emoji}
        </span>
      ))}
    </div>
  );
}

/** Reinforcement after a step, matched to the learner's chosen reward style. */
export function StepReward({ learner, tokens }: { learner: Learner; tokens: number }) {
  useEffect(() => {
    if (learner.rewardStyle === 'chime') playChime();
  }, [learner.rewardStyle]);

  return (
    <div className="step-reward" role="status">
      {learner.rewardStyle === 'interest' && <InterestFloat emoji={learner.interestEmoji} />}
      <p className="step-reward-text">Nice work!</p>
      {learner.rewardStyle === 'tokens' && (
        <TokenBoard
          filled={tokens % learner.tokensPerReward || learner.tokensPerReward}
          total={learner.tokensPerReward}
        />
      )}
    </div>
  );
}

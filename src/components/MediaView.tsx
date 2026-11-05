import { useMediaUrl } from '../lib/store';

interface Props {
  mediaId?: string;
  kind?: 'image' | 'video';
  emoji: string;
  alt: string;
  className?: string;
}

/** Shows the uploaded photo/video of the learner's real place, or the emoji fallback. */
export function MediaView({ mediaId, kind, emoji, alt, className = '' }: Props) {
  const url = useMediaUrl(mediaId);

  if (url && kind === 'video') {
    // Muted by default: unexpected sound is a common sensory trigger.
    return <video className={`media ${className}`} src={url} controls muted loop playsInline aria-label={alt} />;
  }
  if (url) {
    return <img className={`media ${className}`} src={url} alt={alt} />;
  }
  return (
    <div className={`media media-emoji ${className}`} role="img" aria-label={alt}>
      {emoji}
    </div>
  );
}

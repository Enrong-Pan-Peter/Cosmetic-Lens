import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from '@phosphor-icons/react';

/**
 * Thumbs up/down on an assistant answer (improvement-plan 7.3). Up submits
 * immediately; down reveals an optional reason box. Fire-and-forget POST to
 * /api/feedback — the UI thanks the user regardless of the network result.
 */
export default function MessageFeedback({ lang, t, token, chatId, query, answer, intent, pipeline }) {
  const [rating, setRating] = useState(null); // 'up' | 'down' | null
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);

  const post = (r, reasonText) => {
    fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        rating: r,
        reason: reasonText || undefined,
        chatId: chatId || undefined,
        intent: intent || undefined,
        pipeline: pipeline || undefined,
        language: lang,
        query: query || undefined,
        answer: answer || undefined,
      }),
    }).catch(() => {});
  };

  const onUp = () => {
    if (done) return;
    setRating('up');
    post('up');
    setDone(true);
  };

  const onDown = () => {
    if (done) return;
    setRating('down');
    setShowReason(true);
  };

  const submitReason = () => {
    post('down', reason.trim());
    setShowReason(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="mt-2 text-xs text-muted-foreground select-none" aria-live="polite">
        {t.feedback.thanks}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground mr-1">{t.feedback.prompt}</span>
        <button
          type="button"
          onClick={onUp}
          aria-label={t.feedback.up_label}
          title={t.feedback.up_label}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
            rating === 'up'
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <ThumbsUp size={13} weight="regular" />
        </button>
        <button
          type="button"
          onClick={onDown}
          aria-label={t.feedback.down_label}
          title={t.feedback.down_label}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
            rating === 'down'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <ThumbsDown size={13} weight="regular" />
        </button>
      </div>

      {showReason && (
        <div className="mt-2 flex items-start gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.feedback.reason_placeholder}
            rows={2}
            maxLength={500}
            aria-label={t.feedback.reason_placeholder}
            className="flex-grow rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background resize-y"
          />
          <button
            type="button"
            onClick={submitReason}
            className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t.feedback.submit}
          </button>
        </div>
      )}
    </div>
  );
}

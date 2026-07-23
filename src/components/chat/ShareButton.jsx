import { useState } from 'react';
import { ShareNetwork, Check } from '@phosphor-icons/react';

/**
 * "Share" on an assistant answer (improvement-plan 12.1). POSTs a snapshot to
 * /api/share, then copies the public /a/[id] link to the clipboard. The answer
 * is snapshotted server-side into a dedicated public table — it never exposes
 * the conversation.
 */
export default function ShareButton({ lang, t, token, content, title, metadata }) {
  const [state, setState] = useState('idle'); // idle | sharing | copied | error
  const [manualUrl, setManualUrl] = useState(null); // shown if clipboard is blocked

  const share = async () => {
    if (state === 'sharing') return;
    setState('sharing');
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content, title: title || undefined, language: lang, metadata: metadata || {} }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.path) {
        setState('error');
        setTimeout(() => setState('idle'), 2500);
        return;
      }
      const url = `${window.location.origin}${data.path}`;
      try {
        await navigator.clipboard.writeText(url);
        setState('copied');
        setTimeout(() => setState('idle'), 2500);
      } catch {
        // Clipboard blocked (e.g. insecure context) — surface the link inline
        // so the user can copy it manually (no jarring window.prompt).
        setManualUrl(url);
        setState('idle');
      }
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  const label =
    state === 'copied'
      ? t.share.copied
      : state === 'error'
        ? t.share.error
        : state === 'sharing'
          ? t.share.sharing
          : t.share.share;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={share}
        disabled={state === 'sharing'}
        aria-label={t.share.share}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 shrink-0"
      >
        {state === 'copied' ? (
          <Check size={13} weight="regular" aria-hidden="true" />
        ) : (
          <ShareNetwork size={13} weight="regular" aria-hidden="true" />
        )}
        {label}
      </button>
      {manualUrl && (
        <input
          readOnly
          value={manualUrl}
          onFocus={(e) => e.target.select()}
          aria-label={t.share.copy_prompt}
          className="w-48 rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground"
        />
      )}
    </div>
  );
}

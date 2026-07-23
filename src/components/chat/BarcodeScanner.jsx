import { useEffect, useRef, useState } from 'react';

/**
 * Barcode scanner modal (improvement-plan 14.6) — progressive enhancement.
 *
 * Uses the native `BarcodeDetector` API + the rear camera. Only ever mounted
 * when `open` is true; the caller (ProductInput) hides the trigger entirely on
 * browsers without support, so there's no broken affordance. On a successful
 * read it stops the camera and hands the raw code back via `onDetected`.
 */
export function isBarcodeScanSupported() {
  return (
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export default function BarcodeScanner({ open, onClose, onDetected, t }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null); // 'permission' | 'generic' | null

  useEffect(() => {
    if (!open) return;
    let stream = null;
    let interval = null;
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
    };

    (async () => {
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});

        // eslint-disable-next-line no-undef
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        });

        interval = setInterval(async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const val = codes?.[0]?.rawValue;
            if (val) {
              stop();
              onDetected(val);
            }
          } catch {
            /* transient detect error — keep polling */
          }
        }, 300);
      } catch (err) {
        setError(err?.name === 'NotAllowedError' ? 'permission' : 'generic');
      }
    })();

    return stop;
  }, [open, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={t.chat.scan_title}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">{t.chat.scan_title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.chat.scan_close}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/90">
            <p className="text-sm">
              {error === 'permission' ? t.chat.scan_permission : t.chat.scan_error}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              {t.chat.scan_close}
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {/* Aiming frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-4/5 max-w-sm rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </>
        )}
      </div>

      {!error && (
        <p className="px-6 py-4 text-center text-sm text-white/80">{t.chat.scan_hint}</p>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

/**
 * Barcode scanner modal (improvement-plan 14.6) — progressive enhancement.
 *
 * Two paths:
 *   1. Native `BarcodeDetector` (Android Chrome, desktop Chrome/Edge).
 *   2. ZXing fallback, dynamically imported from a CDN only when the native API
 *      is missing (notably iOS Safari). No bundled dependency.
 *
 * Reliability tuning (from field testing): request a HIGH-RES rear camera with
 * continuous autofocus (low-res + fixed focus is why small retail barcodes
 * wouldn't decode), and restrict ZXing to retail 1-D formats with TRY_HARDER —
 * decoding every possible symbology at low res never converged.
 */

const ZXING_BROWSER_CDN = 'https://esm.sh/@zxing/browser@0.1.5';
const ZXING_LIB_CDN = 'https://esm.sh/@zxing/library@0.21.3';

// Higher resolution dramatically improves small-barcode decode rates.
const VIDEO_CONSTRAINTS = {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

export function isBarcodeScanSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export default function BarcodeScanner({ open, onClose, onDetected, t }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null); // 'permission' | 'generic' | null

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream = null; // native path
    let interval = null; // native path
    let zxingControls = null; // fallback path

    const stop = () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
      if (zxingControls) {
        try {
          zxingControls.stop();
        } catch {
          /* noop */
        }
      }
    };

    const succeed = (value) => {
      if (cancelled || !value) return;
      stop();
      onDetected(value);
    };

    const failed = (err) => {
      if (cancelled) return;
      setError(err?.name === 'NotAllowedError' ? 'permission' : 'generic');
    };

    // Best-effort continuous autofocus (ignored where unsupported, e.g. some iOS).
    const requestContinuousFocus = () => {
      try {
        const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
        track?.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      } catch {
        /* noop */
      }
    };

    (async () => {
      setError(null);
      try {
        if ('BarcodeDetector' in window) {
          // ---- Native path ----
          stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
          if (cancelled) return stop();
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = stream;
          await video.play().catch(() => {});
          requestContinuousFocus();

          // eslint-disable-next-line no-undef
          const detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
          });
          interval = setInterval(async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes?.[0]?.rawValue) succeed(codes[0].rawValue);
            } catch {
              /* transient — keep polling */
            }
          }, 200);
        } else {
          // ---- ZXing fallback (iOS Safari etc.) ----
          const [{ BrowserMultiFormatReader }, zx] = await Promise.all([
            import(/* @vite-ignore */ ZXING_BROWSER_CDN),
            import(/* @vite-ignore */ ZXING_LIB_CDN),
          ]);
          if (cancelled) return;

          const { DecodeHintType, BarcodeFormat } = zx;
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const reader = new BrowserMultiFormatReader(hints);
          zxingControls = await reader.decodeFromConstraints(
            { video: VIDEO_CONSTRAINTS },
            videoRef.current,
            (result) => {
              if (result) succeed(typeof result.getText === 'function' ? result.getText() : result.text);
            },
          );
          requestContinuousFocus();
        }
      } catch (err) {
        failed(err);
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

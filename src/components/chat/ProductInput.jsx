import { useEffect, useRef, useState } from 'react';

/**
 * Composer for the chat page.
 *
 * Responsibilities:
 *   - text submit (Enter to send, Shift+Enter newline)
 *   - Stop button while a stream is in progress
 *   - photo upload trigger (the actual extraction is wired in ChatInterface)
 *   - paste-from-clipboard image support (`onPaste`)
 *   - drag-and-drop image support
 *   - preview chip while a photo is queued or being extracted upstream
 *
 * Props:
 *   onSubmit(text)             - send the message
 *   onStop()                   - cancel an in-flight stream
 *   onUploadImage(file)        - hand a File off to the parent to call /api/vision-extract
 *   isLoading                  - true while a chat stream is running
 *   isExtracting               - true while the parent is calling /api/vision-extract
 *   uploadedImagePreview       - object URL of the queued photo, or null
 *   uploadedImageWarning       - optional inline warning string (e.g. "low confidence")
 *   onRemoveImage()            - clear the queued photo
 *   placeholder, stopLabel, uploadLabel, removeLabel, extractingLabel, photoAlt
 */
export default function ProductInput({
  onSubmit,
  onStop,
  onUploadImage,
  isLoading,
  isExtracting = false,
  uploadedImagePreview = null,
  uploadedImageWarning = null,
  onRemoveImage,
  placeholder,
  stopLabel = 'Stop',
  uploadLabel = 'Upload photo',
  removeLabel = 'Remove photo',
  extractingLabel = 'Reading photo…',
  photoAlt = 'Uploaded photo preview',
  /**
   * Optional ref forwarded onto the underlying <textarea>. Lets the parent
   * call `inputRef.current.dispatchEvent(new CustomEvent('cosmeticlens:set-text', { detail: { value } }))`
   * to seed the composer after a vision extraction.
   */
  inputRef,
}) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const localTextareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Bridge the externally-supplied ref to our local ref.
  const textareaRef = inputRef || localTextareaRef;

  const disabled = isLoading || isExtracting;

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!input.trim() || disabled) return;
    onSubmit(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  const handlePickFile = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) onUploadImage(file);
    // Allow the user to re-upload the same filename later.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e) => {
    if (!onUploadImage || disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onUploadImage(file);
          return;
        }
      }
    }
  };

  const handleDragOver = (e) => {
    if (!onUploadImage || disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!onUploadImage || disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadImage(file);
    }
  };

  // Public: allow parent to programmatically set the textarea text (used after
  // a successful photo extraction). We expose this by listening for a custom
  // event on the textarea ref — keeps the API minimal.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = (evt) => {
      const v = evt.detail?.value;
      if (typeof v === 'string') {
        setInput(v);
        requestAnimationFrame(() => {
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 200) + 'px';
          el.focus();
        });
      }
    };
    el.addEventListener('cosmeticlens:set-text', handler);
    return () => el.removeEventListener('cosmeticlens:set-text', handler);
  }, []);

  const showImageChip = Boolean(uploadedImagePreview) || isExtracting;
  const canSubmit = !disabled && input.trim().length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={
          'relative flex flex-col gap-2 rounded-2xl border bg-white shadow-sm px-4 py-2.5 transition-shadow ' +
          (isDragging
            ? 'border-stone-500 ring-2 ring-stone-400'
            : 'border-stone-300 focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-300')
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {showImageChip && (
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 border border-stone-200 px-2.5 py-2">
            {uploadedImagePreview ? (
              <img
                src={uploadedImagePreview}
                alt={photoAlt}
                className="h-12 w-12 rounded-md object-cover border border-stone-200 shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-md bg-stone-200 shrink-0 animate-pulse" />
            )}
            <div className="min-w-0 flex-1">
              {isExtracting ? (
                <div className="flex items-center gap-2 text-sm text-stone-700">
                  <span className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <span>{extractingLabel}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-stone-700 truncate">
                    {photoAlt}
                  </p>
                  {uploadedImageWarning && (
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                      {uploadedImageWarning}
                    </p>
                  )}
                </>
              )}
            </div>
            {!isExtracting && onRemoveImage && (
              <button
                type="button"
                onClick={onRemoveImage}
                className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors"
                aria-label={removeLabel}
                title={removeLabel}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Upload button */}
          <button
            type="button"
            onClick={handlePickFile}
            disabled={disabled}
            className="shrink-0 self-end flex items-center justify-center h-8 w-8 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            aria-label={uploadLabel}
            title={uploadLabel}
          >
            <svg className="w-4 h-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            // capture="environment" hints mobile browsers toward the rear camera.
            // It's a no-op on desktop.
            capture="environment"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm leading-6 text-stone-800 placeholder:text-stone-400 focus:outline-none max-h-[200px] py-1"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="shrink-0 self-end flex items-center justify-center h-8 w-8 rounded-lg bg-stone-800 text-white hover:bg-stone-700 transition-colors"
              aria-label={stopLabel}
              title={stopLabel}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              className="shrink-0 self-end flex items-center justify-center h-8 w-8 rounded-lg bg-stone-800 text-white disabled:opacity-25 hover:bg-stone-700 transition-colors"
              aria-label="Send"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

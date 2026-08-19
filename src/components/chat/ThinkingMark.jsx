/**
 * Line-built "agent thinking" mark (02g motion language).
 *
 * A circle drawn from vertical hairlines — the documentation-voice replacement
 * for generic bouncing dots. The lines breathe outward from the center via CSS
 * (`.think-mark` in global.css); under `prefers-reduced-motion` the animation
 * is disabled and the mark renders as a static glyph, which still reads as
 * "working" next to its caption.
 *
 * Color comes from `currentColor`, so tint it with a text-* token class.
 *
 * Props:
 *   size      — rendered square size in px (default 16)
 *   className — extra classes (e.g. "text-brand")
 */
export default function ThinkingMark({ size = 16, className = '' }) {
  return (
    <svg
      className={`think-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="2" y1="4.6" x2="2" y2="11.4" />
      <line x1="4" y1="2.4" x2="4" y2="13.6" />
      <line x1="6" y1="1.4" x2="6" y2="14.6" />
      <line x1="8" y1="1.1" x2="8" y2="14.9" />
      <line x1="10" y1="1.4" x2="10" y2="14.6" />
      <line x1="12" y1="2.4" x2="12" y2="13.6" />
      <line x1="14" y1="4.6" x2="14" y2="11.4" />
    </svg>
  );
}

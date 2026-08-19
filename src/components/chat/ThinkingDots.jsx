import { Microscope } from '@phosphor-icons/react';
import ThinkingMark from './ThinkingMark';

/**
 * "Thinking…" indicator shown while waiting for the first streamed token.
 * Distinct from the in-message streaming cursor — this is rendered as its
 * own message row above the input bar before any assistant content arrives.
 *
 * (Kept under its historical name; the bouncing dots were replaced by the
 * line-built ThinkingMark in the motion pass.)
 */
export default function ThinkingDots({ text }) {
  return (
    <div className="flex items-start gap-3 chat-bubble-enter">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-primary select-none">
        <Microscope size={16} weight="regular" />
      </div>
      <div className="flex items-center gap-2.5 py-2">
        <ThinkingMark size={15} className="text-foreground/70" />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

import { Microscope } from '@phosphor-icons/react';

export default function LoadingIndicator({ text }) {
  return (
    <div className="flex items-start gap-3 chat-bubble-enter">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-primary select-none">
        <Microscope size={16} weight="regular" />
      </div>
      <div className="flex items-center gap-2.5 py-2">
        <div className="flex space-x-1">
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/25 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/25 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/25 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

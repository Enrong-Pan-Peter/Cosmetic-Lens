export default function LoadingIndicator({ text }) {
  return (
    <div className="flex items-start gap-3 chat-bubble-enter">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
        🔍
      </div>
      <div className="rounded-xl rounded-tl-sm border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-muted-foreground">{text}</span>
        </div>
      </div>
    </div>
  );
}

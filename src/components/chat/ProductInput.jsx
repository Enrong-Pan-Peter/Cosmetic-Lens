import { useState } from 'react';

export default function ProductInput({ onSubmit, isLoading, placeholder, buttonText }) {
  const [input, setInput] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
      setInput('');
      setIsMultiline(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMultiline) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    setIsMultiline(value.includes(',') || value.includes('\n'));
  };

  const inputClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-3">
        <div className="flex-grow relative">
          {isMultiline ? (
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={4}
              className={`${inputClasses} resize-none pr-10`}
            />
          ) : (
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className={`${inputClasses} h-10 pr-10`}
            />
          )}

          {/* Toggle multiline button */}
          <button
            type="button"
            onClick={() => setIsMultiline(!isMultiline)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground transition-colors"
            title={isMultiline ? 'Single line' : 'Paste ingredient list'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMultiline ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">{buttonText}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

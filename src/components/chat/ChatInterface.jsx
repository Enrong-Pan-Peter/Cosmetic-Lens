import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ProductInput from './ProductInput';
import LoadingIndicator from './LoadingIndicator';

export default function ChatInterface({ lang, translations: t }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAnalyze = async (input) => {
    if (!input.trim() || isLoading) return;

    setError(null);

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: input,
          language: lang,
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data,
          cached: data.cached,
          source: data.source,       // 'verified' | 'llm_knowledge'
          product: data.product
        }]);
      } else {
        switch (data.error) {
          case 'rate_limit_exceeded':
            setError(t.chat.error_rate_limit);
            break;
          default:
            setError(t.chat.error_generic);
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(t.chat.error_generic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setError(null);
  };

  const examples = [
    t.chat.example_1,
    t.chat.example_2,
    t.chat.example_3
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] mx-auto max-w-4xl">
      {/* Messages area */}
      <div className="flex-grow overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl mb-4">
              {t.chat.title}
            </h1>
            <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-lg">
              {lang === 'zh'
                ? '输入产品名称或粘贴成分表，获取专业的成分分析'
                : 'Enter a product name or paste an ingredient list to get a professional analysis'}
            </p>

            {/* Tips card */}
            <div className="rounded-xl border border-border bg-card p-6 max-w-lg mx-auto mb-10 text-left shadow-sm">
              <h3 className="font-semibold text-card-foreground mb-3 text-sm">
                {t.chat.tips_title}
              </h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0" />
                  {t.chat.tip_1}
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0" />
                  {t.chat.tip_2}
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0" />
                  {t.chat.tip_3}
                </li>
              </ul>
            </div>

            {/* Example pills */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.chat.examples_title}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnalyze(example)}
                    className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                lang={lang}
              />
            ))}

            {isLoading && (
              <LoadingIndicator text={t.chat.analyzing} />
            )}

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background p-4">
        {messages.length > 0 && (
          <div className="flex justify-end mb-3">
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {t.chat.new_chat}
            </button>
          </div>
        )}

        <ProductInput
          onSubmit={handleAnalyze}
          isLoading={isLoading}
          placeholder={t.chat.placeholder}
          buttonText={t.chat.analyze_button}
        />
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Microscope } from '@phosphor-icons/react';
import ChatSidebar from './ChatSidebar';
import ChatMessage from './ChatMessage';
import ProductInput from './ProductInput';
import LoadingIndicator from './LoadingIndicator';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'cosmeticlens_chat_history';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to persist chat history:', e);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ChatInterface({ lang, translations: t }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Bootstrap from localStorage
  useEffect(() => {
    setChatHistory(loadHistory());
  }, []);

  // Scroll helper — called only when the user submits a message
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // -------------------------------------------------------------------
  // Persist helpers (always receive explicit values to avoid stale state)
  // -------------------------------------------------------------------
  const saveChat = useCallback(
    (msgs, chatId) => {
      if (!msgs || msgs.length === 0) return chatId;

      const id = chatId || generateId();
      const title =
        msgs.find((m) => m.role === 'user')?.content?.slice(0, 50) ||
        (lang === 'zh' ? '新分析' : 'New Analysis');
      const now = new Date().toISOString();

      setChatHistory((prev) => {
        const exists = prev.find((c) => c.id === id);
        let next;
        if (exists) {
          next = prev.map((c) =>
            c.id === id ? { ...c, messages: msgs, updatedAt: now, title } : c,
          );
        } else {
          next = [
            { id, title, messages: msgs, createdAt: now, updatedAt: now },
            ...prev,
          ];
        }
        persistHistory(next);
        return next;
      });

      return id;
    },
    [lang],
  );

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------
  const handleNewChat = () => {
    if (messages.length > 0 && activeChatId) {
      saveChat(messages, activeChatId);
    }
    setMessages([]);
    setActiveChatId(null);
    setError(null);
  };

  const handleSelectChat = (chatId) => {
    if (messages.length > 0 && activeChatId) {
      saveChat(messages, activeChatId);
    }
    const chat = chatHistory.find((c) => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setActiveChatId(chat.id);
      setError(null);
    }
  };

  const handleDeleteChat = (chatId) => {
    setChatHistory((prev) => {
      const next = prev.filter((c) => c.id !== chatId);
      persistHistory(next);
      return next;
    });
    if (activeChatId === chatId) {
      setMessages([]);
      setActiveChatId(null);
    }
  };

  const handleAnalyze = async (input) => {
    if (!input.trim() || isLoading) return;
    setError(null);

    const userMsg = { role: 'user', content: input };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    scrollToBottom();

    // Ensure we have a chat id
    let chatId = activeChatId;
    if (!chatId) {
      chatId = generateId();
      setActiveChatId(chatId);
    }
    saveChat(withUser, chatId);

    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: input, language: lang }),
      });
      const data = await res.json();

      if (data.success) {
        const assistantMsg = {
          role: 'assistant',
          content: data.data,
          cached: data.cached,
          source: data.source,
          product: data.product,
        };
        const full = [...withUser, assistantMsg];
        setMessages(full);
        saveChat(full, chatId);
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

  const examples = [t.chat.example_1, t.chat.example_2, t.chat.example_3];

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div className="flex h-full">
      {/* ---- Sidebar ---- */}
      <ChatSidebar
        lang={lang}
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ---- Main chat column ---- */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-gray-50">
        {/* Top bar */}
        <div className="flex items-center gap-3 h-12 px-4 border-b border-stone-200 bg-white shrink-0">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -ml-1 p-1.5 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span className="text-sm font-medium text-stone-800 truncate">
            {activeChatId
              ? chatHistory.find((c) => c.id === activeChatId)?.title || t.chat.title
              : t.chat.title}
          </span>

          {/* New chat shortcut (visible when a conversation is loaded) */}
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="ml-auto p-1.5 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title={lang === 'zh' ? '新对话' : 'New Chat'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Messages area — scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
            {messages.length === 0 ? (
              /* ---------- Empty state ---------- */
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-xl w-full">
                  <div className="mb-5 flex justify-center text-stone-400">
                    <Microscope size={48} weight="regular" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-stone-800 mb-2">
                    {t.chat.title}
                  </h1>
                  <p className="text-stone-500 mb-10 text-[15px] max-w-md mx-auto">
                    {lang === 'zh'
                      ? '输入产品名称或粘贴成分表，获取专业的成分分析'
                      : 'Enter a product name or paste an ingredient list for professional analysis'}
                  </p>

                  {/* Example cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    {examples.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnalyze(ex)}
                        className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors text-left shadow-sm"
                      >
                        <div className="text-[11px] font-medium text-stone-400 mb-1">
                          {lang === 'zh' ? '示例' : 'Example'}
                        </div>
                        <span className="leading-snug">{ex}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ---------- Conversation ---------- */
              <div className="space-y-8">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} lang={lang} />
                ))}

                {isLoading && <LoadingIndicator text={t.chat.analyzing} />}

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input bar — pinned to bottom */}
        <div className="shrink-0 border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-3">
            <ProductInput
              onSubmit={handleAnalyze}
              isLoading={isLoading}
              placeholder={t.chat.placeholder}
              buttonText={t.chat.analyze_button}
            />
            <p className="text-center text-[11px] text-stone-400 mt-2 select-none">
              {lang === 'zh'
                ? '成分分析仅供参考，不构成医疗建议'
                : 'Ingredient analysis is for reference only, not medical advice'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

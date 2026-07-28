import { useState, useRef, useEffect, useCallback } from 'react';
import { Microscope } from '@phosphor-icons/react';
import ChatSidebar from './ChatSidebar';
import BarcodeScanner from './BarcodeScanner';
import AnalysisDisplay from './AnalysisDisplay';
import { readLocalProfile } from '../../lib/profile-store';
import ChatMessage from './ChatMessage';
import ProductInput from './ProductInput';
import ThinkingDots from './ThinkingDots';
import { useAuth } from '../../lib/useAuth';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'cosmeticlens_chat_history';
// v1 was a bare array; v2 wraps it with a version field so future message
// shape changes can migrate instead of silently breaking old chats (P3.7).
const STORAGE_VERSION = 2;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed; // v1 (unversioned)
    if (parsed && Array.isArray(parsed.chats)) return parsed.chats; // v2+
    return [];
  } catch {
    return [];
  }
}

function persistHistory(history) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, chats: history }),
    );
  } catch (e) {
    console.warn('Failed to persist chat history:', e);
  }
}

// ---------------------------------------------------------------------------
// Server chat sync (P3) — authenticated users get their chats persisted in
// Supabase and synced across devices. localStorage remains the working cache
// (and the only store for anonymous users).
// ---------------------------------------------------------------------------
function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Strip bulky/ephemeral fields before shipping messages to the server. */
function sanitizeMessagesForServer(messages) {
  return (messages || []).slice(-80).map((m) => {
    const out = { role: m.role, content: m.content };
    if (m.intent) out.intent = m.intent;
    if (m.source) out.source = m.source;
    if (m.mode) out.mode = m.mode;
    if (m.stopped) out.stopped = true;
    if (m.fromPhoto) out.fromPhoto = true;
    if (Array.isArray(m.dupes) && m.dupes.length) out.dupes = m.dupes;
    if (Array.isArray(m.sources) && m.sources.length) out.sources = m.sources;
    if (Array.isArray(m.citations) && m.citations.length) out.citations = m.citations;
    if (Array.isArray(m.toolCalls) && m.toolCalls.length) {
      out.toolCalls = m.toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        status: tc.status,
        success: tc.success,
        durationMs: tc.durationMs,
        summary: tc.summary,
      }));
    }
    return out;
  });
}

async function apiListChats(token) {
  const res = await fetch('/api/chats', { headers: authHeaders(token) });
  if (!res.ok) throw new Error('chats_list_failed');
  return (await res.json())?.data ?? [];
}

async function apiGetChat(token, id) {
  const res = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('chat_get_failed');
  return (await res.json())?.data ?? null;
}

async function apiPutChat(token, chat) {
  await fetch(`/api/chats/${encodeURIComponent(chat.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({
      title: chat.title,
      createdAt: chat.createdAt,
      messages: sanitizeMessagesForServer(chat.messages),
    }),
  });
}

async function apiDeleteChat(token, id) {
  await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

function readActiveChatFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('chat');
}

function updateUrlChatId(chatId) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (chatId) {
    url.searchParams.set('chat', chatId);
  } else {
    url.searchParams.delete('chat');
  }
  window.history.replaceState({}, '', url.toString());
}

// ---------------------------------------------------------------------------
// Endpoint selection — agentic mode lets the LLM decide which tools to call
// (search_product / find_dupes / get_ingredient_interactions / search_knowledge_base)
// instead of pre-injecting context. Flip to false to fall back to the
// classic /api/chat pipeline.
// ---------------------------------------------------------------------------
const CHAT_ENDPOINT = '/api/chat-agentic';

// ---------------------------------------------------------------------------
// SSE parsing
// ---------------------------------------------------------------------------
async function consumeChatStream(response, handlers) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let blankIdx;
    while ((blankIdx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, blankIdx);
      buffer = buffer.slice(blankIdx + 2);

      let eventName = 'message';
      let dataLines = [];
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length === 0) continue;

      let payload;
      try {
        payload = JSON.parse(dataLines.join('\n'));
      } catch {
        continue;
      }

      switch (eventName) {
        case 'intent':
          handlers.onIntent?.(payload.intent);
          break;
        case 'meta':
          handlers.onMeta?.(payload);
          break;
        case 'agent_step':
          handlers.onAgentStep?.(payload);
          break;
        case 'tool_call':
          handlers.onToolCall?.(payload);
          break;
        case 'tool_result':
          handlers.onToolResult?.(payload);
          break;
        case 'citations':
          handlers.onCitations?.(payload);
          break;
        case 'delta':
          if (payload.delta) handlers.onDelta?.(payload.delta);
          break;
        case 'delta_reset':
          handlers.onDeltaReset?.();
          break;
        case 'done':
          handlers.onDone?.();
          return;
        case 'error':
          handlers.onError?.(payload.error || 'unknown error');
          return;
        default:
          break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Vision upload helpers
// ---------------------------------------------------------------------------
const VISION_MAX_BYTES = 8 * 1024 * 1024;
const VISION_ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function formatExtractedText(data, lang) {
  const lines = [];
  if (data.productName) lines.push(data.productName);
  if (data.ingredients?.length) {
    const header = lang === 'zh' ? '成分：' : 'Ingredients: ';
    lines.push(`${header}${data.ingredients.join(', ')}`);
  }
  return lines.join('\n\n');
}

export default function ChatInterface({ lang, translations: t }) {
  const { user, session, loading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingStarted, setStreamingStarted] = useState(false);
  const [error, setError] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Vision upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [photoWarning, setPhotoWarning] = useState(null);
  const [pendingPhotoMeta, setPendingPhotoMeta] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pdfMsg, setPdfMsg] = useState(null);

  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const extractAbortRef = useRef(null);
  const composerInputRef = useRef(null);

  // --- server sync plumbing (P3) ---
  const token = session?.access_token || null;
  const chatHistoryRef = useRef([]);
  const activeChatIdRef = useRef(null);
  const syncTimersRef = useRef({});
  const serverMergedRef = useRef(false);
  const pendingUrlChatRef = useRef(null);

  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  /** Debounced fire-and-forget PUT of one chat to the server. */
  const queueChatSync = useCallback(
    (chatId) => {
      if (!token || !chatId) return;
      clearTimeout(syncTimersRef.current[chatId]);
      syncTimersRef.current[chatId] = setTimeout(() => {
        const chat = chatHistoryRef.current.find((c) => c.id === chatId);
        if (chat && chat.messages?.length) {
          apiPutChat(token, chat).catch(() => {
            /* offline / server error — localStorage still has it */
          });
        }
      }, 800);
    },
    [token],
  );

  const displayName = user?.user_metadata?.display_name
    || user?.email?.split('@')[0]
    || null;

  // -------------------------------------------------------------------
  // Bootstrap: load history, optionally restore chat from ?chat=<id>
  // -------------------------------------------------------------------
  useEffect(() => {
    const history = loadHistory();
    setChatHistory(history);

    const urlChatId = readActiveChatFromUrl();
    if (urlChatId) {
      const chat = history.find((c) => c.id === urlChatId);
      if (chat) {
        setMessages(chat.messages);
        setActiveChatId(chat.id);
      } else {
        // Not local — maybe it's a server chat opened on a new device.
        // Keep the param and let the server-merge effect try to hydrate it.
        pendingUrlChatRef.current = urlChatId;
      }
    }
  }, []);

  // -------------------------------------------------------------------
  // Server merge (P3): once authenticated, pull the server chat list,
  // offer a one-time import of local-only chats, and hydrate a pending
  // ?chat= id that wasn't found locally.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!token || serverMergedRef.current) return;
    serverMergedRef.current = true;

    (async () => {
      try {
        const serverChats = await apiListChats(token);
        const serverIds = new Set(serverChats.map((c) => c.id));

        // One-time import offer when the account has no chats yet (3.4).
        const localOnly = chatHistoryRef.current.filter(
          (c) => !serverIds.has(c.id) && c.messages?.length,
        );
        if (serverChats.length === 0 && localOnly.length > 0) {
          const template =
            t.chat.import_confirm ||
            'Save your {n} local chats to your account so they sync across devices?';
          if (window.confirm(template.replace('{n}', String(localOnly.length)))) {
            for (const c of localOnly) {
              try {
                await apiPutChat(token, c);
              } catch {
                /* keep local copy */
              }
            }
          }
        }

        // Merge server entries into the sidebar list (remote stubs hydrate
        // lazily on select).
        setChatHistory((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          for (const sc of serverChats) {
            const existing = byId.get(sc.id);
            if (existing) {
              byId.set(sc.id, { ...existing, title: sc.title || existing.title });
            } else {
              byId.set(sc.id, {
                id: sc.id,
                title: sc.title,
                messages: [],
                createdAt: sc.created_at,
                updatedAt: sc.updated_at,
                _remote: true,
              });
            }
          }
          const next = [...byId.values()].sort(
            (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
          );
          persistHistory(next);
          return next;
        });

        // Cross-device deep link: ?chat=<id> that only exists server-side.
        const pendingId = pendingUrlChatRef.current;
        if (pendingId) {
          pendingUrlChatRef.current = null;
          const remote = await apiGetChat(token, pendingId).catch(() => null);
          if (remote?.messages?.length) {
            setChatHistory((prev) => {
              const next = prev.map((c) =>
                c.id === pendingId
                  ? { ...c, messages: remote.messages, title: remote.title || c.title }
                  : c,
              );
              persistHistory(next);
              return next;
            });
            setMessages(remote.messages);
            setActiveChatId(pendingId);
          } else {
            updateUrlChatId(null);
          }
        }
      } catch {
        /* offline / server error — anonymous-style local mode still works */
      }
    })();
  }, [token, t]);

  // Anonymous user with an unknown ?chat= id: clear it once auth resolves.
  useEffect(() => {
    if (!loading && !user && pendingUrlChatRef.current) {
      pendingUrlChatRef.current = null;
      updateUrlChatId(null);
    }
  }, [loading, user]);

  // Auto-scroll to bottom when a chat is freshly loaded from history.
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, [activeChatId]);

  // Smooth scroll while streaming so the latest text stays in view.
  useEffect(() => {
    if (!streamingStarted) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingStarted]);

  // -------------------------------------------------------------------
  // Persist helper
  // -------------------------------------------------------------------
  const saveChat = useCallback(
    (msgs, chatId, overrides = {}) => {
      if (!msgs || msgs.length === 0) return chatId;

      const id = chatId || generateId();
      const fallbackTitle =
        msgs.find((m) => m.role === 'user')?.content?.slice(0, 50) ||
        (lang === 'zh' ? '新分析' : 'New Analysis');
      const now = new Date().toISOString();

      setChatHistory((prev) => {
        const exists = prev.find((c) => c.id === id);
        let next;
        if (exists) {
          next = prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  messages: msgs,
                  updatedAt: now,
                  title: overrides.title ?? c.title ?? fallbackTitle,
                }
              : c,
          );
        } else {
          next = [
            {
              id,
              title: overrides.title ?? fallbackTitle,
              messages: msgs,
              createdAt: now,
              updatedAt: now,
            },
            ...prev,
          ];
        }
        persistHistory(next);
        return next;
      });

      queueChatSync(id);
      return id;
    },
    [lang, queueChatSync],
  );

  // -------------------------------------------------------------------
  // Generate a smart chat title (Bug 7) — best-effort, fire-and-forget
  // -------------------------------------------------------------------
  const generateTitle = useCallback(
    async (chatId, firstUserMessage) => {
      try {
        const res = await fetch('/api/chat-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: firstUserMessage, language: lang }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const title = data?.data?.title;
        if (!title || data?.data?.fallback) return;

        setChatHistory((prev) => {
          const next = prev.map((c) => (c.id === chatId ? { ...c, title } : c));
          persistHistory(next);
          return next;
        });
        queueChatSync(chatId);
      } catch {
        /* non-blocking */
      }
    },
    [lang, queueChatSync],
  );

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------
  const handleNewChat = () => {
    if (abortRef.current) abortRef.current.abort();
    if (messages.length > 0 && activeChatId) {
      saveChat(messages, activeChatId);
    }
    clearPhotoState();
    setMessages([]);
    setActiveChatId(null);
    setError(null);
    setIsLoading(false);
    setStreamingStarted(false);
    updateUrlChatId(null);
  };

  const handleSelectChat = (chatId) => {
    if (abortRef.current) abortRef.current.abort();
    if (messages.length > 0 && activeChatId && activeChatId !== chatId) {
      saveChat(messages, activeChatId);
    }
    const chat = chatHistory.find((c) => c.id === chatId);
    if (chat) {
      clearPhotoState();
      setMessages(chat.messages);
      setActiveChatId(chat.id);
      setError(null);
      setIsLoading(false);
      setStreamingStarted(false);
      updateUrlChatId(chat.id);

      // Remote stub from the server merge — hydrate messages lazily (P3).
      if ((!chat.messages || chat.messages.length === 0) && token) {
        apiGetChat(token, chatId)
          .then((remote) => {
            if (!remote?.messages?.length) return;
            setChatHistory((prev) => {
              const next = prev.map((c) =>
                c.id === chatId
                  ? { ...c, messages: remote.messages, title: remote.title || c.title }
                  : c,
              );
              persistHistory(next);
              return next;
            });
            if (activeChatIdRef.current === chatId) {
              setMessages(remote.messages);
            }
          })
          .catch(() => {
            /* keep empty; user can retry */
          });
      }
    }
  };

  const handleDeleteChat = (chatId) => {
    setChatHistory((prev) => {
      const next = prev.filter((c) => c.id !== chatId);
      persistHistory(next);
      return next;
    });
    if (token) apiDeleteChat(token, chatId).catch(() => {});
    if (activeChatId === chatId) {
      clearPhotoState();
      setMessages([]);
      setActiveChatId(null);
      updateUrlChatId(null);
    }
  };

  const handleStop = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStreamingStarted(false);
  };

  // -------------------------------------------------------------------
  // Vision upload: stage a photo, call /api/vision-extract, autofill text
  // -------------------------------------------------------------------
  const clearPhotoState = useCallback((revokePreview = true) => {
    if (revokePreview && uploadedPreview) {
      try {
        URL.revokeObjectURL(uploadedPreview);
      } catch {
        /* noop */
      }
    }
    setUploadedFile(null);
    setUploadedPreview(null);
    setPhotoWarning(null);
    setPendingPhotoMeta(null);
    setIsExtracting(false);
    if (extractAbortRef.current) {
      extractAbortRef.current.abort();
      extractAbortRef.current = null;
    }
  }, [uploadedPreview]);

  useEffect(() => () => {
    // Free the object URL on unmount.
    if (uploadedPreview) {
      try {
        URL.revokeObjectURL(uploadedPreview);
      } catch {
        /* noop */
      }
    }
  }, [uploadedPreview]);

  const seedComposer = (text) => {
    const el = composerInputRef.current;
    if (!el) return;
    el.dispatchEvent(
      new CustomEvent('cosmeticlens:set-text', { detail: { value: text } }),
    );
  };

  // PDF export (14.2): render just this answer into #print-region and print it
  // (browser "Save as PDF"). No dependency; the print-single CSS isolates it.
  const handleDownloadPdf = (msg) => {
    if (!msg?.content) return;
    setPdfMsg(msg);
    const cleanup = () => {
      document.body.classList.remove('print-single');
      window.removeEventListener('afterprint', cleanup);
      setPdfMsg(null);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      document.body.classList.add('print-single');
      window.print();
    }, 80);
  };

  // Barcode scan (14.6): look up the scanned code in Open Beauty Facts and seed
  // the composer with the product name + ingredients (same review-then-send
  // flow as a photo extraction).
  const handleBarcodeDetected = async (code) => {
    setScannerOpen(false);
    try {
      const res = await fetch(
        `/api/barcode?code=${encodeURIComponent(code)}&lang=${lang}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const data = await res.json();
      if (data.success && data.found) {
        const parts = [];
        if (data.product_name) {
          parts.push(data.brand ? `${data.product_name} (${data.brand})` : data.product_name);
        }
        if (data.ingredients_text) parts.push(data.ingredients_text);
        seedComposer(parts.join('\n') || `Barcode ${code}`);
        setError(null);
      } else {
        setError(t.chat.scan_not_found);
      }
    } catch {
      setError(t.chat.scan_error);
    }
  };

  const handleUploadImage = async (file) => {
    if (!file) return;
    if (isLoading || isExtracting) return;

    if (!VISION_ACCEPTED_TYPES.has(file.type)) {
      setError(t.chat.vision_error_unsupported_type);
      return;
    }
    if (file.size > VISION_MAX_BYTES) {
      setError(t.chat.vision_error_too_large);
      return;
    }

    setError(null);
    if (uploadedPreview) {
      try { URL.revokeObjectURL(uploadedPreview); } catch { /* noop */ }
    }
    const previewUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedPreview(previewUrl);
    setPhotoWarning(null);
    setIsExtracting(true);

    const controller = new AbortController();
    extractAbortRef.current = controller;

    try {
      const form = new FormData();
      form.append('image', file);
      form.append('language', lang);

      const res = await fetch('/api/vision-extract', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });

      let payload;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok || !payload?.success) {
        const code = payload?.code;
        let msg = t.chat.vision_error_generic;
        if (code === 'too_large') msg = t.chat.vision_error_too_large;
        else if (code === 'unsupported_type') msg = t.chat.vision_error_unsupported_type;
        else if (code === 'rate_limit_exceeded') msg = t.chat.error_rate_limit;
        setError(msg);
        clearPhotoState();
        return;
      }

      const data = payload.data;
      if (data.confidence === 'unreadable' || data.ingredients.length === 0) {
        setError(t.chat.extracted_unreadable);
        clearPhotoState();
        return;
      }

      const seedText = formatExtractedText(data, lang);
      if (seedText) seedComposer(seedText);

      setPhotoWarning(
        data.confidence === 'low' ? t.chat.extracted_low_confidence : null,
      );
      setPendingPhotoMeta({
        confidence: data.confidence,
        productName: data.productName,
        language: data.language,
      });
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        // User cancelled the upload.
      } else {
        console.error('vision extract failed:', err);
        setError(t.chat.vision_error_generic);
        clearPhotoState();
      }
    } finally {
      setIsExtracting(false);
      extractAbortRef.current = null;
    }
  };

  const handleRemoveImage = () => {
    clearPhotoState();
  };

  const handleAnalyze = async (input) => {
    if (!input.trim() || isLoading) return;
    setError(null);

    const hadPhoto = Boolean(pendingPhotoMeta);
    const userMsg = hadPhoto
      ? { role: 'user', content: input, fromPhoto: true, photoMeta: pendingPhotoMeta }
      : { role: 'user', content: input };
    const withUser = [...messages, userMsg];

    if (hadPhoto) {
      clearPhotoState();
    }
    const isFirstTurn = messages.length === 0;

    setMessages(withUser);

    let chatId = activeChatId;
    if (!chatId) {
      chatId = generateId();
      setActiveChatId(chatId);
      updateUrlChatId(chatId);
    }
    saveChat(withUser, chatId);

    setIsLoading(true);
    setStreamingStarted(false);

    const apiMessages = withUser.map((m) => ({ role: m.role, content: m.content }));
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = '';
    let intent = null;
    let source = null;
    let dupes;
    let sources;
    let citations;
    let mode = null;
    let cached = false;
    // Live tool-call trace — accumulated locally so we can update statuses
    // by id without re-rendering the parent state every keystroke.
    const toolCalls = [];
    const upsertToolCall = (id, patch) => {
      const idx = toolCalls.findIndex((t) => t.id === id);
      if (idx === -1) {
        toolCalls.push({ id, status: 'pending', ...patch });
      } else {
        toolCalls[idx] = { ...toolCalls[idx], ...patch };
      }
    };

    /** Update or insert the streaming assistant message with the latest fields. */
    const upsertAssistantMessage = (extra = {}) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        const base = {
          role: 'assistant',
          content: assistantContent,
          source,
          dupes,
          sources,
          intent,
          mode,
          cached,
          toolCalls: toolCalls.length ? [...toolCalls] : undefined,
          ...extra,
        };
        if (last && last.role === 'assistant' && last._streaming) {
          next[next.length - 1] = { ...last, ...base, _streaming: true };
        } else {
          next.push({ ...base, _streaming: true });
        }
        return next;
      });
    };

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          // Server derives identity from this verified JWT only —
          // it no longer accepts a userId in the body (IDOR fix).
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          messages: apiMessages,
          language: lang,
          // Anonymous personalization (14.1): send the local skin profile so
          // logged-out users get tailored answers. Authed users' server-side
          // profile always takes precedence (the server ignores this then).
          ...(session ? {} : { profile: readLocalProfile() || undefined }),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let errText = 'http_error';
        try {
          const errJson = await res.json();
          errText = errJson?.error || errText;
        } catch {
          /* not JSON */
        }
        throw new Error(errText);
      }

      await consumeChatStream(res, {
        onIntent: (i) => {
          intent = i;
        },
        onMeta: (meta) => {
          source = meta.source;
          if (meta.cached) cached = true;
          dupes = meta.dupes;
          if (Array.isArray(meta.sources) && meta.sources.length) {
            sources = meta.sources;
          }
          mode = meta.mode ?? mode;
          // If we're in agentic mode, surface the placeholder assistant
          // message early so the AgentTrace card appears before the first
          // delta lands.
          if (mode === 'agentic') {
            if (!streamingStarted) setStreamingStarted(true);
            upsertAssistantMessage();
          }
        },
        onAgentStep: () => {
          // Reserved for future "step X of N" UI. No-op for now.
        },
        onToolCall: (payload) => {
          // Discard any planning text that arrived before tool_calls locked in.
          assistantContent = '';
          upsertToolCall(payload.id, {
            name: payload.name,
            arguments: payload.arguments,
            status: 'pending',
          });
          upsertAssistantMessage();
        },
        onToolResult: (payload) => {
          upsertToolCall(payload.id, {
            name: payload.name,
            success: payload.success,
            durationMs: payload.durationMs,
            summary: payload.summary,
            status: 'done',
          });
          if (payload.verified) source = 'verified';
          if (Array.isArray(payload.dupes) && payload.dupes.length > 0) {
            dupes = payload.dupes;
          }
          if (Array.isArray(payload.sources) && payload.sources.length > 0) {
            const merged = [...(sources || []), ...payload.sources];
            const seen = new Set();
            sources = merged.filter((s) => {
              const key = `${s.type}|${s.name}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            }).slice(0, 8);
          }
          upsertAssistantMessage();
        },
        onCitations: (payload) => {
          if (Array.isArray(payload.citations) && payload.citations.length > 0) {
            citations = payload.citations;
          }
        },
        onDeltaReset: () => {
          assistantContent = '';
          upsertAssistantMessage();
        },
        onDelta: (delta) => {
          assistantContent += delta;
          if (!streamingStarted) setStreamingStarted(true);
          upsertAssistantMessage();
        },
        onDone: () => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            const finalMsg = {
              role: 'assistant',
              content: assistantContent,
              source,
              dupes,
              sources,
              citations,
              intent,
              mode,
              cached,
              toolCalls: toolCalls.length ? [...toolCalls] : undefined,
            };
            if (last && last.role === 'assistant' && last._streaming) {
              next[next.length - 1] = finalMsg;
            } else if (assistantContent || toolCalls.length) {
              next.push(finalMsg);
            }
            saveChat(next, chatId);
            return next;
          });
        },
        onError: (err) => {
          throw new Error(err || 'stream_error');
        },
      });
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        // User pressed Stop — keep whatever has streamed so far.
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && last._streaming) {
            next[next.length - 1] = {
              role: 'assistant',
              content: assistantContent || t.chat.stopped,
              source,
              dupes,
              sources,
              citations,
              intent,
              mode,
              toolCalls: toolCalls.length ? [...toolCalls] : undefined,
              stopped: true,
            };
            saveChat(next, chatId);
          }
          return next;
        });
      } else {
        console.error('Chat error:', err);
        const isRate = (err?.message || '').includes('rate_limit');
        setError(isRate ? t.chat.error_rate_limit : t.chat.error_generic);
        // Drop the streaming-marker assistant message (if any) so user can retry.
        setMessages((prev) => prev.filter((m) => !m._streaming));
      }
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      setStreamingStarted(false);
    }

    if (isFirstTurn && chatId) {
      generateTitle(chatId, input);
    }
  };

  const examples = [t.chat.example_1, t.chat.example_2, t.chat.example_3];

  // -------------------------------------------------------------------
  // Follow-up handlers — used by ChatMessage action buttons
  // -------------------------------------------------------------------
  const handleFindDupes = (productName) => {
    if (!productName?.trim()) return;
    const dupeQuery =
      lang === 'zh'
        ? `找平替：${productName}`
        : `Find me a dupe for ${productName}`;
    handleAnalyze(dupeQuery);
  };

  const handleSimilarIngredients = (topic) => {
    if (!topic?.trim()) return;
    const q =
      lang === 'zh'
        ? `请列出 5 个与上面提到的成分功效相似的成分（用表格：成分 / 功效 / 注意事项）。`
        : `Please list 5 ingredients with similar effects to the ones mentioned above. Use a markdown table with columns: ingredient, effect, caution.`;
    handleAnalyze(q);
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  const stopLabel = t.chat.stop;
  const thinkingText = t.chat.thinking;
  const lastMessage = messages[messages.length - 1];
  const showThinking = isLoading && (!lastMessage || lastMessage.role !== 'assistant');

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
        user={displayName ? { name: displayName } : null}
      />

      {/* ---- Main chat column ---- */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-background">
        {/* Top bar */}
        <div className="flex items-center gap-3 h-12 px-4 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -ml-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span className="text-sm font-medium text-foreground truncate">
            {activeChatId
              ? chatHistory.find((c) => c.id === activeChatId)?.title || t.chat.title
              : t.chat.title}
          </span>

          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={t.chat.new_chat}
              aria-label={t.chat.new_chat}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-xl w-full">
                  <div className="mb-5 flex justify-center text-muted-foreground">
                    <Microscope size={48} weight="regular" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
                    {t.chat.title}
                  </h1>
                  <p className="text-muted-foreground mb-10 text-[15px] max-w-md mx-auto">
                    {lang === 'zh'
                      ? '输入产品名称或粘贴成分表，获取专业的成分分析'
                      : 'Enter a product name or paste an ingredient list for professional analysis'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    {examples.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnalyze(ex)}
                        className="card-hover rounded-xl border border-border bg-card p-4 text-sm text-foreground hover:bg-accent text-left shadow-sm"
                      >
                        <div className="text-[11px] font-medium text-muted-foreground mb-1">
                          {lang === 'zh' ? '示例' : 'Example'}
                        </div>
                        <span className="leading-snug">{ex}</span>
                      </button>
                    ))}
                  </div>

                  {/* Discover other tools (helps mobile users find features) */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {lang === 'zh' ? '或探索：' : 'Or explore:'}
                    </span>
                    {[
                      { href: `/${lang}/quiz`, label: t.nav.quiz },
                      { href: `/${lang}/routine`, label: t.nav.routine },
                      { href: `/${lang}/ingredients`, label: t.nav.ingredients },
                      { href: `/${lang}/glossary`, label: t.nav.glossary },
                    ].map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="space-y-8"
                role="log"
                aria-live="polite"
                aria-busy={isLoading}
                aria-label={lang === 'zh' ? '对话记录' : 'Conversation'}
              >
                {messages.map((msg, i) => {
                  const prevUser = messages
                    .slice(0, i)
                    .reverse()
                    .find((m) => m.role === 'user');
                  return (
                    <ChatMessage
                      key={`${activeChatId || 'new'}-${i}`}
                      message={msg}
                      lang={lang}
                      prevUserContent={prevUser?.content}
                      t={t}
                      token={token}
                      chatId={activeChatId}
                      onDownloadPdf={msg.role === 'assistant' ? handleDownloadPdf : undefined}
                      onFindDupes={msg.role === 'assistant' ? handleFindDupes : undefined}
                      onSimilarIngredients={
                        msg.role === 'assistant' ? handleSimilarIngredients : undefined
                      }
                      agentLabels={{
                        title_thinking: t.chat.agent_thinking,
                        title_done: (n) =>
                          lang === 'zh'
                            ? `AI 智能体调用了 ${n} 个工具`
                            : `Agent used ${n} tool${n === 1 ? '' : 's'}`,
                        running: t.chat.agent_running,
                        no_tools: t.chat.agent_no_tools,
                        show: t.chat.agent_show,
                        hide: t.chat.agent_hide,
                      }}
                    />
                  );
                })}

                {showThinking && <ThinkingDots text={thinkingText} />}

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-border bg-card">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-3">
            <ProductInput
              onSubmit={handleAnalyze}
              onStop={handleStop}
              onUploadImage={handleUploadImage}
              onScanBarcode={() => setScannerOpen(true)}
              onRemoveImage={handleRemoveImage}
              uploadedImagePreview={uploadedPreview}
              uploadedImageWarning={photoWarning}
              isExtracting={isExtracting}
              isLoading={isLoading}
              placeholder={t.chat.placeholder}
              stopLabel={stopLabel}
              uploadLabel={t.chat.upload_photo}
              scanLabel={t.chat.scan_label}
              removeLabel={t.chat.remove_photo}
              extractingLabel={t.chat.extracting_photo}
              photoAlt={t.chat.photo_preview_alt}
              inputRef={composerInputRef}
            />
            <p className="text-center text-[11px] text-muted-foreground mt-2 select-none">
              {lang === 'zh'
                ? '成分分析仅供参考，不构成医疗建议'
                : 'Ingredient analysis is for reference only, not medical advice'}
            </p>
          </div>
        </div>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
        t={t}
      />

      {/* Off-screen single-answer render for PDF export (14.2) */}
      {pdfMsg && (
        <div id="print-region" className="hidden print:block p-8 text-foreground">
          <div className="mb-4 border-b border-border pb-3">
            <div className="text-lg font-semibold">{lang === 'zh' ? '成分透视' : 'CosmeticLens'}</div>
            {pdfMsg._query && <div className="mt-1 text-sm text-muted-foreground">{pdfMsg._query}</div>}
            {pdfMsg.product?.name && (
              <div className="text-sm text-muted-foreground">
                {pdfMsg.product.name}
                {pdfMsg.product.brand ? ` · ${pdfMsg.product.brand}` : ''}
              </div>
            )}
          </div>
          <AnalysisDisplay
            content={pdfMsg.content}
            lang={lang}
            dupes={pdfMsg.dupes}
            intent={pdfMsg.intent}
            stopped={false}
            streaming={false}
            prevUserContent={pdfMsg.product?.name || pdfMsg._query}
            onFindDupes={undefined}
            onSimilarIngredients={undefined}
          />
          {Array.isArray(pdfMsg.sources) && pdfMsg.sources.length > 0 && (
            <div className="mt-3 text-[11px] text-muted-foreground">
              {lang === 'zh' ? '资料来源：' : 'Sources: '}
              {pdfMsg.sources.slice(0, 8).map((s) => `${s.type ? `${s.type} · ` : ''}${s.name}`).join('  |  ')}
            </div>
          )}
          {Array.isArray(pdfMsg.citations) && pdfMsg.citations.length > 0 && (
            <div className="mt-3 text-[11px] text-muted-foreground">
              <div className="font-medium">{lang === 'zh' ? '延伸阅读：' : 'Further reading:'}</div>
              {pdfMsg.citations.map((c) => (
                <div key={c.id}>
                  {c.name} — {(c.refs || []).map((r) => `${r.journal || r.title}${r.year ? ` (${r.year})` : ''}`).join('; ')}
                </div>
              ))}
            </div>
          )}
          <p className="mt-6 text-xs text-muted-foreground">
            cosmetic-lens.vercel.app · {new Date().toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

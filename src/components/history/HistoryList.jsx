import { useState, useEffect } from 'react';
import { ChatCircleText, Trash, ArrowRight } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

/**
 * History page = the user's server-synced conversations (P3.5).
 * Replaces the dead analysis_history list: nothing wrote that table from the
 * chat flow, so logged-in users always saw an empty page. Chats are the real
 * unit of history now; each row deep-links back into the chat UI via ?chat=.
 */
export default function HistoryList({ lang, translations: t }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (result.success) {
        setChats(result.data || []);
      } else {
        setError(result.error || 'error');
      }
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('network');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.history.delete_confirm)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {lang === 'zh' ? '加载失败，请刷新重试。' : 'Failed to load. Please refresh and try again.'}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-16">
        <ChatCircleText size={40} className="mx-auto text-muted-foreground/60" />
        <h3 className="mt-4 text-lg font-medium text-foreground">{t.history.empty}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t.history.empty_desc}</p>
        <a
          href={`/${lang}/chat`}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t.history.analyze_now}
          <ArrowRight size={14} />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors"
        >
          <ChatCircleText size={20} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <a
              href={`/${lang}/chat?chat=${encodeURIComponent(chat.id)}`}
              className="block truncate text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {chat.title || (lang === 'zh' ? '未命名对话' : 'Untitled chat')}
            </a>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.history.updated_on} {formatDate(chat.updated_at)}
            </p>
          </div>
          <a
            href={`/${lang}/chat?chat=${encodeURIComponent(chat.id)}`}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            {t.history.open}
          </a>
          <button
            type="button"
            onClick={() => handleDelete(chat.id)}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label={t.history.delete}
            title={t.history.delete}
          >
            <Trash size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function HistoryList({ lang, translations: t }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/history?limit=50', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (result.success) {
        setHistory(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.history.delete_confirm)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (result.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">{t.history.empty}</h3>
        <p className="text-muted-foreground mb-6">{t.history.empty_desc}</p>
        <a
          href={`/${lang}/chat`}
          className="inline-flex px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t.history.analyze_now}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        {total} {lang === 'zh' ? '条记录' : 'analyses'}
      </p>

      {history.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-primary/20 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {item.product_name}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              {item.product_brand && (
                <span className="text-sm text-muted-foreground">{item.product_brand}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {t.history.analyzed_on} {formatDate(item.created_at)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {item.language === 'zh' ? '中文' : 'EN'}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleDelete(item.id)}
            className="ml-4 p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title={t.history.delete}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

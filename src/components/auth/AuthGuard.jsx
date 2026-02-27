import { useAuth } from '../../lib/useAuth';

export default function AuthGuard({ lang, children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">
            {lang === 'zh' ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = `/${lang}/login`;
    }
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">
          {lang === 'zh' ? '请先登录' : 'Please log in to continue'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

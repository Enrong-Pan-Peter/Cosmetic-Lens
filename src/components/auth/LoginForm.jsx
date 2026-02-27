import { useState } from 'react';
import { useAuth } from '../../lib/useAuth';

export default function LoginForm({ lang, translations: t }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await signIn(email, password);

      if (authError) {
        if (authError.message?.includes('Invalid login')) {
          setError(t.auth.error_invalid);
        } else {
          setError(t.auth.error_generic);
        }
        return;
      }

      window.location.href = `/${lang}/chat`;
    } catch {
      setError(t.auth.error_generic);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        setError(t.auth.error_generic);
        return;
      }
      setResetSent(true);
    } catch {
      setError(t.auth.error_generic);
    } finally {
      setLoading(false);
    }
  };

  // --- Reset password: success confirmation ---
  if (resetSent) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t.auth.reset_password}
        </h2>
        <p className="text-muted-foreground mb-6">{t.auth.reset_sent}</p>
        <button
          onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}
          className="text-primary font-medium hover:underline text-sm"
        >
          {lang === 'zh' ? '返回登录' : 'Back to login'}
        </button>
      </div>
    );
  }

  // --- Reset password: email form ---
  if (showReset) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">{t.auth.reset_password}</h1>
          <p className="text-muted-foreground mt-2">
            {lang === 'zh'
              ? '输入你的邮箱，我们将发送重置密码链接'
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t.auth.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.email_placeholder}
              required
              className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? (lang === 'zh' ? '发送中...' : 'Sending...')
              : (lang === 'zh' ? '发送重置链接' : 'Send Reset Link')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <button
            onClick={() => { setShowReset(false); setError(''); }}
            className="text-primary font-medium hover:underline"
          >
            {lang === 'zh' ? '返回登录' : 'Back to login'}
          </button>
        </p>
      </div>
    );
  }

  // --- Normal login form ---
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">{t.auth.login_title}</h1>
        <p className="text-muted-foreground mt-2">{t.auth.login_subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t.auth.email}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.auth.email_placeholder}
            required
            className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">
              {t.auth.password}
            </label>
            <button
              type="button"
              onClick={() => { setShowReset(true); setError(''); }}
              className="text-sm text-primary hover:underline"
            >
              {t.auth.forgot_password}
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.password_placeholder}
            required
            className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t.auth.logging_in : t.auth.login_button}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.auth.no_account}{' '}
        <a href={`/${lang}/signup`} className="text-primary font-medium hover:underline">
          {t.nav.signup}
        </a>
      </p>
    </div>
  );
}

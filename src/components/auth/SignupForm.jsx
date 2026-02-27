import { useState } from 'react';
import { useAuth } from '../../lib/useAuth';

export default function SignupForm({ lang, translations: t }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t.auth.error_weak_password);
      return;
    }

    if (password !== passwordConfirm) {
      setError(t.auth.error_mismatch);
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await signUp(email, password, displayName.trim() || undefined);

      if (authError) {
        if (authError.message?.includes('already registered')) {
          setError(t.auth.error_exists);
        } else {
          setError(t.auth.error_generic);
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError(t.auth.error_generic);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {lang === 'zh' ? '注册成功！' : 'Account Created!'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {lang === 'zh'
            ? '请查收确认邮件完成验证。'
            : 'Please check your email to confirm your account.'}
        </p>
        <a
          href={`/${lang}/login`}
          className="inline-flex px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t.auth.login_button}
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">{t.auth.signup_title}</h1>
        <p className="text-muted-foreground mt-2">{t.auth.signup_subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t.auth.display_name}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t.auth.display_name_placeholder}
            className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

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
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t.auth.password}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.password_placeholder}
            required
            minLength={8}
            className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t.auth.password_confirm}
          </label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
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
          {loading ? t.auth.creating_account : t.auth.signup_button}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.auth.has_account}{' '}
        <a href={`/${lang}/login`} className="text-primary font-medium hover:underline">
          {t.auth.login_button}
        </a>
      </p>
    </div>
  );
}

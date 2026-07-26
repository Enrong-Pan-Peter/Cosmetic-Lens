import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { readLocalProfile, writeLocalProfile } from '../../lib/profile-store';

/**
 * Skin-profile quiz (improvement-plan 14.1). A short multi-step form that
 * populates the same `profiles` fields the analysis pipeline already reads, so
 * every answer afterwards is personalized. Logged-in → Supabase via /api/profile;
 * anonymous → localStorage (the chat sends it in the request body).
 */
export default function SkinQuiz({ lang, t }) {
  const [token, setToken] = useState(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [answers, setAnswers] = useState({
    skin_type: '',
    sensitivity: '',
    concerns: [],
    is_pregnant: null,
  });

  // Load session + prefill from existing profile (server or local).
  useEffect(() => {
    let active = true;
    (async () => {
      let tok = null;
      try {
        const { data } = await supabase.auth.getSession();
        tok = data?.session?.access_token || null;
      } catch {
        /* supabase not configured */
      }
      if (!active) return;
      setToken(tok);

      let existing = null;
      if (tok) {
        try {
          const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${tok}` } });
          const j = await res.json();
          existing = j?.data || null;
        } catch {
          /* ignore */
        }
      } else {
        existing = readLocalProfile();
      }
      if (active && existing) {
        setAnswers((a) => ({
          skin_type: existing.skin_type || a.skin_type,
          sensitivity: existing.sensitivity || a.sensitivity,
          concerns: Array.isArray(existing.concerns) ? existing.concerns : a.concerns,
          is_pregnant: typeof existing.is_pregnant === 'boolean' ? existing.is_pregnant : a.is_pregnant,
        }));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const steps = useMemo(
    () => [
      {
        key: 'skin_type',
        title: t.quiz.q_skin,
        type: 'single',
        options: Object.entries(t.skin_types).map(([value, label]) => ({ value, label })),
      },
      {
        key: 'sensitivity',
        title: t.quiz.q_sensitivity,
        type: 'single',
        options: Object.entries(t.sensitivity_levels).map(([value, label]) => ({ value, label })),
      },
      {
        key: 'concerns',
        title: t.quiz.q_concerns,
        hint: t.quiz.q_concerns_hint,
        type: 'multi',
        options: Object.entries(t.concerns).map(([value, label]) => ({ value, label })),
      },
      {
        key: 'pregnancy',
        title: t.quiz.q_pregnancy,
        type: 'bool',
        options: [
          { value: true, label: t.quiz.pregnancy_yes },
          { value: false, label: t.quiz.pregnancy_no },
        ],
      },
    ],
    [t],
  );

  const current = steps[step];
  const total = steps.length;

  const canAdvance =
    current.type === 'multi'
      ? true
      : current.type === 'bool'
        ? answers.is_pregnant !== null
        : Boolean(answers[current.key]);

  const pickSingle = (value) => setAnswers((a) => ({ ...a, [current.key]: value }));
  const pickBool = (value) => setAnswers((a) => ({ ...a, is_pregnant: value }));
  const toggleConcern = (value) =>
    setAnswers((a) => ({
      ...a,
      concerns: a.concerns.includes(value)
        ? a.concerns.filter((c) => c !== value)
        : [...a.concerns, value],
    }));

  const finish = async () => {
    setSaving(true);
    setSaveError(false);
    const profile = {
      skin_type: answers.skin_type || undefined,
      sensitivity: answers.sensitivity || undefined,
      concerns: answers.concerns,
      is_pregnant: answers.is_pregnant === true,
    };
    // Always cache locally (drives anonymous personalization + prefill).
    writeLocalProfile(profile);
    // Logged in → persist to Supabase too.
    if (token) {
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(profile),
        });
        if (!res.ok) setSaveError(true);
      } catch {
        setSaveError(true);
      }
    }
    setSaving(false);
    setDone(true);
  };

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else finish();
  };
  const back = () => step > 0 && setStep(step - 1);

  const isSelected = (opt) => {
    if (current.type === 'multi') return answers.concerns.includes(opt.value);
    if (current.type === 'bool') return answers.is_pregnant === opt.value;
    return answers[current.key] === opt.value;
  };

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">{t.quiz.done_title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {token ? t.quiz.done_desc : t.quiz.done_desc_anon}
        </p>
        {saveError && (
          <p className="mt-2 text-xs text-destructive">{t.quiz.save_error}</p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <a
            href={`/${lang}/chat`}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t.quiz.done_cta}
          </a>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setStep(0);
            }}
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            {t.quiz.retake}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{t.quiz.step.replace('{n}', String(step + 1)).replace('{total}', String(total))}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
      {current.hint && <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>}

      <div className={`mt-4 grid gap-2 ${current.type === 'multi' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {current.options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() =>
              current.type === 'multi'
                ? toggleConcern(opt.value)
                : current.type === 'bool'
                  ? pickBool(opt.value)
                  : pickSingle(opt.value)
            }
            aria-pressed={isSelected(opt)}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              isSelected(opt)
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-background text-foreground hover:bg-accent'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
        >
          {t.quiz.back}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canAdvance || saving}
          className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {step < total - 1 ? t.quiz.next : saving ? t.quiz.saving : t.quiz.finish}
        </button>
      </div>
    </div>
  );
}

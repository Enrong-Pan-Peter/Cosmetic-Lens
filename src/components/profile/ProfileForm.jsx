import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ProfileForm({ lang, translations: t }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [profile, setProfile] = useState({
    skin_type: '',
    sensitivity: '',
    allergies: [],
    allergies_other: '',
    concerns: [],
    is_pregnant: false,
    price_preference: 'none',
    preferred_language: lang,
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        const { data } = await response.json();
        if (data) {
          setProfile((prev) => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: t.profile.login_required });
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profile),
      });

      const { success } = await response.json();

      if (success) {
        setMessage({ type: 'success', text: t.profile.saved });
      } else {
        setMessage({ type: 'error', text: t.profile.save_error });
      }
    } catch {
      setMessage({ type: 'error', text: t.profile.save_error });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setProfile((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-lg w-full" />
        ))}
      </div>
    );
  }

  const skinTypes = [
    { value: 'oily', label: t.skin_types.oily },
    { value: 'dry', label: t.skin_types.dry },
    { value: 'combination', label: t.skin_types.combination },
    { value: 'normal', label: t.skin_types.normal },
  ];

  const sensitivityLevels = [
    { value: 'low', label: t.sensitivity_levels.low },
    { value: 'medium', label: t.sensitivity_levels.medium },
    { value: 'high', label: t.sensitivity_levels.high },
  ];

  const concernsList = [
    { value: 'acne', label: t.concerns.acne },
    { value: 'aging', label: t.concerns.aging },
    { value: 'hyperpigmentation', label: t.concerns.hyperpigmentation },
    { value: 'dehydration', label: t.concerns.dehydration },
    { value: 'dryness', label: t.concerns.dryness },
    { value: 'oiliness', label: t.concerns.oiliness },
    { value: 'redness', label: t.concerns.redness },
    { value: 'large_pores', label: t.concerns.large_pores },
    { value: 'dullness', label: t.concerns.dullness },
    { value: 'texture', label: t.concerns.texture },
  ];

  const allergens = [
    { value: 'fragrance', label: t.allergens.fragrance },
    { value: 'essential_oils', label: t.allergens.essential_oils },
    { value: 'alcohol', label: t.allergens.alcohol },
    { value: 'sulfates', label: t.allergens.sulfates },
    { value: 'parabens', label: t.allergens.parabens },
    { value: 'silicones', label: t.allergens.silicones },
  ];

  const priceRanges = [
    { value: 'budget', label: t.price_ranges.budget },
    { value: 'mid', label: t.price_ranges.mid },
    { value: 'luxury', label: t.price_ranges.luxury },
    { value: 'none', label: t.price_ranges.no_preference },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Skin Type */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.profile.skin_type}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {skinTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleChange('skin_type', type.value)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                profile.skin_type === type.value
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-input text-foreground hover:bg-accent'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitivity */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.profile.sensitivity}
        </label>
        <div className="space-y-2">
          {sensitivityLevels.map((level) => (
            <label
              key={level.value}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                profile.sensitivity === level.value
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-background border-input hover:bg-accent'
              }`}
            >
              <input
                type="radio"
                name="sensitivity"
                value={level.value}
                checked={profile.sensitivity === level.value}
                onChange={(e) => handleChange('sensitivity', e.target.value)}
                className="sr-only"
              />
              <span className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                profile.sensitivity === level.value
                  ? 'border-primary'
                  : 'border-muted-foreground/30'
              }`}>
                {profile.sensitivity === level.value && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </span>
              <span className="text-sm text-foreground">{level.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Concerns */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.profile.concerns}
        </label>
        <div className="flex flex-wrap gap-2">
          {concernsList.map((concern) => (
            <button
              key={concern.value}
              type="button"
              onClick={() => toggleArrayItem('concerns', concern.value)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                profile.concerns?.includes(concern.value)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {concern.label}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.profile.allergies}
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {allergens.map((allergen) => (
            <button
              key={allergen.value}
              type="button"
              onClick={() => toggleArrayItem('allergies', allergen.value)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                profile.allergies?.includes(allergen.value)
                  ? 'bg-destructive/10 text-destructive border border-destructive/30'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {allergen.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={profile.allergies_other || ''}
          onChange={(e) => handleChange('allergies_other', e.target.value)}
          placeholder={t.profile.allergies_other}
          className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Pregnancy */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.is_pregnant}
            onChange={(e) => handleChange('is_pregnant', e.target.checked)}
            className="w-5 h-5 text-primary border-input rounded focus:ring-ring"
          />
          <div>
            <span className="font-medium text-foreground">{t.profile.pregnant}</span>
            <p className="text-sm text-muted-foreground">{t.profile.pregnant_desc}</p>
          </div>
        </label>
      </div>

      {/* Price Preference */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.profile.price_range}
        </label>
        <select
          value={profile.price_preference}
          onChange={(e) => handleChange('price_preference', e.target.value)}
          className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {priceRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? t.profile.saving : t.profile.save}
      </button>
    </form>
  );
}

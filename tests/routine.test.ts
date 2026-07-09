import { describe, expect, it } from 'vitest';
import { analyzeRoutine } from '../src/lib/routine';

describe('analyzeRoutine — cross-product conflicts', () => {
  it('flags Retinol + Glycolic Acid across two products as a caution', () => {
    const r = analyzeRoutine([
      { name: 'Night serum', ingredients: 'Aqua, Retinol, Glycerin' },
      { name: 'Exfoliant', ingredients: 'Aqua, Glycolic Acid, Panthenol' },
    ]);
    const c = r.conflicts.find(
      (x) => /Retinol/i.test(x.termA + x.termB) && /Glycolic/i.test(x.termA + x.termB),
    );
    expect(c).toBeTruthy();
    expect(c?.level).toBe('caution');
    // cross-product: different product indices
    expect(c?.a).not.toBe(c?.b);
    expect(r.summary.caution).toBeGreaterThanOrEqual(1);
  });

  it('flags Ascorbic Acid + Niacinamide as an info note', () => {
    const r = analyzeRoutine([
      { ingredients: 'Aqua, Ascorbic Acid, Ferulic Acid' },
      { ingredients: 'Aqua, Niacinamide' },
    ]);
    const c = r.conflicts.find((x) => x.level === 'info');
    expect(c).toBeTruthy();
    expect(r.summary.info).toBeGreaterThanOrEqual(1);
  });

  it('detects a within-product conflict (same product index on both sides)', () => {
    const r = analyzeRoutine([
      { ingredients: 'Aqua, Retinol, Glycolic Acid' },
      { ingredients: 'Aqua, Glycerin' },
    ]);
    const intra = r.conflicts.find((x) => x.a === x.b);
    expect(intra).toBeTruthy();
  });

  it('does NOT report synergistic pairs as conflicts (Hyaluronic Acid + Retinol)', () => {
    const r = analyzeRoutine([
      { ingredients: 'Aqua, Hyaluronic Acid' },
      { ingredients: 'Aqua, Retinol' },
    ]);
    expect(r.conflicts.length).toBe(0);
  });

  it('returns no conflicts for benign combinations', () => {
    const r = analyzeRoutine([
      { ingredients: 'Aqua, Glycerin, Panthenol' },
      { ingredients: 'Aqua, Squalane' },
    ]);
    expect(r.conflicts.length).toBe(0);
    expect(r.summary.avoid + r.summary.caution + r.summary.info).toBe(0);
  });
});

describe('analyzeRoutine — AM/PM placement', () => {
  it('places retinoids/acids in the PM and sunscreen in the AM', () => {
    const r = analyzeRoutine([
      { name: 'Retinol', ingredients: 'Aqua, Retinol, Squalane' },
      { name: 'Sunscreen', ingredients: 'Aqua, Zinc Oxide, Titanium Dioxide' },
    ]);
    expect(r.products[0].timing).toBe('pm');
    expect(r.products[1].timing).toBe('am');
  });

  it('counts unmatched (non-database) ingredients', () => {
    const r = analyzeRoutine([
      { ingredients: 'Niacinamide, Zzzfakeingredient' },
      { ingredients: 'Aqua, Glycerin' },
    ]);
    expect(r.products[0].unmatchedCount).toBeGreaterThanOrEqual(1);
  });
});

describe('analyzeRoutine — localization', () => {
  it('returns Chinese warnings when lang = zh', () => {
    const r = analyzeRoutine(
      [
        { ingredients: 'Aqua, Retinol' },
        { ingredients: 'Aqua, Glycolic Acid' },
      ],
      'zh',
    );
    const c = r.conflicts[0];
    expect(c).toBeTruthy();
    expect(/[一-鿿]/.test(c.warning)).toBe(true);
  });

  it('always includes layering tips', () => {
    const r = analyzeRoutine([
      { ingredients: 'Aqua, Retinol' },
      { ingredients: 'Aqua, Zinc Oxide' },
    ]);
    expect(r.tips.length).toBeGreaterThan(0);
  });
});

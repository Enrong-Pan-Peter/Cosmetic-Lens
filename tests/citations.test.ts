import { describe, it, expect } from 'vitest';
import {
  extractCitations,
  buildCitationIndex,
  type CitationIndexEntry,
} from '../src/lib/citations';

// Synthetic index — lets us test the matcher without depending on which
// ingredients happen to have literature in the data file this week.
const SYNTH: CitationIndexEntry[] = [
  {
    id: 'niacinamide',
    inci: 'Niacinamide',
    zh: '烟酰胺',
    terms: ['Niacinamide', '烟酰胺', 'Vitamin B3'],
    refs: [
      { type: 'literature', title: 'Review A', journal: 'J Derm', year: '2020', pmid: '1', url: 'https://x/1' },
      { type: 'literature', title: 'Review B', journal: 'Br J', year: '2021', pmid: '2', url: 'https://x/2' },
      { type: 'literature', title: 'Review C', journal: 'Am J', year: '2022', pmid: '3', url: 'https://x/3' },
    ],
  },
  {
    id: 'retinol',
    inci: 'Retinol',
    zh: '视黄醇',
    terms: ['Retinol', '视黄醇'],
    refs: [
      { type: 'literature', title: 'Retinoid review', journal: 'Cells', year: '2019', pmid: '9', url: 'https://x/9' },
    ],
  },
];

describe('extractCitations (matcher)', () => {
  it('matches an ingredient by name and returns its refs (capped to 2 by default)', () => {
    const out = extractCitations('Niacinamide helps brighten skin.', 'en', { index: SYNTH });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('niacinamide');
    expect(out[0].name).toBe('Niacinamide');
    expect(out[0].refs).toHaveLength(2); // default maxRefsEach
  });

  it('respects maxRefsEach', () => {
    const out = extractCitations('niacinamide', 'en', { index: SYNTH, maxRefsEach: 3 });
    expect(out[0].refs).toHaveLength(3);
  });

  it('orders results by first mention', () => {
    const out = extractCitations('First retinol, later niacinamide.', 'en', { index: SYNTH });
    expect(out.map((c) => c.id)).toEqual(['retinol', 'niacinamide']);
  });

  it('dedupes an ingredient mentioned more than once', () => {
    const out = extractCitations('niacinamide and yet more niacinamide', 'en', { index: SYNTH });
    expect(out).toHaveLength(1);
  });

  it('respects maxIngredients', () => {
    const out = extractCitations('retinol and niacinamide', 'en', {
      index: SYNTH,
      maxIngredients: 1,
    });
    expect(out).toHaveLength(1);
  });

  it('uses the localized (zh) name and matches CJK terms', () => {
    const out = extractCitations('这款精华含有烟酰胺。', 'zh', { index: SYNTH });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('niacinamide');
    expect(out[0].name).toBe('烟酰胺');
  });

  it('is word-boundary aware (does not match a substring of another word)', () => {
    // "retinoic acid" must not trip the "retinol" term.
    const out = extractCitations('Retinoic acid is a prescription drug.', 'en', { index: SYNTH });
    expect(out).toHaveLength(0);
  });

  it('returns [] for empty / whitespace / no-match input', () => {
    expect(extractCitations('', 'en', { index: SYNTH })).toEqual([]);
    expect(extractCitations('   ', 'en', { index: SYNTH })).toEqual([]);
    expect(extractCitations('hello world', 'en', { index: SYNTH })).toEqual([]);
  });
});

describe('buildCitationIndex (real data)', () => {
  const index = buildCitationIndex();

  it('has entries, each with literature refs and terms', () => {
    expect(index.length).toBeGreaterThan(0);
    for (const e of index) {
      expect(typeof e.id).toBe('string');
      expect(e.terms.length).toBeGreaterThan(0);
      expect(e.refs.length).toBeGreaterThan(0);
      expect(e.refs.every((r) => r.type === 'literature')).toBe(true);
    }
  });

  it('extracts a real ingredient when the answer names it', () => {
    // Pick a real entry + a real Latin term, so the test tracks the actual data.
    const entry =
      index.find((e) => e.terms.some((t) => /^[ -~]+$/.test(t) && t.length >= 4)) ?? index[0];
    const term = entry.terms.find((t) => /^[ -~]+$/.test(t)) ?? entry.terms[0];
    const out = extractCitations(`A serum with ${term} for the skin.`, 'en');
    expect(out.some((c) => c.id === entry.id)).toBe(true);
  });
});

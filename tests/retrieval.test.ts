import { describe, expect, it } from 'vitest';
import {
  queryTerms,
  lexicalScore,
  reciprocalRankFusion,
  rerankCandidates,
  type RetrievalCandidate,
} from '../src/lib/retrieval';

describe('queryTerms', () => {
  it('extracts Latin words and drops stopwords', () => {
    const terms = queryTerms('is retinol safe with niacinamide');
    expect(terms).toContain('retinol');
    expect(terms).toContain('niacinamide');
    expect(terms).not.toContain('is');
    expect(terms).not.toContain('with');
  });

  it('extracts CJK n-grams incl. the 3-char nickname inside a longer query', () => {
    const terms = queryTerms('兰蔻小黑瓶的平替');
    expect(terms).toContain('小黑瓶');
    expect(terms).toContain('兰蔻');
  });

  it('dedupes and caps', () => {
    const terms = queryTerms('retinol retinol retinol', 12);
    expect(terms.filter((t) => t === 'retinol')).toHaveLength(1);
    expect(queryTerms('a b c d e f g h i j k l m n', 5).length).toBeLessThanOrEqual(5);
  });
});

describe('lexicalScore', () => {
  it('is 1 for a full single-term match and 0 for no overlap', () => {
    expect(lexicalScore('niacinamide', 'contains niacinamide 5%')).toBe(1);
    expect(lexicalScore('retinol', 'a moisturizing cream')).toBe(0);
  });

  it('finds a zh nickname embedded in a product row', () => {
    const content = 'Product: Advanced Génifique by Lancôme. Also known as: 小黑瓶, genifique';
    expect(lexicalScore('兰蔻小黑瓶的平替', content)).toBeGreaterThan(0);
  });
});

describe('reciprocalRankFusion', () => {
  it('ranks an id appearing in both lists above singletons', () => {
    const fused = reciprocalRankFusion([
      ['a', 'b', 'c'],
      ['b', 'x', 'y'],
    ]);
    expect(fused[0]).toBe('b');
    expect(fused).toContain('a');
    expect(fused).toContain('x');
  });

  it('preserves order for a single list', () => {
    expect(reciprocalRankFusion([['a', 'b', 'c']])).toEqual(['a', 'b', 'c']);
  });
});

describe('rerankCandidates', () => {
  const product: RetrievalCandidate = {
    id: 'genifique',
    content: 'Product: Advanced Génifique by Lancôme. Also known as: 小黑瓶',
    content_type: 'product',
    metadata: { original_name: 'Advanced Génifique', aliases: ['小黑瓶'] },
    lexScore: undefined,
  };
  const unrelated: RetrievalCandidate = {
    id: 'random-cream',
    content: 'A hydrating moisturizer with glycerin',
    content_type: 'product',
    metadata: { original_name: 'Random Cream' },
    similarity: 0.4,
  };

  it('surfaces the nickname/alias match above an unrelated dense hit (ret-036)', () => {
    const ranked = rerankCandidates('兰蔻小黑瓶的平替', [unrelated, product]);
    expect(ranked[0].id).toBe('genifique');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('keeps a strong dense hit on top when there is no lexical signal', () => {
    const denseHit: RetrievalCandidate = {
      id: 'dense',
      content: 'unrelated text',
      content_type: 'ingredient',
      metadata: {},
      similarity: 0.9,
    };
    const weak: RetrievalCandidate = {
      id: 'weak',
      content: 'other',
      content_type: 'ingredient',
      metadata: {},
      similarity: 0.1,
    };
    const ranked = rerankCandidates('some query with no matches here', [weak, denseHit]);
    expect(ranked[0].id).toBe('dense');
  });
});

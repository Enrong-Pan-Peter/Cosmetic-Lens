import { describe, expect, it } from 'vitest';
import {
  looksLikeProductName,
  looksLikeDupeRequest,
  extractProductFromDupeRequest,
  findIngredientData,
  getInteractionWarnings,
  formatInteractionWarnings,
  buildSystemPrompt,
} from '../src/lib/prompt';

describe('looksLikeProductName', () => {
  it('recognizes EN brands', () => {
    expect(looksLikeProductName('CeraVe Foaming Facial Cleanser')).toBe(true);
    expect(looksLikeProductName('la roche-posay cicaplast')).toBe(true);
  });

  it('recognizes ZH brands (regression: ASCII \\b never matches CJK)', () => {
    expect(looksLikeProductName('适乐肤修护保湿润肤霜')).toBe(true);
    expect(looksLikeProductName('珂润润浸保湿滋养乳霜')).toBe(true);
    expect(looksLikeProductName('修丽可色修精华')).toBe(true);
  });

  it('rejects greetings and smalltalk (regression: "hello" was a product)', () => {
    for (const s of ['hello', 'hi!', 'thanks, that was helpful!', 'ok', '你好', '谢谢', '哈哈哈']) {
      expect(looksLikeProductName(s), s).toBe(false);
    }
  });

  it('pure-CJK text needs a product-category noun', () => {
    expect(looksLikeProductName('给我讲个笑话')).toBe(false);
    expect(looksLikeProductName('神仙水')).toBe('maybe');
  });

  it('questions are never product names', () => {
    expect(looksLikeProductName('Is retinol safe during pregnancy?')).toBe(false);
    expect(looksLikeProductName('孕妇可以用视黄醇吗？')).toBe(false);
  });

  it('title-cased unknown products are maybe', () => {
    expect(looksLikeProductName('Anua Heartleaf 77% Soothing Toner')).toBe('maybe');
  });

  it('lowercase chatter is not a product-name candidate', () => {
    expect(looksLikeProductName('retinol benefits')).toBe(false);
  });
});

describe('looksLikeDupeRequest', () => {
  it('EN phrasings', () => {
    for (const s of [
      'Find me a dupe for La Mer Crème de la Mer',
      'dupes for SkinCeuticals C E Ferulic',
      'cheaper alternative to Tatcha The Water Cream',
      'alternatives to Estée Lauder Advanced Night Repair',
      'affordable substitute for Augustinus Bader The Cream',
    ]) {
      expect(looksLikeDupeRequest(s), s).toBe(true);
    }
  });

  it('ZH phrasings', () => {
    for (const s of ['兰蔻小黑瓶有什么平替？', 'SK-II神仙水的平替', '推荐雅诗兰黛小棕瓶的替代品', '有没有类似至本洗面奶的产品']) {
      expect(looksLikeDupeRequest(s), s).toBe(true);
    }
  });

  it('non-dupe text', () => {
    expect(looksLikeDupeRequest('What is niacinamide?')).toBe(false);
    expect(looksLikeDupeRequest('CeraVe Foaming Facial Cleanser')).toBe(false);
  });
});

describe('extractProductFromDupeRequest', () => {
  it('extracts clean product names (regression: capturing (s?) returned "s")', () => {
    expect(extractProductFromDupeRequest('Find me a dupe for La Mer Crème de la Mer')).toBe('La Mer Crème de la Mer');
    expect(extractProductFromDupeRequest('alternatives to Estée Lauder Advanced Night Repair')).toBe('Estée Lauder Advanced Night Repair');
    expect(extractProductFromDupeRequest('affordable substitute for Augustinus Bader The Cream')).toBe('Augustinus Bader The Cream');
  });

  it('question marks are stripped', () => {
    expect(extractProductFromDupeRequest('dupe for Tatcha The Water Cream?')).toBe('Tatcha The Water Cream');
  });

  it('returns null for non-dupe text', () => {
    expect(extractProductFromDupeRequest('What is niacinamide?')).toBeNull();
  });
});

describe('findIngredientData', () => {
  it('matches ASCII comma lists', () => {
    const matches = findIngredientData('Aqua, Glycerin, Niacinamide, Phenoxyethanol');
    const ids = matches.map((m) => m.id);
    expect(ids).toContain('niacinamide');
    expect(ids).toContain('glycerin');
  });

  it('matches ZH 、-separated lists (regression: only ASCII commas split)', () => {
    const matches = findIngredientData('水、烟酰胺、透明质酸钠、苯氧乙醇');
    expect(matches.map((m) => m.id)).toContain('niacinamide');
  });

  it('caps input to 40 tokens without throwing', () => {
    const list = Array.from({ length: 80 }, (_, i) => `Ingredient${i}`).join(', ');
    expect(() => findIngredientData(list)).not.toThrow();
  });
});

describe('getInteractionWarnings', () => {
  it('flags retinol + glycolic acid', () => {
    const warnings = getInteractionWarnings(['Retinol', 'Glycolic Acid']);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('pregnancy warnings gate on profile.is_pregnant', () => {
    const withFlag = getInteractionWarnings(['Retinol'], { is_pregnant: true });
    const withoutFlag = getInteractionWarnings(['Retinol'], { is_pregnant: false });
    expect(withFlag.some((w) => w.level === 'avoid')).toBe(true);
    expect(withoutFlag.some((w) => w.level === 'avoid')).toBe(false);
  });

  it('empty input → no warnings', () => {
    expect(getInteractionWarnings([])).toEqual([]);
  });
});

describe('formatInteractionWarnings', () => {
  const warnings = [
    { level: 'avoid', warning_en: 'Do not combine.', warning_zh: '请勿同用。' },
    { level: 'caution', warning_en: 'Use on alternate nights.', warning_zh: '建议隔天使用。' },
  ];

  it('uses plain-text severity labels, not emoji', () => {
    const en = formatInteractionWarnings(warnings, 'en');
    expect(en).toContain('**Avoid:**');
    expect(en).toContain('**Caution:**');
    expect(en).not.toMatch(/[🚫⚠️ℹ️]/u);
    const zh = formatInteractionWarnings(warnings, 'zh');
    expect(zh).toContain('【避免】');
    expect(zh).toContain('【注意】');
  });

  it('empty warnings → empty string', () => {
    expect(formatInteractionWarnings([], 'en')).toBe('');
  });
});

describe('buildSystemPrompt', () => {
  it('substitutes language and profile placeholders', () => {
    const p = buildSystemPrompt('en', { skin_type: 'oily', is_pregnant: true });
    expect(p).not.toContain('{{LANGUAGE}}');
    expect(p).not.toContain('{{USER_PROFILE}}');
    expect(p).toContain('Oily');
    expect(p).toContain('Pregnant/Nursing: Yes');
  });

  it('zh prompt appends the terminology reference', () => {
    expect(buildSystemPrompt('zh', null)).toContain('中文术语参考');
  });
});

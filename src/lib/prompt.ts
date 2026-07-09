import systemPromptTemplate from '../data/system-prompt.md?raw';
import rawIngredientsDatabase from '../data/ingredients-database.json';
import translationsReference from '../data/translations-reference.json';
import rawIngredientInteractions from '../data/ingredient-interactions.json';

export type Language = 'en' | 'zh';

// ================================================
// Curated-data shapes (fields optional where the JSON varies per entry).
// The JSON imports are cast once here: TypeScript's inferred literal-union
// types for 100-entry JSON files make per-property access impractical, so
// the boundary cast to a documented interface is the honest tradeoff.
// ================================================

export interface IngredientRecord {
  id: string;
  inci_name: string;
  chinese_name: string;
  aliases_en?: string[];
  aliases_zh?: string[];
  category?: string;
  subcategory?: string;
  functions?: { en?: string[]; zh?: string[] };
  effective_concentration?: {
    minimum?: string;
    optimal?: string;
    maximum_beneficial?: string;
    notes_en?: string;
    notes_zh?: string;
  };
  evidence_level?: string;
  skin_types?: { suited?: string[]; caution?: string[] };
  concerns_addressed?: string[];
  interactions?: Array<{ ingredient?: string; details_en?: string; details_zh?: string }>;
  irritation_potential?: string;
  pregnancy_safe?: boolean;
  pregnancy_notes_en?: string;
  notes_en?: string;
  notes_zh?: string;
}

export interface InteractionPair {
  ingredients?: string[];
  ingredients_zh?: string[];
  level?: string;
  context?: string;
  warning_en?: string;
  warning_zh?: string;
}

const ingredientsDatabase = rawIngredientsDatabase as unknown as {
  ingredients: IngredientRecord[];
};
const ingredientInteractions = rawIngredientInteractions as unknown as {
  pairs: InteractionPair[];
};

/** Subset of IngredientRecord surfaced to the LLM for matched ingredients. */
export type MatchedIngredient = Pick<
  IngredientRecord,
  | 'id'
  | 'inci_name'
  | 'chinese_name'
  | 'category'
  | 'functions'
  | 'effective_concentration'
  | 'evidence_level'
  | 'skin_types'
  | 'concerns_addressed'
  | 'interactions'
  | 'irritation_potential'
  | 'pregnancy_safe'
  | 'notes_en'
  | 'notes_zh'
>;

/** Where the ingredient data came from */
export type IngredientSource = 'verified' | 'llm_knowledge';

export interface UserProfile {
  skin_type?: string;
  sensitivity?: string;
  allergies?: string[];
  allergies_other?: string;
  concerns?: string[];
  is_pregnant?: boolean;
  price_preference?: string;
}

export interface ProductContext {
  productName: string;
  productBrand?: string;
  ingredients: string;
  claims?: string[];
}

// ================================================
// SYSTEM PROMPT
// ================================================

export function buildSystemPrompt(
  language: Language,
  userProfile?: UserProfile | null
): string {
  let prompt = systemPromptTemplate;
  prompt = prompt.replace(/\{\{LANGUAGE\}\}/g, language);

  const profileText = userProfile
    ? formatUserProfile(userProfile, language)
    : getNoProfileText(language);
  prompt = prompt.replace('{{USER_PROFILE}}', profileText);

  // Append Chinese terminology reference to reinforce correct term usage
  if (language === 'zh') {
    prompt += `\n\n## 中文术语参考\n请严格使用以下标准中文术语，不要混入英文：\n\`\`\`json\n${JSON.stringify(translationsReference, null, 2)}\n\`\`\``;
  }

  return prompt;
}

// ================================================
// USER MESSAGE — VERIFIED INGREDIENTS (Mode A)
// ================================================

export function buildUserMessage(
  context: ProductContext,
  ingredientData: MatchedIngredient[],
  language: Language = 'en'
): string {
  let message = `[source: verified]\n\nPlease analyze this cosmetic product:\n\n`;
  message += `**Product Name:** ${context.productName}\n`;

  if (context.productBrand) {
    message += `**Brand:** ${context.productBrand}\n`;
  }

  message += `\n**Ingredient List:**\n${context.ingredients}\n`;

  if (context.claims?.length) {
    message += `\n**Marketing Claims:**\n${context.claims.join('\n')}\n`;
  }

  if (ingredientData.length > 0) {
    message += `\n**Relevant Ingredient Data from Knowledge Base:**\n`;
    message += '```json\n';
    message += JSON.stringify(ingredientData, null, 2);
    message += '\n```\n';
  }

  message += `\nAnalyze this product following your output format. Keep it concise (under 500 words).`;

  if (language === 'zh') {
    message += `\n\n**重要**: 请用自然流畅的简体中文回复。所有标题、表格头、评级标签都必须使用中文。不要在中文句子中混入英文单词（INCI成分名除外，放在括号中）。`;
  }

  return message;
}

// ================================================
// USER MESSAGE — LLM KNOWLEDGE FALLBACK (Mode B)
// ================================================

export function buildProductNameOnlyMessage(
  productName: string,
  language: Language,
  productBrand?: string
): string {
  let message = `[source: llm_knowledge]\n\n`;
  message += `The user is asking about a cosmetic product, but no verified ingredient list was found in external databases.\n\n`;
  message += `**Product Name:** ${productName}\n`;

  if (productBrand) {
    message += `**Brand:** ${productBrand}\n`;
  }

  message += `\nBased on your knowledge of this product's typical ingredients and formulation, provide an analysis.\n`;
  message += `If you confidently know this product (e.g., it's a well-known product from a brand that publishes formulations), provide a full analysis.\n`;
  message += `If you're not certain about the exact ingredients, clearly state this and provide general information about what this type of product typically contains.\n`;
  message += `If you truly don't know this product at all, say so honestly and suggest the user paste the ingredient list.\n\n`;
  message += `Follow your standard output format. Start with the confidence disclaimer banner as instructed for Mode B. Keep it concise (under 500 words).\n`;

  if (language === 'zh') {
    message += `\n**重要**: 请用自然流畅的简体中文回复。所有标题、表格头、评级标签都必须使用中文。不要在中文句子中混入英文单词（INCI成分名除外，放在括号中）。`;
  }

  return message;
}

// ================================================
// INGREDIENT DATA LOOKUP
// ================================================

export function findIngredientData(ingredientList: string): MatchedIngredient[] {
  const ingredients = ingredientList
    .split(/[,，、\n]/)
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
    .slice(0, 40);

  const matches: MatchedIngredient[] = [];
  const matchedIds = new Set<string>();

  for (const ingredient of ingredients) {
    if (ingredient.length < 3) continue;

    for (const dbIngredient of ingredientsDatabase.ingredients) {
      if (matchedIds.has(dbIngredient.id)) continue;

      const isMatch =
        dbIngredient.inci_name.toLowerCase() === ingredient ||
        dbIngredient.chinese_name === ingredient ||
        dbIngredient.aliases_en?.some((a) => a.toLowerCase() === ingredient) ||
        dbIngredient.aliases_zh?.some((a) => a === ingredient) ||
        ingredient.includes(dbIngredient.inci_name.toLowerCase()) ||
        dbIngredient.inci_name.toLowerCase().includes(ingredient);

      if (isMatch) {
        matches.push({
          id: dbIngredient.id,
          inci_name: dbIngredient.inci_name,
          chinese_name: dbIngredient.chinese_name,
          category: dbIngredient.category,
          functions: dbIngredient.functions,
          effective_concentration: dbIngredient.effective_concentration,
          evidence_level: dbIngredient.evidence_level,
          skin_types: dbIngredient.skin_types,
          concerns_addressed: dbIngredient.concerns_addressed,
          interactions: dbIngredient.interactions,
          irritation_potential: dbIngredient.irritation_potential,
          pregnancy_safe: dbIngredient.pregnancy_safe,
          notes_en: dbIngredient.notes_en,
          notes_zh: dbIngredient.notes_zh
        });
        matchedIds.add(dbIngredient.id);
        break;
      }
    }
  }

  return matches;
}

// ================================================
// INTERACTION WARNINGS
// ================================================

/** Map common names in interaction pairs to INCI/aliases for matching */
const INTERACTION_ALIASES: Record<string, string[]> = {
  'Vitamin C': ['ascorbic acid', 'l-ascorbic acid', 'vitamin c'],
  'Retinol': ['retinol', 'retinal', 'retinyl', 'tretinoin', 'adapalene', 'tazarotene'],
  'Niacinamide': ['niacinamide', 'nicotinamide', 'vitamin b3'],
  'Glycolic Acid': ['glycolic acid', 'glycolate'],
  'Lactic Acid': ['lactic acid', 'lactate'],
  'Salicylic Acid': ['salicylic acid', 'salicylate'],
  'Benzoyl Peroxide': ['benzoyl peroxide'],
  'AHAs': ['glycolic acid', 'lactic acid', 'mandelic acid', 'citric acid', 'malic acid'],
  'BHAs': ['salicylic acid', 'salicylate'],
};

function normalizeIngredientForMatch(name: string): string[] {
  const n = name.toLowerCase().trim();
  const aliases = INTERACTION_ALIASES[n] || [n];
  return [...new Set([n, ...aliases])];
}

export function productHasIngredient(productNames: string[], interactionIngredient: string): boolean {
  const productSet = new Set(productNames.map((p) => p.toLowerCase().trim()));
  const matchVariants = normalizeIngredientForMatch(interactionIngredient);
  return matchVariants.some((v) =>
    Array.from(productSet).some((p) => p.includes(v) || v.includes(p)),
  );
}

export interface InteractionWarning {
  level: string;
  warning_en: string;
  warning_zh: string;
}

export function getInteractionWarnings(
  ingredientInciNames: string[],
  userProfile?: UserProfile | null,
  lang: Language = 'en',
): InteractionWarning[] {
  const warnings: InteractionWarning[] = [];
  const productNames = ingredientInciNames.filter(Boolean);
  if (productNames.length === 0) return warnings;

  for (const pair of ingredientInteractions.pairs) {
    const ingredients = pair.ingredients || [];

    if (pair.context === 'pregnancy') {
      if (!userProfile?.is_pregnant) continue;
      const hasRetinoid = productNames.some((p) =>
        ['retinol', 'retinal', 'tretinoin', 'adapalene', 'tazarotene', '视黄醇', '维a酸', '阿达帕林'].some(
          (r) => p.toLowerCase().includes(r),
        ),
      );
      if (hasRetinoid) {
        warnings.push({
          level: pair.level || 'avoid',
          warning_en: pair.warning_en || '',
          warning_zh: pair.warning_zh || '',
        });
      }
      continue;
    }

    const allPresent = ingredients.every((ing) => productHasIngredient(productNames, ing));
    if (allPresent && ingredients.length > 0) {
      warnings.push({
        level: pair.level || 'info',
        warning_en: pair.warning_en || '',
        warning_zh: pair.warning_zh || '',
      });
    }
  }

  return warnings;
}

export function formatInteractionWarnings(warnings: InteractionWarning[], lang: Language): string {
  if (warnings.length === 0) return '';

  const isZh = lang === 'zh';
  const header = isZh ? '**成分相互作用提示**' : '**Ingredient Interaction Warnings**';
  const lines = warnings.map((w) => {
    const text = isZh ? w.warning_zh || w.warning_en : w.warning_en || w.warning_zh;
    // Plain-text severity labels — no emoji (design language is monochrome).
    const prefix =
      w.level === 'avoid'
        ? isZh ? '【避免】' : '**Avoid:**'
        : w.level === 'caution'
          ? isZh ? '【注意】' : '**Caution:**'
          : isZh ? '【提示】' : '**Note:**';
    return `${prefix} ${text}`;
  });

  return `${header}\n\n${lines.join('\n\n')}\n`;
}

// ================================================
// PROFILE FORMATTING HELPERS
// ================================================

function formatUserProfile(profile: UserProfile, language: Language): string {
  const isZh = language === 'zh';
  const lines: string[] = [];

  if (profile.skin_type) {
    const label = isZh ? '肤质' : 'Skin Type';
    const value = getSkinTypeLabel(profile.skin_type, language);
    lines.push(`${label}: ${value}`);
  }

  if (profile.sensitivity) {
    const label = isZh ? '敏感程度' : 'Sensitivity Level';
    const value = getSensitivityLabel(profile.sensitivity, language);
    lines.push(`${label}: ${value}`);
  }

  if (profile.allergies?.length || profile.allergies_other) {
    const label = isZh ? '已知过敏/敏感成分' : 'Known Allergies/Sensitivities';
    const allergyLabels = profile.allergies?.map(a => getAllergenLabel(a, language)) || [];
    if (profile.allergies_other) {
      allergyLabels.push(profile.allergies_other);
    }
    lines.push(`${label}: ${allergyLabels.join(', ')}`);
  }

  if (profile.concerns?.length) {
    const label = isZh ? '肌肤问题' : 'Skin Concerns';
    const concernLabels = profile.concerns.map(c => getConcernLabel(c, language));
    lines.push(`${label}: ${concernLabels.join(', ')}`);
  }

  if (profile.is_pregnant) {
    const text = isZh
      ? '孕期/哺乳期: 是 (请标注应避免的成分)'
      : 'Pregnant/Nursing: Yes (please flag ingredients to avoid)';
    lines.push(text);
  }

  if (profile.price_preference && profile.price_preference !== 'none') {
    const label = isZh ? '价格偏好' : 'Price Preference';
    const value = getPriceLabel(profile.price_preference, language);
    lines.push(`${label}: ${value}`);
  }

  if (lines.length === 0) {
    return getNoProfileText(language);
  }

  const header = isZh ? '用户档案:' : 'User Profile:';
  return `${header}\n${lines.join('\n')}`;
}

function getNoProfileText(language: Language): string {
  return language === 'zh'
    ? '用户未提供个人档案。请提供适合大多数用户的通用分析，并在适当时注明可能不适合某些肤质的情况。'
    : 'No user profile provided. Please provide general analysis suitable for most users, noting when something may not suit certain skin types.';
}

function getSkinTypeLabel(type: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    oily: { en: 'Oily', zh: '油性' },
    dry: { en: 'Dry', zh: '干性' },
    combination: { en: 'Combination', zh: '混合性' },
    normal: { en: 'Normal', zh: '中性' }
  };
  return labels[type]?.[lang] || type;
}

function getSensitivityLabel(level: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    low: { en: 'Low', zh: '低' },
    medium: { en: 'Medium', zh: '中' },
    high: { en: 'High', zh: '高' }
  };
  return labels[level]?.[lang] || level;
}

function getAllergenLabel(allergen: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    fragrance: { en: 'Fragrance', zh: '香精' },
    essential_oils: { en: 'Essential Oils', zh: '精油' },
    alcohol: { en: 'Drying Alcohols', zh: '干性酒精' },
    sulfates: { en: 'Sulfates', zh: '硫酸盐' },
    parabens: { en: 'Parabens', zh: '对羟基苯甲酸酯' },
    silicones: { en: 'Silicones', zh: '硅油' }
  };
  return labels[allergen]?.[lang] || allergen;
}

function getConcernLabel(concern: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    acne: { en: 'Acne', zh: '痘痘' },
    aging: { en: 'Aging', zh: '抗老' },
    hyperpigmentation: { en: 'Dark spots', zh: '色斑' },
    dehydration: { en: 'Dehydration', zh: '缺水' },
    dryness: { en: 'Dryness', zh: '干燥' },
    oiliness: { en: 'Excess oil', zh: '出油' },
    redness: { en: 'Redness', zh: '泛红' },
    large_pores: { en: 'Large pores', zh: '毛孔粗大' },
    dullness: { en: 'Dullness', zh: '暗沉' },
    texture: { en: 'Uneven texture', zh: '肤质不均' }
  };
  return labels[concern]?.[lang] || concern;
}

function getPriceLabel(price: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    budget: { en: 'Budget-friendly', zh: '平价' },
    mid: { en: 'Mid-range', zh: '中档' },
    luxury: { en: 'Luxury', zh: '高端' }
  };
  return labels[price]?.[lang] || price;
}

// ================================================
// HEURISTIC: does the input look like a product name?
// ================================================

const QUESTION_STARTS_EN = /^\s*(what|how|which|why|who|when|where|is|are|can|do|does|should|could|would|tell|explain|compare|recommend|suggest|find)/i;
const QUESTION_STARTS_ZH = /^\s*(什么|怎么|为什么|哪个|哪些|是否|能不能|可以|推荐|比较|建议|告诉|解释|找)/;
// NOTE: split into EN/ZH because JS `\b` is ASCII-only — a `\b`-wrapped
// alternation can NEVER match Chinese brand names (eval finding int-041..045:
// zh intent accuracy was 55% because every zh brand here was dead code).
const KNOWN_BRANDS_EN = /\b(cerave|la roche[- ]posay|the ordinary|neutrogena|cetaphil|olay|l'?oreal|laneige|innisfree|sulwhasoo|sk[- ]?ii|clinique|estee lauder|drunk elephant|paula'?s choice|cosrx|missha|bioderma|avene|vichy|eucerin|first aid beauty|tatcha|glow recipe|kiehl'?s|shiseido|fresh|origins|philosophy|murad|dermalogica|sunday riley|peter thomas roth|belief)\b/i;
const KNOWN_BRANDS_ZH = /(珂润|薇诺娜|玉泽|理肤泉|雅漾|适乐肤|修丽可|欧莱雅|兰蔻|资生堂|黛珂|至本|润百颜|敷尔佳|完美日记|雅诗兰黛|海蓝之谜|娇兰|香奈儿|科颜氏|倩碧)/;

function hasKnownBrand(text: string): boolean {
  return KNOWN_BRANDS_EN.test(text) || KNOWN_BRANDS_ZH.test(text);
}

// Greetings / smalltalk that must never be treated as a product name
// (eval finding int-032/033/057: "hello", "thanks!", "给我讲个笑话" → product).
const SMALLTALK = /^(hi|hiya|hello|hey|yo|sup|thanks?|thank you|thx|ty|ok(ay)?|cool|nice|great|awesome|perfect|good (morning|afternoon|evening|night)|bye|goodbye|see ya|lol|haha+|你好|您好|嗨|哈喽|谢谢|多谢|感谢|好的|好吧|行|嗯+|哦|噢|哈哈+|再见|拜拜|给我讲个笑话|讲个笑话)[!.。！？?～~\s]*$/i;

// For pure-CJK text, "maybe a product name" requires a product-category noun;
// otherwise short Chinese chatter falls through to product intent.
const ZH_PRODUCT_NOUN = /(霜|乳液|精华|面膜|洁面|洗面奶|爽肤水|化妆水|柔肤水|喷雾|防晒|眼霜|面霜|身体乳|洗发|护发素|沐浴|卸妆|唇膏|口红|粉底|气垫|凝露|凝胶|安瓶|原液|肌底液|神仙水|小黑瓶|小棕瓶|小灯泡|次抛)/;

/**
 * Returns `true` if the text likely names a product,
 * `false` if it's clearly a question/general text,
 * `'maybe'` when uncertain (try OBF lookup but don't block on failure).
 */
export function looksLikeProductName(text: string): boolean | 'maybe' {
  const trimmed = text.trim();

  // Clearly a question
  if (/[?？]/.test(trimmed)) return false;
  if (QUESTION_STARTS_EN.test(trimmed)) return false;
  if (QUESTION_STARTS_ZH.test(trimmed)) return false;

  // Greetings / smalltalk are never product names
  if (SMALLTALK.test(trimmed)) return false;

  // Long text is almost never just a product name
  if (trimmed.length > 100) return false;

  // Looks like a raw ingredient list (many commas — ASCII or CJK)
  if ((trimmed.match(/[,，、]/g) || []).length >= 4) return false;

  // Contains a known brand → likely a product
  if (hasKnownBrand(trimmed)) return true;

  const hasLatin = /[A-Za-z]/.test(trimmed);
  const hasCJK = /[一-鿿]/.test(trimmed);

  // Pure-CJK text: only plausible as a product name if it names a
  // product category (霜/精华/洁面/...). Otherwise it's chatter.
  if (hasCJK && !hasLatin) {
    return trimmed.length <= 40 && ZH_PRODUCT_NOUN.test(trimmed) ? 'maybe' : false;
  }

  // Latin text: needs product-name shape — short and either starting
  // uppercase or containing 2+ capitalized words. Lowercase chatter
  // ("hello", "retinol benefits") is not a product-name candidate.
  if (trimmed.length <= 60) {
    const capWords = (trimmed.match(/\b[A-Z][A-Za-z0-9'%-]*/g) || []).length;
    if (/^[A-Z0-9]/.test(trimmed) || capWords >= 2) return 'maybe';
  }

  return false;
}

const DUPE_PHRASES_EN = /\b(find\s+(me\s+)?(a\s+)?dupe|similar\s+(to|products?)|alternative(s?)\s+(to|for)|dupes?\s+for|cheaper\s+alternative|substitutes?\s+(for|to)|(affordable|budget|cheaper)\s+(version|substitute|dupe)s?)\b/i;
const DUPE_PHRASES_ZH = /(找|求|推荐)?(平替|替代|相似产品|替代品|有没有类似|类似[^，。？！]{0,15}的产品|平价版)/;

export function looksLikeDupeRequest(text: string): boolean {
  if (text == null || typeof text !== 'string') return false;
  const t = text.trim();
  return DUPE_PHRASES_EN.test(t) || DUPE_PHRASES_ZH.test(t);
}

/** Extract product name from dupe request, e.g. "find dupe for La Mer" -> "La Mer" */
export function extractProductFromDupeRequest(text: string): string | null {
  if (text == null || typeof text !== 'string') return null;
  const t = text.trim();
  // NOTE: `alternative(?:s)?` must be non-capturing — a capturing `(s?)`
  // made group 1 the letter "s" for "alternatives to X" (latent bug found
  // during the P6 typing pass; covered by tests/prompt-heuristics.test.ts).
  const enMatch = t.match(/(?:dupes?\s+for|similar\s+to|alternative(?:s)?\s+(?:to|for)|substitutes?\s+(?:for|to))\s+(.+?)(?:\?|$)/i);
  if (enMatch && enMatch[1] != null) return enMatch[1].trim();
  const zhMatch = t.match(/(?:平替|替代|相似于?)\s*[：:]\s*(.+?)(?:\?|？|$)/);
  if (zhMatch && zhMatch[1] != null) return zhMatch[1].trim();
  if (looksLikeDupeRequest(t) && t.length < 80) return t.replace(DUPE_PHRASES_EN, '').replace(DUPE_PHRASES_ZH, '').trim() || null;
  return null;
}

// ================================================
// ENRICH a user message with product / ingredient data
// ================================================

export function enrichMessageWithIngredients(
  userMessage: string,
  productName: string,
  ingredientList: string | null,
  ingredientData: MatchedIngredient[],
  source: IngredientSource,
  language: Language,
): string {
  const parts: string[] = [`User asks: ${userMessage}`];

  parts.push(`\n[source: ${source}]`);
  parts.push(`Product: ${productName}`);

  if (ingredientList) {
    parts.push(`Ingredient List:\n${ingredientList}`);
  }

  if (ingredientData.length > 0) {
    parts.push(`Relevant Ingredient Data:\n\`\`\`json\n${JSON.stringify(ingredientData, null, 2)}\n\`\`\``);
  }

  if (language === 'zh') {
    parts.push('\n**重要**: 请用自然流畅的简体中文回复。');
  }

  return parts.join('\n');
}

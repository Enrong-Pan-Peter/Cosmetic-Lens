// @ts-nocheck - raw import for markdown
import systemPromptTemplate from '../data/system-prompt.md?raw';
import ingredientsDatabase from '../data/ingredients-database.json';
import translationsReference from '../data/translations-reference.json';

export type Language = 'en' | 'zh';

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
  ingredientData: any[],
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

export function findIngredientData(ingredientList: string): any[] {
  const ingredients = ingredientList
    .split(/[,\n]/)
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
    .slice(0, 40);

  const matches: any[] = [];
  const matchedIds = new Set<string>();

  for (const ingredient of ingredients) {
    if (ingredient.length < 3) continue;

    for (const dbIngredient of ingredientsDatabase.ingredients) {
      if (matchedIds.has(dbIngredient.id)) continue;

      const isMatch =
        dbIngredient.inci_name.toLowerCase() === ingredient ||
        dbIngredient.chinese_name === ingredient ||
        dbIngredient.aliases_en?.some((a: string) => a.toLowerCase() === ingredient) ||
        dbIngredient.aliases_zh?.some((a: string) => a === ingredient) ||
        ingredient.includes(dbIngredient.inci_name.toLowerCase()) ||
        dbIngredient.inci_name.toLowerCase().includes(ingredient);

      if (isMatch) {
        matches.push({
          id: dbIngredient.id,
          inci_name: dbIngredient.inci_name,
          chinese_name: dbIngredient.chinese_name,
          category: dbIngredient.category,
          functions: dbIngredient.functions,
          effective_concentration: (dbIngredient as any).effective_concentration,
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

/**
 * Intent classifier for chat messages.
 *
 * Used to:
 *   - decide which mode the system prompt should follow
 *     (product analysis, dupe-first, knowledge Q&A)
 *   - decide whether to show the "Find similar products" affordance
 *     vs. a "Similar ingredients" affordance under an assistant reply
 *   - keep the same intent across simple follow-up questions
 *     (when previous user message was about a product)
 *
 * The classifier is intentionally heuristic / regex-based to stay fast and
 * cost-free. We can promote it to an LLM call later if accuracy demands it.
 *
 * Important: `knowledge` is reserved for **cosmetic-domain** questions only.
 * A generic English question like "What is Fourier series analysis?" must
 * classify as `other` so the UI doesn't offer a "Similar ingredients" action.
 */

import {
  looksLikeDupeRequest,
  looksLikeProductName,
} from './prompt';

export type ChatIntent = 'product' | 'dupe' | 'knowledge' | 'other';

export interface ClassifyOptions {
  /** Intent of the previous user turn, if any (helps disambiguate follow-ups). */
  previousIntent?: ChatIntent;
}

const KNOWLEDGE_HINTS_EN = /\b(what|how|why|which|who|when|where|is|are|can|do|does|should|could|would|tell|explain|compare|recommend|suggest|safe|good for|bad for|difference|mean|work)\b/i;
const KNOWLEDGE_HINTS_ZH = /(什么|怎么|为什么|哪个|哪些|是否|能不能|可以|推荐|区别|意思|安全|适合|不适合|作用|功效)/;

const FOLLOWUP_HINTS_EN = /\b(it|this|that|the (same|previous) (one|product)|previous (one|product)|same (one|product))\b/i;
const FOLLOWUP_HINTS_ZH = /(它|这个|那个|这款|那款|前面|前一个|刚才|之前)/;

/**
 * Cosmetic-domain vocabulary. A question is only considered a `knowledge`
 * intent when it both looks like a question AND mentions at least one of
 * these terms. Keeps off-topic questions ("what is Fourier series?") out of
 * the cosmetic flow.
 *
 * Keep this list broad but not so broad that it matches common English/
 * Chinese words. Prefer multi-word phrases and rare technical terms.
 */
const COSMETIC_DOMAIN_EN = new RegExp(
  [
    // Generic product / category terms
    'ingredient(s|\\s+list)?',
    'inci',
    'formula(tion)?',
    'product(\\s+label|\\s+claim)?',
    'cosmetic',
    'skin\\s?care|skincare',
    'hair\\s?care|haircare',
    'makeup|make[-\\s]up',
    'moisturi[sz]er',
    'cleanser|toner|essence|serum|cream|lotion|balm|mask',
    'sunscreen|spf|uv\\s?filter',
    'shampoo|conditioner|hair\\s+(dye|mask|oil|serum)',
    'body\\s+(wash|lotion|cream|butter|oil)',
    'lip\\s+(stick|balm|gloss|tint|liner)',
    'foundation|concealer|primer|mascara|eyeshadow|blush|highlighter',
    'fragrance|perfume|cologne|eau\\s+de',
    'dupe|alternative|substitute|equivalent',

    // Skin biology / concerns
    'skin\\s+(type|barrier|tone|texture)|skin\\s+(barrier|micro)biome',
    'oily|dry|combination|sensitive\\s+skin|normal\\s+skin',
    'acne|pimple|breakout|blemish|comedone|blackhead|whitehead|cystic',
    'pore|sebum|sebaceous',
    'wrinkle|fine\\s+line|sagging|elasticity',
    'hyperpigment|dark\\s+spot|melasma|sun\\s+damage|age\\s+spot',
    'eczema|rosacea|dermatitis|psoriasis|keratosis',
    'irritation|redness|inflamm|allergic|allergen|hypoallergen',
    'hydrat|moisture|dehydrat',
    'brighten|whiten(ing)?|even\\s+tone',
    'anti[-\\s]?aging|anti[-\\s]?wrinkle|firming|plumping',
    'exfoliat',

    // Active ingredient names
    'retinol|retin(al|oid)|tretinoin|adapalene|bakuchiol',
    'niacinamide|nicotinamide',
    'hyaluron(ic)?(\\s+acid)?',
    'ceramide|cholesterol|phytosphingosine',
    'glycerin|propanediol|squalane|squalene',
    'vitamin\\s?[abcdef]|tocopherol|ascorb(ic|yl)|panthenol',
    'peptide',
    'aha|bha|pha|salicylic|glycolic|lactic|mandelic|azelaic|tranexamic|kojic|arbutin|alpha\\s+hydroxy|beta\\s+hydroxy',
    'allantoin|centella|asiatic|madecassoside',
    'paraben|sulfate|sulphate|sls|sles',
    'silicone|dimethicone|cyclomethicone',
    'fatty\\s+(acid|alcohol)',
    'comedogen(ic)?|non[-\\s]?comedogen',
  ].join('|'),
  'i',
);

const COSMETIC_DOMAIN_ZH = /(成分|配方|护肤|化妆|化妆品|化妆水|爽肤水|柔肤水|精华|乳液|面霜|眼霜|身体乳|沐浴露|洗发水|护发素|洁面|卸妆|防晒|视黄醇|烟酰胺|玻尿酸|透明质酸|神经酰胺|维生素\s?[ABCDEFK]?|甘油|香精|香料|防腐剂|表面活性剂|肽|果酸|水杨酸|乳酸|杏仁酸|曲酸|熊果苷|传明酸|壬二酸|杜鹃花酸|甘草|积雪草|马齿苋|痘|粉刺|黑头|白头|闭口|毛孔|皮肤|肤质|干皮|油皮|混油|混合(性|肌)|敏感|美白|保湿|补水|抗衰|抗老|抗氧化|修复|屏障|抗痘|祛痘|去角质|平替|替代|相似(产品|的产品)|类似(产品|的产品)|早[Cc]晚[Aa]|刷酸|以油养肤|成分党)/;

// Ingredient lists arrive with ASCII commas OR CJK separators\uff08\uff0c\u3001\uff09\u2014
// eval finding e2e-024: zh pastes use \u3001 and were never detected.
const LIST_SEPARATORS = /[,\uff0c\u3001]/g;
const INGREDIENT_LIST_LIKELY = /[,\uff0c\u3001]\s*[A-Za-z\u4e00-\u9fa5]/;

function looksLikeIngredientList(text: string): boolean {
  if (!text) return false;
  if (text.length < 30) return false;
  const commaCount = (text.match(LIST_SEPARATORS) ?? []).length;
  if (commaCount >= 4 && INGREDIENT_LIST_LIKELY.test(text)) return true;
  if (/^\s*\d*\s*[A-Z][a-z]+ [A-Z]/.test(text) && commaCount >= 3) return true;
  return false;
}

/**
 * Title-cased, product-shaped short text ("Anua Heartleaf 77% Soothing
 * Toner"). Used to keep the domain-term\u2192knowledge rule from eating product
 * names that contain category words like "Toner"/"Serum" (eval finding
 * int-011/012, e2e-005).
 */
function looksTitleCasedProductish(text: string): boolean {
  if (text.length > 60) return false;
  const capWords = (text.match(/\b[A-Z][A-Za-z0-9'%+.-]*/g) ?? []).length;
  return capWords >= 2;
}

function hasCosmeticDomainTerm(text: string): boolean {
  return COSMETIC_DOMAIN_EN.test(text) || COSMETIC_DOMAIN_ZH.test(text);
}

function hasKnowledgeHint(text: string): boolean {
  return KNOWLEDGE_HINTS_EN.test(text) || KNOWLEDGE_HINTS_ZH.test(text);
}

function looksLikeFollowup(text: string): boolean {
  return FOLLOWUP_HINTS_EN.test(text) || FOLLOWUP_HINTS_ZH.test(text);
}

/**
 * Classify a single user message.
 *
 * Order of checks matters:
 *   1. Dupe phrase wins — very specific.
 *   2. Long-ish ingredient-list shape → product (paste workflow).
 *   3. Heuristic "looks like a product name" (delegates to existing classifier).
 *   4. Question shape + cosmetic-domain keyword → knowledge.
 *   5. Question shape without cosmetic keyword → off-topic. If it also looks
 *      like a follow-up and we know the previous intent, inherit it.
 *   6. No question but mentions a cosmetic term → knowledge (e.g. "retinol benefits").
 *   7. Short, plausibly a product name (`'maybe'`) → product.
 *   8. Pure follow-up without question hint → inherit previous intent.
 *   9. Default to `other` (NOT `knowledge`) so off-topic chatter doesn't
 *      surface cosmetic-only affordances.
 */
export function classifyIntent(
  rawText: string,
  options: ClassifyOptions = {},
): ChatIntent {
  if (rawText == null || typeof rawText !== 'string') return 'other';
  const text = rawText.trim();
  if (text.length === 0) return 'other';

  if (looksLikeDupeRequest(text)) return 'dupe';

  if (looksLikeIngredientList(text)) return 'product';

  const productGuess = looksLikeProductName(text);
  if (productGuess === true) return 'product';

  const knowledgeHint = hasKnowledgeHint(text);
  const domainTerm = hasCosmeticDomainTerm(text);

  if (knowledgeHint) {
    if (domainTerm) return 'knowledge';

    if (options.previousIntent && looksLikeFollowup(text)) {
      return options.previousIntent === 'dupe'
        ? 'knowledge'
        : options.previousIntent;
    }

    return 'other';
  }

  // Product-shaped names win over the bare domain-term rule: "Anua
  // Heartleaf 77% Soothing Toner" is a product even though "Toner" is a
  // domain word. Question-shaped text never reaches here (handled above).
  if (productGuess === 'maybe' && looksTitleCasedProductish(text)) return 'product';

  if (domainTerm && text.length < 120) return 'knowledge';

  if (productGuess === 'maybe' && text.length <= 60) return 'product';

  if (options.previousIntent && looksLikeFollowup(text)) {
    return options.previousIntent === 'dupe'
      ? 'knowledge'
      : options.previousIntent;
  }

  return 'other';
}

/**
 * Classify based on the full message history. Looks at the last user message
 * and uses the second-to-last user message to derive `previousIntent`.
 */
export function classifyLatestIntent(
  messages: ReadonlyArray<{ role: string; content: string }>,
): ChatIntent {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) return 'other';

  const last = userMessages[userMessages.length - 1];
  const prev =
    userMessages.length >= 2 ? userMessages[userMessages.length - 2] : null;

  const previousIntent = prev ? classifyIntent(prev.content) : undefined;
  return classifyIntent(last.content, { previousIntent });
}

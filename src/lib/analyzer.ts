import { callOpenAIWithRetry } from './openai';
import {
  buildSystemPrompt,
  buildUserMessage,
  buildProductNameOnlyMessage,
  findIngredientData,
  type UserProfile,
  type Language,
  type IngredientSource,
} from './prompt';
import { searchProduct, extractIngredients } from './openbeautyfacts';
import { createServerClient } from './supabase';

export interface AnalysisRequest {
  productName?: string;
  ingredients?: string;
  language: Language;
  userId?: string | null;
}

export interface AnalysisResult {
  success: boolean;
  data?: string;
  cached?: boolean;
  /** Where the ingredient info came from */
  source?: IngredientSource;
  product?: {
    name: string;
    brand?: string;
    image?: string;
  };
  error?: string;
  errorCode?: string;
}

export async function analyzeProduct(request: AnalysisRequest): Promise<AnalysisResult> {
  const { productName, ingredients, language, userId } = request;
  const supabase = createServerClient();

  const normalizedName = productName?.toLowerCase().trim();

  // =============================================
  // 1. CHECK CACHE
  // =============================================
  if (normalizedName) {
    try {
      const { data: cached } = await supabase
        .from('analysis_cache')
        .select('*')
        .eq('product_name_normalized', normalizedName)
        .gt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (cached) {
        const cachedResult = language === 'zh'
          ? cached.analysis_result_zh
          : cached.analysis_result_en;

        if (cachedResult) {
          return {
            success: true,
            data: cachedResult,
            cached: true,
            source: cached.source || 'verified',
          };
        }
      }
    } catch {
      // Cache miss or DB error — continue to fresh analysis
    }
  }

  // =============================================
  // 2. RESOLVE INGREDIENTS (3-tier fallback)
  // =============================================
  let ingredientList = ingredients || null;
  let productData: any = null;
  let source: IngredientSource = 'verified';

  // Tier 0: User pasted ingredients directly → use them as-is
  if (ingredientList) {
    source = 'verified';
  }

  // Tier 1 + 2: Product name provided but no ingredient list
  if (!ingredientList && productName) {

    // --- Tier 1: Search Open Beauty Facts ---
    try {
      productData = await searchProduct(productName);

      if (productData) {
        ingredientList = extractIngredients(productData, language);
      }
    } catch (err) {
      console.warn('Open Beauty Facts search failed (non-blocking):', err);
    }

    if (ingredientList) {
      source = 'verified';
    } else {
      // --- Tier 2: Fallback to LLM knowledge ---
      // Instead of returning an error, we'll let the LLM analyze
      // using its training knowledge about the product.
      source = 'llm_knowledge';
      console.log(`Product "${productName}" not found in OBF — using LLM knowledge fallback`);
    }
  }

  // If user provided neither a product name nor ingredients
  if (!ingredientList && !productName) {
    return {
      success: false,
      error: 'No ingredients or product name provided',
      errorCode: 'missing_input',
    };
  }

  // =============================================
  // 3. LOAD USER PROFILE
  // =============================================
  let userProfile: UserProfile | null = null;

  if (userId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      userProfile = profile;
    } catch {
      // Profile fetch failed — continue without it
    }
  }

  // =============================================
  // 4. BUILD PROMPTS
  // =============================================
  const systemPrompt = buildSystemPrompt(language, userProfile);

  let userMessage: string;

  if (source === 'verified' && ingredientList) {
    // Mode A: We have verified ingredients
    const ingredientData = findIngredientData(ingredientList);
    userMessage = buildUserMessage(
      {
        productName: productName || 'Unknown Product',
        productBrand: productData?.brands,
        ingredients: ingredientList,
      },
      ingredientData
    );
  } else {
    // Mode B: LLM knowledge fallback — product name only
    userMessage = buildProductNameOnlyMessage(
      productName!,
      productData?.brands
    );
  }

  // =============================================
  // 5. CALL LLM
  // =============================================
  const llmResult = await callOpenAIWithRetry({
    systemPrompt,
    userMessage,
    temperature: 0.7,
    maxTokens: 2048,
  });

  if (!llmResult.success || !llmResult.content) {
    return {
      success: false,
      error: 'Failed to analyze product. Please try again.',
      errorCode: 'analysis_failed',
    };
  }

  // =============================================
  // 6. CACHE RESULT
  // =============================================
  if (normalizedName) {
    try {
      const cacheField = language === 'zh' ? 'analysis_result_zh' : 'analysis_result_en';

      await supabase
        .from('analysis_cache')
        .upsert({
          product_name_normalized: normalizedName,
          [cacheField]: llmResult.content,
          source,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'product_name_normalized',
        });
    } catch (err) {
      console.warn('Cache write failed (non-blocking):', err);
    }
  }

  // =============================================
  // 7. SAVE TO HISTORY
  // =============================================
  if (userId) {
    try {
      await supabase.from('analysis_history').insert({
        user_id: userId,
        product_name: productName || 'Pasted Ingredients',
        product_brand: productData?.brands,
        ingredients_raw: ingredientList || `[LLM knowledge for: ${productName}]`,
        analysis_result: llmResult.content,
        language,
        source,
      });
    } catch (err) {
      console.warn('History write failed (non-blocking):', err);
    }
  }

  // =============================================
  // 8. RETURN RESULT
  // =============================================
  return {
    success: true,
    data: llmResult.content,
    cached: false,
    source,
    product: productData ? {
      name: productData.product_name,
      brand: productData.brands,
      image: productData.image_url,
    } : undefined,
  };
}

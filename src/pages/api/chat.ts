import type { APIRoute } from 'astro';
import {
  callOpenAIChatWithRetry,
  type ChatMessage,
} from '../../lib/openai';
import {
  buildSystemPrompt,
  looksLikeProductName,
  enrichMessageWithIngredients,
  findIngredientData,
  type Language,
  type IngredientSource,
} from '../../lib/prompt';
import { searchKnowledge } from '../../lib/embeddings';
import { searchProduct, extractIngredients } from '../../lib/openbeautyfacts';
import { createServerClient } from '../../lib/supabase';

const MAX_HISTORY_MESSAGES = 10;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      messages: clientMessages = [],
      language = 'en',
      userId = null,
    } = body as {
      messages: Array<{ role: string; content: string }>;
      language: string;
      userId?: string | null;
    };

    if (!clientMessages.length) {
      return jsonResponse(400, { success: false, error: 'No messages provided' });
    }

    const lang = (language === 'zh' ? 'zh' : 'en') as Language;
    const lastUserMsg = [...clientMessages].reverse().find((m) => m.role === 'user');

    if (!lastUserMsg) {
      return jsonResponse(400, { success: false, error: 'No user message found' });
    }

    const userText = lastUserMsg.content.trim();

    // ----------------------------------------------------------
    // 1. Load user profile (if authenticated)
    // ----------------------------------------------------------
    let userProfile = null;
    if (userId) {
      try {
        const supabase = createServerClient();
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        userProfile = data;
      } catch { /* continue without profile */ }
    }

    // ----------------------------------------------------------
    // 2. Heuristic: is the latest message a product name?
    // ----------------------------------------------------------
    const productIntent = looksLikeProductName(userText);
    let enrichedUserContent: string | null = null;
    let source: IngredientSource = 'llm_knowledge';

    if (productIntent !== false) {
      try {
        const productData = await searchProduct(userText);
        if (productData) {
          const ingredientList = extractIngredients(productData, lang);
          if (ingredientList) {
            const ingredientData = findIngredientData(ingredientList);
            enrichedUserContent = enrichMessageWithIngredients(
              userText,
              userText,
              ingredientList,
              ingredientData,
              'verified',
              lang,
            );
            source = 'verified';
          }
        }
      } catch (err) {
        console.warn('OBF lookup failed (non-blocking):', err);
      }
    }

    // ----------------------------------------------------------
    // 3. RAG: retrieve relevant knowledge for the latest message
    // ----------------------------------------------------------
    let ragContext = '';
    try {
      const results = await searchKnowledge(userText, { matchCount: 4 });
      const relevant = results.filter((r) => r.similarity > 0.3);
      if (relevant.length > 0) {
        ragContext = relevant
          .map((r) => `[${r.content_type}] ${r.content}`)
          .join('\n---\n');
      }
    } catch (err) {
      console.warn('RAG search failed (non-blocking):', err);
    }

    // ----------------------------------------------------------
    // 4. Build the messages array for OpenAI
    // ----------------------------------------------------------
    const systemPrompt = buildSystemPrompt(lang, userProfile);

    const openaiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Inject RAG context as a system message so the LLM has knowledge grounding
    if (ragContext) {
      openaiMessages.push({
        role: 'system',
        content: `Here is relevant knowledge from our ingredient and skincare database. Use it to ground your answer when applicable:\n\n${ragContext}`,
      });
    }

    // Add conversation history (trimmed to last N messages)
    const history = clientMessages.slice(-MAX_HISTORY_MESSAGES);

    for (let i = 0; i < history.length; i++) {
      const msg = history[i];
      const role = msg.role === 'user' ? 'user' : 'assistant';

      // For the LAST user message, use enriched content if we have product data
      const isLastUser = msg === lastUserMsg;
      const content =
        isLastUser && enrichedUserContent ? enrichedUserContent : msg.content;

      openaiMessages.push({ role, content });
    }

    // ----------------------------------------------------------
    // 5. Call LLM
    // ----------------------------------------------------------
    const result = await callOpenAIChatWithRetry({
      messages: openaiMessages,
      temperature: 0.7,
      maxTokens: 2048,
    });

    if (!result.success || !result.content) {
      return jsonResponse(500, {
        success: false,
        error: 'Failed to get a response. Please try again.',
      });
    }

    return jsonResponse(200, {
      success: true,
      data: result.content,
      source,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return jsonResponse(500, {
      success: false,
      error: 'An unexpected error occurred.',
    });
  }
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

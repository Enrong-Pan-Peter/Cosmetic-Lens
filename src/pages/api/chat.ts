import type { APIRoute } from 'astro';
import {
  streamOpenAIChat,
  type ChatMessage,
} from '../../lib/openai';
import {
  buildSystemPrompt,
  looksLikeProductName,
  extractProductFromDupeRequest,
  enrichMessageWithIngredients,
  findIngredientData,
  getInteractionWarnings,
  formatInteractionWarnings,
  type Language,
  type IngredientSource,
} from '../../lib/prompt';
import { classifyLatestIntent, type ChatIntent } from '../../lib/intent';
import { searchKnowledge } from '../../lib/embeddings';
import { expandQuery } from '../../lib/query-expansion';
import { findDupes } from '../../lib/dupe-finder';
import { searchProduct, extractIngredients } from '../../lib/openbeautyfacts';
import { createServerClient } from '../../lib/supabase';
import { getUserFromRequest } from '../../lib/auth';
import { sanitizeProfileInput } from '../../lib/profile-store';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';

const MAX_HISTORY_MESSAGES = 10;
// Input caps — generous for real use, hostile to abuse (P1.3).
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;

// SSE helpers ----------------------------------------------------------------

function sseEvent(name: string, data: unknown): Uint8Array {
  const payload = `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

function sseError(controller: ReadableStreamDefaultController<Uint8Array>, error: string) {
  controller.enqueue(sseEvent('error', { error }));
  controller.close();
}

// ----------------------------------------------------------------------------

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    messages: clientMessages = [],
    language = 'en',
  } = body as {
    messages: Array<{ role: string; content: string }>;
    language: string;
  };

  // Identity comes ONLY from the verified JWT — never from the body (IDOR fix).
  const authedUser = await getUserFromRequest(request);

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'No messages provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    clientMessages.length > MAX_MESSAGES ||
    clientMessages.some((m) => typeof m?.content === 'string' && m.content.length > MAX_MESSAGE_CHARS)
  ) {
    return new Response(JSON.stringify({ success: false, error: 'Message too long' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const lang = (language === 'zh' ? 'zh' : 'en') as Language;
  const lastUserMsg = [...clientMessages].reverse().find((m) => m.role === 'user');

  if (!lastUserMsg || typeof lastUserMsg.content !== 'string') {
    return new Response(JSON.stringify({ success: false, error: 'No user message found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userText = lastUserMsg.content.trim();
  if (!userText) {
    return new Response(JSON.stringify({ success: false, error: 'Empty user message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Daily rate limit (per-user when authed, per-IP otherwise). Runs before
  // any LLM/OBF/RAG spend.
  const rl = await enforceRateLimit({
    cls: 'chat',
    userId: authedUser?.id ?? null,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) {
    return rateLimitResponse('chat', lang, Boolean(authedUser));
  }

  // Stream over Server-Sent Events. The client sets `Accept: text/event-stream`,
  // but we stream unconditionally — non-streaming clients can buffer.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // -----------------------------------------------------------------
        // 0. Intent classification (resume previous intent on follow-ups)
        // -----------------------------------------------------------------
        const intent: ChatIntent = classifyLatestIntent(clientMessages);
        controller.enqueue(sseEvent('intent', { intent }));

        // -----------------------------------------------------------------
        // 1. Load profile if authenticated (best-effort)
        // -----------------------------------------------------------------
        let userProfile: any = null;
        if (authedUser) {
          try {
            const supabase = createServerClient();
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', authedUser.id)
              .single();
            userProfile = data;
          } catch {
            /* continue without profile */
          }
        } else if (body?.profile) {
          // Anonymous personalization (14.1): whitelisted self-supplied profile,
          // used for anon requests only (authed always reads the DB above).
          userProfile = sanitizeProfileInput(body.profile);
        }

        // -----------------------------------------------------------------
        // 2. Product enrichment via Open Beauty Facts (only for product intent)
        // -----------------------------------------------------------------
        let enrichedUserContent: string | null = null;
        let source: IngredientSource = 'llm_knowledge';
        let ingredientData: any[] = [];
        let ingredientList: string | null = null;

        const productGuess = looksLikeProductName(userText);

        if (intent === 'product' && productGuess !== false) {
          try {
            const productData = await searchProduct(userText);
            if (productData) {
              ingredientList = extractIngredients(productData, lang);
              if (ingredientList) {
                ingredientData = findIngredientData(ingredientList);
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

        // -----------------------------------------------------------------
        // 3. Dupe lookup (curated → vector → OBF)
        // -----------------------------------------------------------------
        let dupeResult: Awaited<ReturnType<typeof findDupes>> = null;
        if (intent === 'dupe') {
          const userMsgs = clientMessages.filter((m) => m.role === 'user');
          const prevProduct =
            userMsgs.length >= 2 ? userMsgs[userMsgs.length - 2]?.content?.trim() : null;
          const productQuery =
            extractProductFromDupeRequest(userText) ||
            (productGuess !== false ? userText : null) ||
            prevProduct;
          if (productQuery) {
            try {
              dupeResult = await findDupes(productQuery, ingredientList || undefined, lang);
            } catch (err) {
              console.warn('Dupe finder failed (non-blocking):', err);
            }
          }
        }

        // -----------------------------------------------------------------
        // 4. Interaction warnings (only when we have a verified ingredient list)
        // -----------------------------------------------------------------
        let interactionWarningsText = '';
        if (ingredientData.length > 0) {
          const inciNames = ingredientData.map((i: any) => i.inci_name).filter(Boolean);
          const rawNames = ingredientList
            ? ingredientList
                .split(/[,，、\n]/)
                .map((i) => i.trim())
                .filter((i) => i.length > 2)
            : [];
          const allNames = [...inciNames, ...rawNames];
          const warnings = getInteractionWarnings(allNames, userProfile, lang);
          interactionWarningsText = formatInteractionWarnings(warnings, lang);
        }

        // -----------------------------------------------------------------
        // 5. RAG retrieval
        // -----------------------------------------------------------------
        let ragContext = '';
        const sources: Array<{ type: string; name: string }> = [];
        try {
          // Query transformation (8.3): rewrite a bare follow-up into a
          // standalone query by re-attaching the recent subject.
          const priorTexts = clientMessages
            .filter((m) => m !== lastUserMsg)
            .map((m) => m.content);
          const retrievalQuery = expandQuery(userText, priorTexts);
          // Language-filtered retrieval (P4.1) — zh users search zh rows.
          const results = await searchKnowledge(retrievalQuery, { matchCount: 6, language: lang });
          const relevant = results.filter((r) => r.similarity > 0.3);
          if (relevant.length > 0) {
            ragContext = relevant
              .map((r) => `[${r.content_type}] ${r.content}`)
              .join('\n---\n');
            // Provenance chips (P4.2)
            for (const r of relevant.slice(0, 6)) {
              sources.push({
                type: r.content_type,
                name:
                  r.metadata?.inci_name ||
                  r.metadata?.name ||
                  r.metadata?.original_name ||
                  r.metadata?.title ||
                  String(r.content ?? '').slice(0, 40),
              });
            }
          }
          if (dupeResult?.dupes?.length) {
            ragContext +=
              (ragContext ? '\n---\n' : '') +
              `[dupe_suggestions] User asked for alternatives. Use ONLY these curated options:\n${JSON.stringify(dupeResult.dupes, null, 2)}`;
          }
        } catch (err) {
          console.warn('RAG search failed (non-blocking):', err);
        }

        // -----------------------------------------------------------------
        // 6. Emit early metadata so the client can render source/dupes
        //    while the LLM is still working.
        // -----------------------------------------------------------------
        controller.enqueue(
          sseEvent('meta', {
            source,
            dupes: dupeResult?.dupes ?? undefined,
            sources: sources.length ? sources : undefined,
          }),
        );

        // -----------------------------------------------------------------
        // 7. Build messages and stream
        // -----------------------------------------------------------------
        const systemPrompt = buildSystemPrompt(lang, userProfile);

        const openaiMessages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
        ];

        if (ragContext) {
          openaiMessages.push({
            role: 'system',
            content: `Here is relevant knowledge from our ingredient and skincare database. Use it to ground your answer when applicable:\n\n${ragContext}`,
          });
        }

        const history = clientMessages.slice(-MAX_HISTORY_MESSAGES);

        for (const msg of history) {
          const role = msg.role === 'user' ? 'user' : 'assistant';
          const isLastUser = msg === lastUserMsg;

          let content =
            isLastUser && enrichedUserContent ? enrichedUserContent : msg.content;

          if (isLastUser) {
            if (interactionWarningsText) {
              content = `${content}\n\n${interactionWarningsText}`;
            }
            // Inject intent tag so the system prompt's Conversation Mode
            // logic can branch deterministically.
            content = `[intent: ${intent}]\n\n${content}`;
          }

          openaiMessages.push({ role, content });
        }

        // -----------------------------------------------------------------
        // 8. Stream LLM tokens to the client
        // -----------------------------------------------------------------
        const abortSignal = request.signal;

        // Consistency (P4.5): structured product/dupe analyses run cooler
        // than conversational knowledge answers, so re-asking about the same
        // product yields stable verdicts.
        const temperature = intent === 'product' || intent === 'dupe' ? 0.4 : 0.7;

        for await (const chunk of streamOpenAIChat({
          messages: openaiMessages,
          temperature,
          maxTokens: 2048,
          signal: abortSignal,
          telemetryEndpoint: 'chat',
        })) {
          if (abortSignal?.aborted) break;
          if (chunk.type === 'delta' && chunk.delta) {
            controller.enqueue(sseEvent('delta', { delta: chunk.delta }));
          } else if (chunk.type === 'error') {
            sseError(controller, chunk.error || 'LLM error');
            return;
          } else if (chunk.type === 'done') {
            break;
          }
        }

        controller.enqueue(sseEvent('done', {}));
        controller.close();
      } catch (err) {
        console.error('Chat SSE error:', err);
        try {
          sseError(controller, err instanceof Error ? err.message : 'unexpected error');
        } catch {
          /* controller may already be closed */
        }
      }
    },
    cancel() {
      /* client disconnected; ReadableStream tears down */
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};

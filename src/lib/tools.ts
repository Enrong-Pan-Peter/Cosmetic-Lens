/**
 * Tool / function-calling definitions for the agentic chat endpoint.
 *
 * Each tool has three parts:
 *
 *   1. `schema`   — the OpenAI Chat Completions `tools[i]` entry. JSON Schema
 *                   used by the model to decide when and how to call the tool.
 *   2. `execute`  — the server-side implementation. Pure side-effects (network,
 *                   db) live here; the model never sees these.
 *   3. `summarize`— produces a short human-readable string for the UI agent
 *                   trace ("Found CeraVe Moisturizing Cream · 25 ingredients").
 *
 * The set of tools is intentionally small (4) so the model rarely needs more
 * than 1–2 calls per turn — keeps cost + latency low for a portfolio demo.
 *
 * To add a tool:
 *   - append to `toolDefinitions`
 *   - the executor + summary live in the same `ToolDefinition` object
 *   - no changes needed in chat-agentic.ts (it iterates over the registry).
 */

import {
  searchProduct,
  extractIngredients,
  type ProductSearchResult,
} from './openbeautyfacts';
import { findDupes } from './dupe-finder';
import { searchKnowledge } from './embeddings';
import { getInteractionWarnings, type InteractionWarning } from './prompt';

// ---------------------------------------------------------------------------
// Re-exported types and limits
// ---------------------------------------------------------------------------

export const MAX_TOOL_ITERATIONS = 4;
export const TOOL_TIMEOUT_MS = 8000;

export type ToolName =
  | 'search_product'
  | 'find_dupes'
  | 'get_ingredient_interactions'
  | 'search_knowledge_base';

export interface ToolCallRequest {
  /** OpenAI-issued tool call id (round-trips back to the model). */
  id: string;
  name: ToolName;
  /** Parsed JSON arguments. */
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  id: string;
  name: ToolName;
  /** True if the executor produced a usable result (even an empty one). */
  success: boolean;
  /** Wall-clock time spent inside the executor. */
  durationMs: number;
  /** Short human-readable summary for the UI trace. */
  summary: string;
  /** Full structured result — fed back to the model as the tool message body. */
  result: unknown;
  /** Truncated error string if `success === false`. */
  error?: string;
}

export interface ToolContext {
  /** UI language; passed to executors that care. */
  language: 'en' | 'zh';
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

interface ToolDefinition {
  name: ToolName;
  /** OpenAI tools[] entry. */
  schema: {
    type: 'function';
    function: {
      name: ToolName;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  /** Server-side implementation. */
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<{ result: unknown; summary: string }>;
}

const toolDefinitions: ToolDefinition[] = [
  // -------------------------------------------------------------------------
  // 1. search_product — Open Beauty Facts lookup
  // -------------------------------------------------------------------------
  {
    name: 'search_product',
    schema: {
      type: 'function',
      function: {
        name: 'search_product',
        description:
          'Search the Open Beauty Facts crowdsourced cosmetic database for a product by name or brand+name. Returns the verified ingredient list, brand, and product name when a match is found. Call this whenever the user mentions a specific named product (e.g. "CeraVe Moisturizing Cream", "The Ordinary Niacinamide 10%").',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Free-text product query. Include the brand if the user mentioned it (e.g. "CeraVe Hydrating Cleanser").',
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
    },
    async execute(args, ctx) {
      const query = String(args.query ?? '').trim();
      if (!query) {
        return {
          result: { found: false, reason: 'empty query' },
          summary: 'Empty query',
        };
      }

      const product: ProductSearchResult | null = await searchProduct(query);
      if (!product) {
        return {
          result: { found: false, query },
          summary: `No match for "${query}" in Open Beauty Facts`,
        };
      }

      const ingredients = extractIngredients(product, ctx.language);
      const ingredientCount = ingredients
        ? ingredients
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean).length
        : 0;

      return {
        result: {
          found: true,
          product_name: product.product_name,
          brand: product.brands ?? null,
          ingredients_text: ingredients,
          ingredient_count: ingredientCount,
          image_url: product.image_url ?? null,
          categories: product.categories ?? null,
        },
        summary: product.product_name
          ? `Found "${product.product_name}"${ingredientCount ? ` · ${ingredientCount} ingredients` : ''}`
          : `Match in OBF · ${ingredientCount} ingredients`,
      };
    },
  },

  // -------------------------------------------------------------------------
  // 2. find_dupes — curated + vector dupe lookup
  // -------------------------------------------------------------------------
  {
    name: 'find_dupes',
    schema: {
      type: 'function',
      function: {
        name: 'find_dupes',
        description:
          'Find affordable alternative products with similar formulations to a (usually expensive) target product. Use whenever the user asks for a "dupe", "alternative", "cheaper version", or "similar product".',
        parameters: {
          type: 'object',
          properties: {
            target_product: {
              type: 'string',
              description:
                'The product the user wants a dupe FOR (e.g. "La Mer Crème de la Mer", "SK-II Facial Treatment Essence"). Include the brand if known.',
            },
          },
          required: ['target_product'],
          additionalProperties: false,
        },
      },
    },
    async execute(args, ctx) {
      const target = String(args.target_product ?? '').trim();
      if (!target) {
        return {
          result: { found: false, reason: 'empty target_product' },
          summary: 'Empty target',
        };
      }

      const dupes = await findDupes(target, undefined, ctx.language);
      if (!dupes || dupes.dupes.length === 0) {
        return {
          result: { found: false, target },
          summary: `No dupes for "${target}"`,
        };
      }

      return {
        result: {
          found: true,
          target,
          source: dupes.source,
          dupes: dupes.dupes.map((d) => ({
            product_name: d.product_name,
            brand: d.brand,
            price_tier: d.price_tier,
            key_similarities: d.key_similarities,
            notes_en: d.notes_en,
            notes_zh: d.notes_zh,
          })),
        },
        summary: `Found ${dupes.dupes.length} dupe${dupes.dupes.length === 1 ? '' : 's'} (${dupes.source})`,
      };
    },
  },

  // -------------------------------------------------------------------------
  // 3. get_ingredient_interactions — rule engine for warnings
  // -------------------------------------------------------------------------
  {
    name: 'get_ingredient_interactions',
    schema: {
      type: 'function',
      function: {
        name: 'get_ingredient_interactions',
        description:
          'Check a list of INCI ingredient names for known harmful, beneficial, or pregnancy-related interactions. Call this AFTER you have an ingredient list (from `search_product` or pasted by the user) to surface safety warnings.',
        parameters: {
          type: 'object',
          properties: {
            ingredients: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of INCI ingredient names (e.g. ["Niacinamide", "Retinol"]).',
              minItems: 1,
            },
            is_pregnant: {
              type: 'boolean',
              description:
                'Set true to also surface pregnancy-specific warnings (retinoids, salicylic acid). Defaults to false.',
              default: false,
            },
          },
          required: ['ingredients'],
          additionalProperties: false,
        },
      },
    },
    async execute(args, ctx) {
      const ingredients = Array.isArray(args.ingredients)
        ? args.ingredients.filter((s): s is string => typeof s === 'string')
        : [];
      const isPregnant = Boolean(args.is_pregnant);

      if (ingredients.length === 0) {
        return {
          result: { warnings: [] },
          summary: 'No ingredients provided',
        };
      }

      const warnings: InteractionWarning[] = getInteractionWarnings(
        ingredients,
        isPregnant ? { is_pregnant: true } : null,
        ctx.language,
      );

      return {
        result: {
          ingredient_count: ingredients.length,
          warning_count: warnings.length,
          warnings: warnings.map((w) => ({
            level: w.level,
            text: ctx.language === 'zh' ? w.warning_zh : w.warning_en,
          })),
        },
        summary: warnings.length
          ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'} for ${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'}`
          : `No interaction warnings (${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'} checked)`,
      };
    },
  },

  // -------------------------------------------------------------------------
  // 4. search_knowledge_base — RAG over curated ingredient + interaction docs
  // -------------------------------------------------------------------------
  {
    name: 'search_knowledge_base',
    schema: {
      type: 'function',
      function: {
        name: 'search_knowledge_base',
        description:
          'Semantic search over our curated knowledge base of ~100 cosmetic ingredients, 39 interactions, and 30 dupe families. Use for general questions about ingredient science, safety, comparisons, or skin concerns (e.g. "is niacinamide safe with retinol?").',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural-language query in the user\'s language.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 8,
              default: 4,
              description: 'Max number of knowledge snippets to return.',
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
    },
    async execute(args) {
      const query = String(args.query ?? '').trim();
      const limit = Number.isFinite(args.limit)
        ? Math.max(1, Math.min(8, Number(args.limit)))
        : 4;

      if (!query) {
        return {
          result: { snippets: [] },
          summary: 'Empty query',
        };
      }

      const hits = await searchKnowledge(query, { matchCount: limit });
      const filtered = hits.filter((h) => h.similarity > 0.3);

      return {
        result: {
          snippets: filtered.map((h) => ({
            content: h.content?.slice(0, 800) ?? '',
            similarity: Number(h.similarity?.toFixed(3) ?? 0),
            content_type: h.content_type ?? null,
            metadata: h.metadata ?? null,
          })),
        },
        summary: filtered.length
          ? `Found ${filtered.length} relevant snippet${filtered.length === 1 ? '' : 's'}`
          : 'No relevant knowledge found',
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

const TOOLS_BY_NAME = new Map<ToolName, ToolDefinition>(
  toolDefinitions.map((t) => [t.name, t]),
);

/** OpenAI `tools` parameter — pass this directly to chat completions. */
export const OPENAI_TOOLS = toolDefinitions.map((t) => t.schema);

/**
 * Execute a single tool call. Wraps each executor with timeout + error capture
 * so a broken tool can never crash the agent loop — the model just sees an
 * error string in the `tool` message and re-plans.
 */
export async function executeToolCall(
  call: ToolCallRequest,
  ctx: ToolContext,
): Promise<ToolCallResult> {
  const def = TOOLS_BY_NAME.get(call.name);
  const started = Date.now();

  if (!def) {
    return {
      id: call.id,
      name: call.name,
      success: false,
      durationMs: 0,
      summary: `Unknown tool "${call.name}"`,
      result: { error: 'unknown_tool', name: call.name },
      error: 'unknown_tool',
    };
  }

  try {
    const out = await withTimeout(
      def.execute(call.arguments, ctx),
      TOOL_TIMEOUT_MS,
      call.name,
    );
    return {
      id: call.id,
      name: call.name,
      success: true,
      durationMs: Date.now() - started,
      summary: out.summary,
      result: out.result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      id: call.id,
      name: call.name,
      success: false,
      durationMs: Date.now() - started,
      summary: `${call.name} failed: ${message.slice(0, 80)}`,
      result: { error: message },
      error: message,
    };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

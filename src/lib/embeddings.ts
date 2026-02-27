import { createServerClient } from './supabase';

const EMBEDDING_MODEL = 'text-embedding-3-small';

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export interface KnowledgeResult {
  id: string;
  content: string;
  content_type: string;
  metadata: Record<string, any>;
  similarity: number;
}

export async function searchKnowledge(
  query: string,
  options: { matchCount?: number; filterType?: string } = {},
): Promise<KnowledgeResult[]> {
  const { matchCount = 5, filterType = undefined } = options;

  try {
    const embedding = await generateEmbedding(query);
    const supabase = createServerClient();

    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_count: matchCount,
      filter_type: filterType ?? null,
    });

    if (error) {
      console.warn('Knowledge search RPC failed:', error.message);
      return [];
    }

    return (data as KnowledgeResult[]) ?? [];
  } catch (err) {
    console.warn('Knowledge search failed (non-blocking):', err);
    return [];
  }
}

export async function indexContent(
  content: string,
  contentType: string,
  metadata: Record<string, any> = {},
  language = 'en',
): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(content);
    const supabase = createServerClient();

    const { error } = await supabase.from('knowledge_embeddings').insert({
      content,
      content_type: contentType,
      metadata,
      language,
      embedding,
    });

    if (error) {
      console.error('Failed to index content:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Indexing failed:', err);
    return false;
  }
}

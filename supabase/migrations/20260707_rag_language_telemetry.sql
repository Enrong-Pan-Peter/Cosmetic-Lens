-- ============================================================
-- P4: language-filtered retrieval + LLM telemetry + seed idempotency
-- Run in Supabase SQL editor. Forward-only.
-- ============================================================

-- 4.1 match_knowledge v2: optional language filter (en/zh). Old callers
-- (3-arg) keep working via the default.
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_type TEXT DEFAULT NULL,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, content TEXT, content_type TEXT, metadata JSONB, language TEXT, similarity FLOAT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ke.id, ke.content, ke.content_type, ke.metadata, ke.language,
         1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE (filter_type IS NULL OR ke.content_type = filter_type)
    AND (filter_language IS NULL OR ke.language = filter_language)
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Dropping the old 3-arg overload avoids PostgREST ambiguity errors.
DROP FUNCTION IF EXISTS match_knowledge(vector, INT, TEXT);

-- 4.7 Seed idempotency: stable content hash so the seed script can skip
-- unchanged rows (no re-embedding) and prune stale ones instead of wiping.
ALTER TABLE knowledge_embeddings ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_embeddings_hash
  ON knowledge_embeddings(content_hash) WHERE content_hash IS NOT NULL;

-- 4.6 LLM call telemetry. Service-role writes only; no public policies.
CREATE TABLE IF NOT EXISTS llm_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,             -- 'chat' | 'chat-agentic' | 'chat-title' | ...
  model TEXT,
  prompt_tokens INT,
  completion_tokens INT,
  latency_ms INT,
  ok BOOLEAN DEFAULT TRUE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_calls_created ON llm_calls(created_at DESC);
ALTER TABLE llm_calls ENABLE ROW LEVEL SECURITY;
-- (no policies: only the service role, which bypasses RLS, may read/write)

-- ============================================================
-- P8.4: Semantic answer cache.
-- Stores (query, embedding, answer) so a semantically-equivalent first-turn
-- question can be served without re-running the model. Written/read only by
-- the service role (the app is the auth boundary); OFF unless SEMANTIC_CACHE=on.
-- Run in the Supabase SQL editor. Forward-only.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chat_semantic_cache (
  id BIGSERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  embedding vector(1536),
  answer TEXT NOT NULL,
  language TEXT,
  intent TEXT,
  source TEXT,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (query_text, language)
);

CREATE INDEX IF NOT EXISTS idx_chat_cache_lang_intent
  ON chat_semantic_cache(language, intent);

ALTER TABLE chat_semantic_cache ENABLE ROW LEVEL SECURITY;
-- (no policies: only the service role, which bypasses RLS, may read/write)

-- Nearest cached answer above a cosine-similarity threshold, optionally scoped
-- to a language + intent. Mirrors match_knowledge's SECURITY DEFINER pattern.
CREATE OR REPLACE FUNCTION match_chat_cache(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.93,
  filter_language TEXT DEFAULT NULL,
  filter_intent TEXT DEFAULT NULL
)
RETURNS TABLE (id BIGINT, answer TEXT, source TEXT, similarity FLOAT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.answer, c.source,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM chat_semantic_cache c
  WHERE (filter_language IS NULL OR c.language = filter_language)
    AND (filter_intent IS NULL OR c.intent = filter_intent)
    AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT 1;
END;
$$;

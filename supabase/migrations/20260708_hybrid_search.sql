-- ============================================================
-- P8.2: Hybrid retrieval — lexical channel acceleration.
-- The dense channel keeps using match_knowledge (pgvector). The lexical
-- channel runs `content ILIKE '%term%'` from the app (embeddings.ts); a GIN
-- trigram index makes those substring scans fast as the KB grows and works
-- for both Latin and CJK n-grams (e.g. recovering the zh nickname 小黑瓶).
-- Fusion (RRF) + reranking happen in application code (src/lib/retrieval.ts),
-- so there is no new RPC to keep in sync. Run in the Supabase SQL editor.
-- Forward-only.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_content_trgm
  ON knowledge_embeddings USING gin (content gin_trgm_ops);

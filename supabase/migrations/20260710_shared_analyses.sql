-- ============================================================
-- P12.1: Shareable analysis links.
-- A "Share" button SNAPSHOTS one assistant answer into this dedicated table.
-- SECURITY INVARIANT: only this snapshot table is world-readable — the user's
-- `chats` / `chat_messages` stay owner-only (RLS from 20260707_chat_sync.sql).
-- Sharing never exposes a conversation; it copies the single answer the user
-- explicitly chose to share. Writes go through the service role (/api/share is
-- the auth boundary); there is no public INSERT policy.
-- Run in the Supabase SQL editor. Forward-only.
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_analyses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  language TEXT,
  -- snapshot of display bits: { source, intent, product, dupes, sources }
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_analyses_created ON shared_analyses(created_at DESC);

ALTER TABLE shared_analyses ENABLE ROW LEVEL SECURITY;

-- Public read: anyone with the link (or the anon key) may read a SHARED row.
-- This is deliberate and scoped to this table only.
DROP POLICY IF EXISTS "shared_analyses public read" ON shared_analyses;
CREATE POLICY "shared_analyses public read" ON shared_analyses FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies → only the service role can write.

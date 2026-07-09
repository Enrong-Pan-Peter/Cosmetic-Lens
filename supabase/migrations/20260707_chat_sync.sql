-- ============================================================
-- P3: Server-side chat sync (improvement-plan Phase 3)
-- Chats + messages for authenticated users. Client-generated
-- TEXT ids (same ids as localStorage) avoid an id-mapping layer.
-- Run in Supabase SQL editor. Forward-only.
-- ============================================================

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id TEXT REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  seq INT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  -- intent / source / dupes / trimmed toolCalls / fromPhoto etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, seq);

-- RLS: owner-only. API routes use the service role (route handler is the
-- auth boundary), but RLS protects against direct anon-key access.
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chats owner select" ON chats;
CREATE POLICY "chats owner select" ON chats FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "chats owner insert" ON chats;
CREATE POLICY "chats owner insert" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "chats owner update" ON chats;
CREATE POLICY "chats owner update" ON chats FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "chats owner delete" ON chats;
CREATE POLICY "chats owner delete" ON chats FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_messages owner select" ON chat_messages;
CREATE POLICY "chat_messages owner select" ON chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_id AND chats.user_id = auth.uid()));
DROP POLICY IF EXISTS "chat_messages owner insert" ON chat_messages;
CREATE POLICY "chat_messages owner insert" ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_id AND chats.user_id = auth.uid()));
DROP POLICY IF EXISTS "chat_messages owner delete" ON chat_messages;
CREATE POLICY "chat_messages owner delete" ON chat_messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_id AND chats.user_id = auth.uid()));

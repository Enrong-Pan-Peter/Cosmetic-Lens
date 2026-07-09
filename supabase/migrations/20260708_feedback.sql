-- ============================================================
-- P7.3: Answer feedback (the eval flywheel).
-- Thumbs up/down (+ optional reason) on assistant answers. Down-votes are
-- the raw material for new eval cases. Written by /api/feedback via the
-- service role (the route is the auth boundary); user_id is null for
-- anonymous feedback. Run in the Supabase SQL editor. Forward-only.
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  chat_id TEXT,                                  -- client chat id (not FK: anon chats aren't persisted)
  rating TEXT CHECK (rating IN ('up', 'down')) NOT NULL,
  reason TEXT,                                   -- optional free text (down-votes)
  intent TEXT,                                   -- classified intent of the turn
  pipeline TEXT,                                 -- 'agentic' | 'classic' | ...
  language TEXT,                                 -- 'en' | 'zh'
  query TEXT,                                    -- the user prompt that was answered
  answer TEXT,                                   -- the assistant answer being rated
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating, created_at DESC);

-- RLS on. Inserts come from the service role (bypasses RLS). The only public
-- policy lets a signed-in user read back their own feedback.
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback owner select" ON feedback;
CREATE POLICY "feedback owner select" ON feedback FOR SELECT
  USING (auth.uid() = user_id);

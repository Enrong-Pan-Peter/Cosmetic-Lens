-- ============================================================
-- 14.3b / 14.7 cloud sync: favorites + saved routines.
--
-- Cloud mirror of the localStorage stores (favorites-store / routine-store) so
-- a logged-in user's shelf and saved routines follow them across devices.
-- Written by /api/favorites and /api/routines via the SERVICE ROLE — the API
-- route is the auth boundary and derives identity ONLY from the verified JWT
-- (never a body field), so it always scopes reads/writes by user_id. RLS is
-- kept on as defense-in-depth: any non-service access sees only its own rows.
-- Composite primary keys make a client-supplied id collision across users
-- impossible to clobber. Run in the Supabase SQL editor. Forward-only.
-- ============================================================

-- --- Favorites (starred ingredients) --------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ingredient_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, ingredient_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites owner all" ON favorites;
CREATE POLICY "favorites owner all" ON favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- Saved routines -------------------------------------------------------
-- id is client-generated (uuid, or a fallback string) and only unique WITHIN
-- a user, hence the composite PK.
CREATE TABLE IF NOT EXISTS saved_routines (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  products JSONB NOT NULL,
  is_pregnant BOOLEAN DEFAULT FALSE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_saved_routines_user ON saved_routines(user_id, saved_at DESC);

ALTER TABLE saved_routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_routines owner all" ON saved_routines;
CREATE POLICY "saved_routines owner all" ON saved_routines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

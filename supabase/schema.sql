-- ============================================
-- COSMETICLENS DATABASE SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  skin_type TEXT CHECK (skin_type IN ('oily', 'dry', 'combination', 'normal')),
  sensitivity TEXT CHECK (sensitivity IN ('low', 'medium', 'high')),
  allergies TEXT[] DEFAULT '{}',
  allergies_other TEXT,
  concerns TEXT[] DEFAULT '{}',
  is_pregnant BOOLEAN DEFAULT false,

  price_preference TEXT CHECK (price_preference IN ('budget', 'mid', 'luxury', 'none')) DEFAULT 'none',
  preferred_language TEXT CHECK (preferred_language IN ('en', 'zh')) DEFAULT 'en',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYSIS HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  product_name TEXT NOT NULL,
  product_brand TEXT,
  ingredients_raw TEXT,

  analysis_result JSONB NOT NULL,
  language TEXT CHECK (language IN ('en', 'zh')) DEFAULT 'en',
  source TEXT CHECK (source IN ('verified', 'llm_knowledge')) DEFAULT 'verified',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYSIS CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  product_name_normalized TEXT NOT NULL,
  ingredients_hash TEXT,

  analysis_result_en JSONB,
  analysis_result_zh JSONB,
  source TEXT CHECK (source IN ('verified', 'llm_knowledge')) DEFAULT 'verified',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_name_normalized)
);

-- ============================================
-- RATE LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  identifier TEXT NOT NULL,
  identifier_type TEXT CHECK (identifier_type IN ('user', 'ip')) DEFAULT 'user',

  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,

  UNIQUE(identifier, date)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_product_name ON analysis_cache(product_name_normalized);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_updated_at ON analysis_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_date ON rate_limits(identifier, date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own history" ON analysis_history;
DROP POLICY IF EXISTS "Users can insert own history" ON analysis_history;
DROP POLICY IF EXISTS "Users can delete own history" ON analysis_history;
CREATE POLICY "Users can view own history"
  ON analysis_history FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history"
  ON analysis_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own history"
  ON analysis_history FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read cache" ON analysis_cache;
CREATE POLICY "Authenticated users can read cache"
  ON analysis_cache FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid()::text = identifier OR identifier_type = 'ip');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'user'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO rate_limits (identifier, identifier_type, date, request_count)
  VALUES (p_identifier, p_identifier_type, CURRENT_DATE, 1)
  ON CONFLICT (identifier, date)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT request_count INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier AND date = CURRENT_DATE;

  IF v_count IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN v_count < p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_profile_timestamp ON profiles;
CREATE TRIGGER trigger_update_profile_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

CREATE OR REPLACE FUNCTION clean_old_cache(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM analysis_cache
  WHERE updated_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================
-- PGVECTOR EXTENSION & KNOWLEDGE EMBEDDINGS
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('ingredient', 'article', 'faq', 'regulation')),
  metadata JSONB DEFAULT '{}',
  language TEXT DEFAULT 'en',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_type ON knowledge_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_language ON knowledge_embeddings(language);

ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read knowledge embeddings" ON knowledge_embeddings;
DROP POLICY IF EXISTS "Service role can manage knowledge embeddings" ON knowledge_embeddings;
CREATE POLICY "Anyone can read knowledge embeddings"
  ON knowledge_embeddings FOR SELECT
  USING (true);
CREATE POLICY "Service role can manage knowledge embeddings"
  ON knowledge_embeddings FOR ALL
  TO service_role
  USING (true);

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, content TEXT, content_type TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ke.id, ke.content, ke.content_type, ke.metadata,
         1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE (filter_type IS NULL OR ke.content_type = filter_type)
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

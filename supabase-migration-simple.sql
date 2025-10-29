-- ==================================================================
-- CV Tool - Simple Migration Script
-- ==================================================================
-- This version uses simpler syntax that works in all Supabase versions
-- ==================================================================

-- ==================================================================
-- 1. ADD NEW COLUMNS TO ai_cache
-- ==================================================================

-- Add expires_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_cache' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE ai_cache ADD COLUMN expires_at timestamptz;
        RAISE NOTICE '✅ Added expires_at column';
    ELSE
        RAISE NOTICE '⏭️  expires_at already exists';
    END IF;
END $$;

-- Add last_accessed_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_cache' AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE ai_cache ADD COLUMN last_accessed_at timestamptz;
        RAISE NOTICE '✅ Added last_accessed_at column';
    ELSE
        RAISE NOTICE '⏭️  last_accessed_at already exists';
    END IF;
END $$;

-- Update new columns with default values for existing rows
UPDATE ai_cache
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL;

UPDATE ai_cache
SET last_accessed_at = COALESCE(created_at, now())
WHERE last_accessed_at IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- ==================================================================
-- 2. CREATE rate_limits TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  limit_type text NOT NULL DEFAULT 'ip',
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, limit_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits(timestamp);

-- ==================================================================
-- 3. CREATE usage_tracking TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  ip_address text,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_action ON usage_tracking(action);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_tracking(created_at);

-- ==================================================================
-- 4. CREATE HELPER FUNCTIONS
-- ==================================================================

-- Cleanup expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  DELETE FROM ai_cache WHERE expires_at < now();
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limits
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  DELETE FROM rate_limits WHERE timestamp < (now() - interval '24 hours');
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE(
  total_entries bigint,
  total_hits bigint,
  avg_hits numeric,
  hit_rate numeric,
  storage_mb numeric,
  oldest_entry timestamptz,
  newest_entry timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    SUM(hit_count)::bigint,
    ROUND(AVG(hit_count), 2),
    ROUND((COUNT(CASE WHEN hit_count > 1 THEN 1 END)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2),
    ROUND((pg_total_relation_size('ai_cache')::numeric / 1024 / 1024), 2),
    MIN(created_at),
    MAX(created_at)
  FROM ai_cache;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================
-- 5. VERIFICATION
-- ==================================================================

-- Show results
DO $$
DECLARE
  cache_count integer;
BEGIN
  SELECT COUNT(*) INTO cache_count FROM ai_cache;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ai_cache entries: %', cache_count;
  RAISE NOTICE '';
END $$;

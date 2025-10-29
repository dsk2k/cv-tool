-- ==================================================================
-- CV Tool - Migration Script (Fixed)
-- ==================================================================
-- This version drops and recreates functions to avoid conflicts
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
-- 4. DROP OLD FUNCTIONS (if they exist with different signatures)
-- ==================================================================

DROP FUNCTION IF EXISTS cleanup_expired_cache();
DROP FUNCTION IF EXISTS cleanup_old_rate_limits();
DROP FUNCTION IF EXISTS get_cache_stats();

-- ==================================================================
-- 5. CREATE NEW FUNCTIONS
-- ==================================================================

-- Cleanup expired cache
CREATE FUNCTION cleanup_expired_cache()
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
CREATE FUNCTION cleanup_old_rate_limits()
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
CREATE FUNCTION get_cache_stats()
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
-- 6. VERIFICATION
-- ==================================================================

DO $$
DECLARE
  cache_count integer;
  rate_count integer;
  usage_count integer;
BEGIN
  SELECT COUNT(*) INTO cache_count FROM ai_cache;
  SELECT COUNT(*) INTO rate_count FROM rate_limits;
  SELECT COUNT(*) INTO usage_count FROM usage_tracking;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - ai_cache: % entries', cache_count;
  RAISE NOTICE '  - rate_limits: % entries', rate_count;
  RAISE NOTICE '  - usage_tracking: % entries', usage_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run this to test:';
  RAISE NOTICE '  SELECT * FROM get_cache_stats();';
  RAISE NOTICE '';
END $$;

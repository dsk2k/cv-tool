-- ==================================================================
-- CV Tool - Incremental Migration Script
-- ==================================================================
-- This script UPDATES existing tables without breaking them
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS checks)
-- ==================================================================

-- ==================================================================
-- 1. UPDATE EXISTING ai_cache TABLE
-- ==================================================================
-- Add new columns if they don't exist

DO $$
BEGIN
    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_cache' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE ai_cache ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '30 days');
        RAISE NOTICE '✅ Added expires_at column to ai_cache';
    ELSE
        RAISE NOTICE '⏭️  Column expires_at already exists';
    END IF;

    -- Add last_accessed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_cache' AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE ai_cache ADD COLUMN last_accessed_at timestamptz DEFAULT now();
        RAISE NOTICE '✅ Added last_accessed_at column to ai_cache';
    ELSE
        RAISE NOTICE '⏭️  Column last_accessed_at already exists';
    END IF;

    -- Update expires_at for existing rows if NULL
    UPDATE ai_cache
    SET expires_at = created_at + interval '30 days'
    WHERE expires_at IS NULL;
    RAISE NOTICE '✅ Updated expires_at for existing rows';

    -- Update last_accessed_at for existing rows if NULL
    UPDATE ai_cache
    SET last_accessed_at = COALESCE(last_accessed_at, created_at, now())
    WHERE last_accessed_at IS NULL;
    RAISE NOTICE '✅ Updated last_accessed_at for existing rows';
END $$;

-- Add index on expires_at if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- Add comment
COMMENT ON COLUMN ai_cache.expires_at IS 'Automatic expiration after 30 days';
COMMENT ON COLUMN ai_cache.last_accessed_at IS 'Last time this cache entry was accessed';

RAISE NOTICE '✅ ai_cache table updated successfully!';

-- ==================================================================
-- 2. CREATE rate_limits TABLE (if not exists)
-- ==================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  limit_type text NOT NULL DEFAULT 'ip',
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, limit_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits(timestamp);

-- Add comment
COMMENT ON TABLE rate_limits IS 'Tracks API requests for rate limiting';
COMMENT ON COLUMN rate_limits.identifier IS 'IP address or user identifier';
COMMENT ON COLUMN rate_limits.limit_type IS 'Type of limit: ip, user, or global';

DO $$ BEGIN
    RAISE NOTICE '✅ rate_limits table ready!';
END $$;

-- ==================================================================
-- 3. CREATE usage_tracking TABLE (if not exists)
-- ==================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  ip_address text,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_action ON usage_tracking(action);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_tracking(created_at);

-- Add comment
COMMENT ON TABLE usage_tracking IS 'Tracks user actions for analytics';

DO $$ BEGIN
    RAISE NOTICE '✅ usage_tracking table ready!';
END $$;

-- ==================================================================
-- 4. CACHE STATISTICS VIEW (recreate to include new columns)
-- ==================================================================

CREATE OR REPLACE VIEW cache_stats AS
SELECT
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hit_count,
  MAX(hit_count) as max_hit_count,
  COUNT(CASE WHEN hit_count > 1 THEN 1 END) as reused_entries,
  COUNT(CASE WHEN expires_at < now() THEN 1 END) as expired_entries,
  pg_size_pretty(pg_total_relation_size('ai_cache')) as table_size
FROM ai_cache;

COMMENT ON VIEW cache_stats IS 'Cache performance metrics';

DO $$ BEGIN
    RAISE NOTICE '✅ cache_stats view updated!';
END $$;

-- ==================================================================
-- 5. CLEANUP FUNCTIONS (create or replace)
-- ==================================================================

-- Cache cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  DELETE FROM ai_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_cache IS 'Removes expired cache entries - run daily';

-- Rate limit cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  DELETE FROM rate_limits
  WHERE timestamp < (now() - interval '24 hours');

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes old rate limit entries - run hourly';

-- Cache statistics function
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
    COUNT(*)::bigint as total_entries,
    SUM(hit_count)::bigint as total_hits,
    ROUND(AVG(hit_count), 2) as avg_hits,
    ROUND(
      (COUNT(CASE WHEN hit_count > 1 THEN 1 END)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100,
      2
    ) as hit_rate,
    ROUND(
      (pg_total_relation_size('ai_cache')::numeric / 1024 / 1024),
      2
    ) as storage_mb,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
  FROM ai_cache;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_cache_stats IS 'Returns detailed cache performance metrics';

DO $$ BEGIN
    RAISE NOTICE '✅ All functions created/updated!';
END $$;

-- ==================================================================
-- 6. VERIFICATION
-- ==================================================================

DO $$
DECLARE
  cache_count integer;
  rate_count integer;
  usage_count integer;
BEGIN
  -- Count records in each table
  SELECT COUNT(*) INTO cache_count FROM ai_cache;
  SELECT COUNT(*) INTO rate_count FROM rate_limits;
  SELECT COUNT(*) INTO usage_count FROM usage_tracking;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current State:';
  RAISE NOTICE '  - ai_cache: % entries (preserved!)', cache_count;
  RAISE NOTICE '  - rate_limits: % entries', rate_count;
  RAISE NOTICE '  - usage_tracking: % entries', usage_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '  1. Verify ai_cache data is intact';
  RAISE NOTICE '  2. Test cache stats: SELECT * FROM get_cache_stats();';
  RAISE NOTICE '  3. Set up cron jobs (optional):';
  RAISE NOTICE '     - Daily: SELECT cleanup_expired_cache();';
  RAISE NOTICE '     - Hourly: SELECT cleanup_old_rate_limits();';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ==================================================================
-- 7. VERIFICATION QUERIES (run these to check)
-- ==================================================================

-- Check ai_cache columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ai_cache'
ORDER BY ordinal_position;

-- Check cache stats
SELECT * FROM get_cache_stats();

-- Sample cache entries
SELECT
  id,
  cache_key,
  hit_count,
  created_at,
  expires_at,
  last_accessed_at
FROM ai_cache
ORDER BY created_at DESC
LIMIT 5;

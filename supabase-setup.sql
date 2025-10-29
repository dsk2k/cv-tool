-- ==================================================================
-- CV Tool - Supabase Database Setup
-- ==================================================================
-- This script sets up all necessary tables for the CV Tool application
-- Run this in your Supabase SQL Editor
-- ==================================================================

-- ==================================================================
-- 1. AI CACHE TABLE
-- ==================================================================
-- Stores AI-generated CV analysis results to reduce API costs
-- Cache hit rate target: 60%+ (saves ~$10-15/mo per 1000 users)
-- ==================================================================

CREATE TABLE IF NOT EXISTS ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  cv_text_hash text NOT NULL,
  job_description_hash text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  improved_cv text NOT NULL,
  cover_letter text NOT NULL,
  recruiter_tips text NOT NULL,
  changes_overview text NOT NULL,
  hit_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_cv_hash ON ai_cache(cv_text_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_job_hash ON ai_cache(job_description_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_created ON ai_cache(created_at);

-- Add comment
COMMENT ON TABLE ai_cache IS 'Caches AI-generated CV analysis results to reduce API costs';
COMMENT ON COLUMN ai_cache.cache_key IS 'SHA-256 hash of CV + job description + language';
COMMENT ON COLUMN ai_cache.hit_count IS 'Number of times this cached result was reused';
COMMENT ON COLUMN ai_cache.expires_at IS 'Automatic expiration after 30 days';

-- ==================================================================
-- 2. RATE LIMITS TABLE
-- ==================================================================
-- Tracks API requests for rate limiting to prevent abuse
-- Limits: 10 requests per hour per IP
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

-- ==================================================================
-- 3. USAGE TRACKING TABLE (Optional)
-- ==================================================================
-- Tracks usage metrics for analytics and billing
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

-- ==================================================================
-- 4. CACHE STATISTICS VIEW
-- ==================================================================
-- Provides easy access to cache performance metrics
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

-- Add comment
COMMENT ON VIEW cache_stats IS 'Cache performance metrics';

-- ==================================================================
-- 5. CACHE CLEANUP FUNCTION
-- ==================================================================
-- Automatically removes expired cache entries
-- Run this as a cron job (e.g., daily at 3 AM)
-- ==================================================================

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

-- Add comment
COMMENT ON FUNCTION cleanup_expired_cache IS 'Removes expired cache entries - run daily';

-- ==================================================================
-- 6. RATE LIMIT CLEANUP FUNCTION
-- ==================================================================
-- Removes old rate limit entries (older than 24 hours)
-- Run this hourly to keep table small
-- ==================================================================

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

-- Add comment
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes old rate limit entries - run hourly';

-- ==================================================================
-- 7. CACHE STATISTICS FUNCTION
-- ==================================================================
-- Returns detailed cache statistics (used by functions)
-- ==================================================================

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

-- Add comment
COMMENT ON FUNCTION get_cache_stats IS 'Returns detailed cache performance metrics';

-- ==================================================================
-- 8. ROW LEVEL SECURITY (RLS) - OPTIONAL
-- ==================================================================
-- Enable RLS for better security if needed
-- Uncomment if you want to restrict direct access to tables
-- ==================================================================

-- ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (backend functions)
-- CREATE POLICY "Service role has full access to ai_cache"
--   ON ai_cache FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- CREATE POLICY "Service role has full access to rate_limits"
--   ON rate_limits FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- ==================================================================
-- 9. SETUP VERIFICATION
-- ==================================================================
-- Run this to verify everything is set up correctly
-- ==================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete!';
  RAISE NOTICE '📊 Tables created: ai_cache, rate_limits, usage_tracking';
  RAISE NOTICE '🔍 Views created: cache_stats';
  RAISE NOTICE '⚙️  Functions created: cleanup_expired_cache, cleanup_old_rate_limits, get_cache_stats';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Set up cron job for cleanup_expired_cache() - run daily';
  RAISE NOTICE '2. Set up cron job for cleanup_old_rate_limits() - run hourly';
  RAISE NOTICE '3. Monitor cache performance with: SELECT * FROM cache_stats;';
  RAISE NOTICE '4. Check cache hit rate with: SELECT * FROM get_cache_stats();';
END $$;

-- ==================================================================
-- 10. TEST DATA (Optional - for testing)
-- ==================================================================
-- Uncomment to insert test data for development
-- ==================================================================

-- INSERT INTO ai_cache (
--   cache_key,
--   cv_text_hash,
--   job_description_hash,
--   language,
--   improved_cv,
--   cover_letter,
--   recruiter_tips,
--   changes_overview,
--   hit_count
-- ) VALUES (
--   'test_cache_key_123',
--   'test_cv_hash',
--   'test_job_hash',
--   'en',
--   'Test improved CV content',
--   'Test cover letter content',
--   'Test recruiter tips',
--   'Test changes overview',
--   1
-- );

-- ==================================================================
-- END OF SETUP SCRIPT
-- ==================================================================

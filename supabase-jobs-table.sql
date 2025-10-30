-- ==================================================================
-- CV Jobs Table for Background Processing
-- ==================================================================
-- Run this in your Supabase SQL Editor to add background job support
-- ==================================================================

CREATE TABLE IF NOT EXISTS cv_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  -- Input data (stored as hashes for matching)
  cv_hash TEXT NOT NULL,
  job_description_hash TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'nl',

  -- Output data
  result JSONB,
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,

  -- Rate limiting context
  client_ip TEXT,
  rate_limit_info JSONB,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cv_jobs_job_id ON cv_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_cv_jobs_status ON cv_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cv_jobs_created_at ON cv_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_cv_jobs_pending ON cv_jobs(status, created_at) WHERE status = 'pending';

-- Function to clean up old jobs (run daily)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  rows_deleted BIGINT;
BEGIN
  DELETE FROM cv_jobs
  WHERE created_at < (NOW() - INTERVAL '24 hours');

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ cv_jobs table created successfully!';
  RAISE NOTICE '📝 Background job system ready';
END $$;

# Safe Migration Guide - Existing ai_cache Table

## Problem
You already have an `ai_cache` table in use. Running the original `supabase-setup.sql` would fail or lose data.

## Solution
Use the **incremental migration** script that safely adds new columns without breaking existing data.

---

## Migration Steps (15 minutes)

### Step 1: Backup Your Existing Data (5 minutes)

**Option A: Supabase Dashboard (Easiest)**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Table Editor** → `ai_cache`
4. Click **"..."** (three dots) → **"Download as CSV"**
5. Save the file as `ai_cache_backup_YYYY-MM-DD.csv`

**Option B: SQL Backup**
Run this in Supabase SQL Editor:
```sql
-- Create backup table
CREATE TABLE ai_cache_backup AS SELECT * FROM ai_cache;

-- Verify backup
SELECT COUNT(*) FROM ai_cache;
SELECT COUNT(*) FROM ai_cache_backup;
-- Both should show same count
```

---

### Step 2: Check Current Table Structure (2 minutes)

Run this in Supabase SQL Editor:
```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_cache'
ORDER BY ordinal_position;
```

**Expected columns (you probably have these):**
- `id`
- `cache_key`
- `cv_text_hash`
- `job_description_hash`
- `language`
- `improved_cv`
- `cover_letter`
- `recruiter_tips`
- `changes_overview`
- `hit_count`
- `created_at`

**Missing columns (we'll add):**
- `expires_at` ← NEW
- `last_accessed_at` ← NEW

---

### Step 3: Run Migration Script (3 minutes)

1. Open Supabase SQL Editor
2. Copy the contents of `supabase-migration.sql`
3. Paste into the editor
4. Click **"Run"** (or Ctrl+Enter)

**What it does:**
- ✅ Adds `expires_at` column (if missing)
- ✅ Adds `last_accessed_at` column (if missing)
- ✅ Sets `expires_at = created_at + 30 days` for existing rows
- ✅ Creates `rate_limits` table (if not exists)
- ✅ Creates `usage_tracking` table (if not exists)
- ✅ Creates helper functions
- ✅ **Preserves all existing data**

**Expected output:**
```
✅ Added expires_at column to ai_cache
✅ Added last_accessed_at column to ai_cache
✅ Updated expires_at for existing rows
✅ Updated last_accessed_at for existing rows
✅ ai_cache table updated successfully!
✅ rate_limits table ready!
✅ usage_tracking table ready!
✅ cache_stats view updated!
✅ All functions created/updated!

========================================
✅ Migration Complete!
========================================

📊 Current State:
  - ai_cache: X entries (preserved!)
  - rate_limits: 0 entries
  - usage_tracking: 0 entries
```

---

### Step 4: Verify Migration (3 minutes)

**Check 1: Data Integrity**
```sql
-- Count records (should match backup)
SELECT COUNT(*) as total_entries FROM ai_cache;

-- Check new columns exist
SELECT
  cache_key,
  hit_count,
  created_at,
  expires_at,        -- Should be created_at + 30 days
  last_accessed_at   -- Should equal created_at
FROM ai_cache
LIMIT 5;
```

**Check 2: Cache Stats**
```sql
SELECT * FROM get_cache_stats();
```

Expected output:
```
total_entries | total_hits | avg_hits | hit_rate | storage_mb | oldest_entry | newest_entry
--------------+------------+----------+----------+------------+--------------+--------------
     150      |    420     |   2.80   |   64.00  |    12.50   | 2025-01-01   | 2025-01-29
```

**Check 3: Functions Work**
```sql
-- Test cleanup function (shouldn't delete anything unless you have expired entries)
SELECT cleanup_expired_cache();

-- Should return: deleted_count = 0 (if no expired entries yet)
```

---

### Step 5: Test with Your Application (2 minutes)

1. Go to your site
2. Upload a CV you've used before
3. Check Netlify function logs

**Expected log output:**
```
🔍 Checking cache...
✅ Cache HIT! (hits: X)
💰 Saved API cost! Hit count: X
```

If you see this, **migration successful!** 🎉

---

## What Changed in Your Database

### Before Migration
```
ai_cache (11 columns)
├── id
├── cache_key
├── cv_text_hash
├── job_description_hash
├── language
├── improved_cv
├── cover_letter
├── recruiter_tips
├── changes_overview
├── hit_count
└── created_at
```

### After Migration
```
ai_cache (13 columns) ← 2 new columns!
├── id
├── cache_key
├── cv_text_hash
├── job_description_hash
├── language
├── improved_cv
├── cover_letter
├── recruiter_tips
├── changes_overview
├── hit_count
├── created_at
├── expires_at          ← NEW! (created_at + 30 days)
└── last_accessed_at    ← NEW! (equals created_at for old rows)

rate_limits (new table)
├── id
├── identifier
├── limit_type
└── timestamp

usage_tracking (new table)
├── id
├── user_id
├── ip_address
├── action
├── metadata
└── created_at
```

---

## Rollback Plan (If Needed)

### If something goes wrong:

**Option 1: Restore from backup table**
```sql
-- Drop modified table
DROP TABLE ai_cache;

-- Restore from backup
ALTER TABLE ai_cache_backup RENAME TO ai_cache;

-- Recreate indexes
CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
```

**Option 2: Restore from CSV**
1. Go to Supabase → Table Editor
2. Create new table (or delete all rows from ai_cache)
3. Import CSV file

**Option 3: Drop new columns only**
```sql
-- Remove new columns but keep old data
ALTER TABLE ai_cache DROP COLUMN IF EXISTS expires_at;
ALTER TABLE ai_cache DROP COLUMN IF EXISTS last_accessed_at;
```

---

## Common Issues

### Issue 1: "Column already exists"
**Cause:** You already ran the migration
**Solution:** No problem! The script checks for existing columns and skips them

**Fix:** Just continue to verification step

---

### Issue 2: "Permission denied"
**Cause:** Not using service_role key
**Solution:**
1. Go to Supabase → Settings → API
2. Copy **service_role** key (not anon key!)
3. Update `SUPABASE_SERVICE_KEY` in Netlify

---

### Issue 3: Migration runs but no notices appear
**Cause:** Supabase doesn't always show NOTICE messages in UI
**Solution:** Check the result tabs at bottom of SQL Editor

**Verification:**
```sql
-- Run this to verify migration worked
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cache' AND column_name = 'expires_at') as has_expires_at,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cache' AND column_name = 'last_accessed_at') as has_last_accessed,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits') as has_rate_limits,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') as has_usage_tracking;
```

**Expected result:**
```
has_expires_at | has_last_accessed | has_rate_limits | has_usage_tracking
---------------+-------------------+-----------------+--------------------
     true      |       true        |      true       |        true
```

---

### Issue 4: Cache stops working after migration
**Cause:** Code expects new columns but they weren't added
**Solution:**

**Check 1: Verify columns exist**
```sql
SELECT * FROM ai_cache LIMIT 1;
```

Should show `expires_at` and `last_accessed_at` columns

**Check 2: Check function logs**
- Go to Netlify → Functions → Logs
- Look for errors mentioning `expires_at` or `last_accessed_at`

**Check 3: Redeploy functions**
```bash
# Force redeploy
git commit --allow-empty -m "Redeploy functions"
git push origin main
```

---

## Testing Checklist

After migration, verify these work:

- [ ] **Cache Hit**: Upload same CV twice, second should be instant
- [ ] **Cache Stats**: `SELECT * FROM get_cache_stats();` returns data
- [ ] **Expiration Works**: New entries have `expires_at` set
- [ ] **Rate Limiting**: 11th request in 1 hour returns 429 error
- [ ] **Health Check**: `/.netlify/functions/health` returns healthy
- [ ] **No Errors**: Check Netlify function logs for errors

---

## Maintenance

### Daily (Automated via Cron)
```sql
-- Clean up expired cache entries
SELECT cleanup_expired_cache();
```

### Weekly
```sql
-- Check cache performance
SELECT * FROM get_cache_stats();

-- Target: hit_rate > 60%
```

### Monthly
```sql
-- Clean up old rate limits
SELECT cleanup_old_rate_limits();

-- Check table sizes
SELECT
  pg_size_pretty(pg_total_relation_size('ai_cache')) as cache_size,
  pg_size_pretty(pg_total_relation_size('rate_limits')) as rate_limits_size,
  pg_size_pretty(pg_total_relation_size('usage_tracking')) as usage_size;
```

---

## Set Up Cron Jobs (Optional)

### Option 1: Supabase Cron (Recommended)
1. Go to Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs**
3. Create two jobs:

**Job 1: Daily Cache Cleanup**
```sql
SELECT cleanup_expired_cache();
```
Schedule: `0 3 * * *` (3 AM daily)

**Job 2: Hourly Rate Limit Cleanup**
```sql
SELECT cleanup_old_rate_limits();
```
Schedule: `0 * * * *` (Every hour)

### Option 2: Netlify Scheduled Function
Create `netlify/functions/scheduled-cleanup.js`:
```javascript
exports.handler = async (event) => {
  // Run via Netlify scheduled functions
  // Configure in netlify.toml
};
```

---

## FAQ

**Q: Will this delete my existing cache data?**
A: No! The migration only adds columns, never deletes data.

**Q: Do I need to stop my site during migration?**
A: No! Your site can stay running. The migration is safe to run live.

**Q: What if I already added some of these columns manually?**
A: No problem! The script checks for existing columns and skips them.

**Q: How long does migration take?**
A: Usually < 10 seconds, even with 1000s of cache entries.

**Q: Will my cache hit rate reset?**
A: No! Existing `hit_count` values are preserved.

**Q: Can I run the migration multiple times?**
A: Yes! The script is idempotent (safe to run multiple times).

---

## Next Steps After Migration

1. ✅ Verify migration with verification queries
2. ✅ Test cache still works (upload CV twice)
3. ✅ Deploy updated code to Netlify
4. ✅ Test health endpoint
5. ✅ Test cache-stats endpoint
6. ✅ Monitor for 24 hours
7. ✅ Set up cron jobs (optional)

---

## Summary

**What you did:**
- ✅ Backed up existing ai_cache table
- ✅ Ran incremental migration
- ✅ Added 2 new columns (expires_at, last_accessed_at)
- ✅ Created 2 new tables (rate_limits, usage_tracking)
- ✅ Added helper functions
- ✅ **Preserved all existing cache data**

**What's different:**
- ✅ Cache entries now auto-expire after 30 days
- ✅ Cache extends on access (popular entries stay longer)
- ✅ Rate limiting tracks requests
- ✅ New monitoring endpoints work

**Status:** Ready to deploy code changes! 🚀

---

**Need help?** Check the troubleshooting section or review the verification queries.

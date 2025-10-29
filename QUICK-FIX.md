# Quick Fix - Existing ai_cache Table

## Problem
You ran `supabase-setup.sql` but you already have an `ai_cache` table, so it failed.

## Solution (5 Minutes)

### Step 1: Run the Migration Script Instead
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open **SQL Editor**
3. Copy contents of **`supabase-migration.sql`** (NOT supabase-setup.sql)
4. Paste and click **"Run"**

### Step 2: Verify It Worked
Run this query:
```sql
SELECT * FROM get_cache_stats();
```

**If you see stats** → ✅ Success! Continue to next section.
**If you see error** → See [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) for troubleshooting.

---

## What's Different?

**`supabase-setup.sql`** (Original)
- Creates tables from scratch
- ❌ Fails if ai_cache already exists
- Use for: Fresh installations only

**`supabase-migration.sql`** (Migration)
- Updates existing tables
- ✅ Preserves your cache data
- ✅ Adds new columns only
- Use for: Existing installations

---

## Files You Need

### For Fresh Setup
```
supabase-setup.sql  → Run this
```

### For Existing Setup (YOU!)
```
supabase-migration.sql  → Run this instead
MIGRATION-GUIDE.md      → Read for details
```

---

## After Migration

Continue with [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) at **Phase 2: Configure Netlify Environment Variables**

---

## Full Details

See [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) for:
- Backup instructions
- Verification queries
- Rollback plan
- Troubleshooting

---

## Quick Commands

```sql
-- Backup your data first
CREATE TABLE ai_cache_backup AS SELECT * FROM ai_cache;

-- Run migration (paste contents of supabase-migration.sql)

-- Verify it worked
SELECT * FROM get_cache_stats();

-- Check new columns exist
SELECT
  cache_key,
  expires_at,
  last_accessed_at
FROM ai_cache
LIMIT 5;
```

---

**That's it!** Your existing cache data is preserved and you're ready to continue deployment.

# CV Tool - Deployment & Optimization Guide

## Overview
This guide walks you through deploying the optimized serverless CV Tool with all security improvements, caching, and rate limiting features.

---

## What Was Changed

### 1. Security Improvements ✅
- **CORS Configuration**: Changed from `*` (allow all) to whitelist-only
- **Rate Limiting**: Added IP-based rate limiting (10 requests/hour per IP)
- **Environment Validation**: Added config validator to catch missing env vars

### 2. Performance Improvements ✅
- **Cache Expiration**: Added 30-day expiration with auto-extension on use
- **Cache Monitoring**: New endpoint to track cache hit rates
- **Expired Entry Cleanup**: Automatic deletion of expired cache entries

### 3. New Features ✅
- **Health Check**: System health monitoring endpoint
- **Cache Statistics**: Real-time cache performance metrics
- **Config Validator**: Automatic environment variable validation

---

## Prerequisites

Before deploying, you need:

1. **Netlify Pro Account** ($19/mo) - You already have this! ✅
2. **Supabase Account** (Free tier) - [Sign up here](https://supabase.com)
3. **Google Gemini API Key** - [Get it here](https://makersuite.google.com/app/apikey)
4. **Stripe Account** (Optional) - Only if using paid plans

---

## Step-by-Step Deployment

### Phase 1: Set Up Supabase Database (15 minutes)

#### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - Name: `cv-tool` (or any name)
   - Database Password: (save this!)
   - Region: Choose closest to your users
4. Click **"Create new project"** and wait ~2 minutes

#### 1.2 Run Database Setup Script

⚠️ **IMPORTANT: Do you already have an `ai_cache` table?**

**Option A: Fresh Setup (No existing ai_cache table)**
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-setup.sql` from your project
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: ✅ Database setup complete!

**Option B: Existing ai_cache Table (Migration)**
If you already have an `ai_cache` table in use:
1. **STOP! Don't run `supabase-setup.sql`**
2. Instead, follow **[MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)**
3. This will safely add new columns without losing data
4. Come back here after migration is complete

#### 1.3 Verify Tables Were Created
1. Go to **Table Editor** (left sidebar)
2. You should see three tables:
   - `ai_cache` - Stores AI results
   - `rate_limits` - Tracks API requests
   - `usage_tracking` - Analytics (optional)

#### 1.4 Get Your Supabase Credentials
1. Go to **Settings** → **API** (left sidebar)
2. Copy these values (you'll need them for Netlify):
   - **Project URL**: `https://xxx.supabase.co`
   - **Service Role Key**: `eyJxxx...` (NOT the anon key!)

⚠️ **Important**: Use the **service_role** key, NOT the anon key!

---

### Phase 2: Configure Netlify Environment Variables (10 minutes)

#### 2.1 Go to Netlify Site Settings
1. Log into [Netlify](https://app.netlify.com)
2. Select your CV Tool site
3. Go to **Site settings** → **Environment variables**

#### 2.2 Add Required Variables
Click **"Add a variable"** and add these:

| Variable Name | Value | Where to Get It |
|--------------|-------|-----------------|
| `GEMINI_API_KEY` | `AIzaSy...` | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJxxx...` | Supabase → Settings → API (service_role) |

#### 2.3 Optional Variables (for payments)
Only add these if you're using Stripe:

| Variable Name | Value | Where to Get It |
|--------------|-------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |

#### 2.4 Verify Configuration
After adding variables, click **"Save"**. Netlify will automatically redeploy.

---

### Phase 3: Deploy Updated Code (5 minutes)

#### 3.1 Push Changes to Git
```bash
cd /path/to/cv-tool

# Check what changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Add security improvements, rate limiting, and cache optimization"

# Push to main branch (or your default branch)
git push origin main
```

#### 3.2 Wait for Netlify Deploy
1. Go to Netlify dashboard
2. Click **"Deploys"** tab
3. Wait for deploy to finish (~2-3 minutes)
4. Look for: ✅ **"Published"**

#### 3.3 Verify Deployment
Once deployed, check the deploy log for:
- ✅ Build successful
- ✅ Functions deployed (should see 8-10 functions)
- ✅ No errors

---

### Phase 4: Test Everything (10 minutes)

#### 4.1 Test Health Check
Visit: `https://your-site.netlify.app/.netlify/functions/health`

**Expected response:**
```json
{
  "status": "healthy",
  "checks": {
    "environment": {
      "status": "healthy",
      "configured": ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
    },
    "database": {
      "status": "healthy",
      "message": "Connected successfully"
    },
    "ai": {
      "status": "configured",
      "message": "API key is set"
    }
  }
}
```

❌ **If unhealthy**: Check environment variables in Netlify

#### 4.2 Test Cache Statistics
Visit: `https://your-site.netlify.app/.netlify/functions/cache-stats`

**Expected response:**
```json
{
  "success": true,
  "stats": {
    "totalEntries": 0,
    "totalHits": 0,
    "hitRate": "0%"
  }
}
```

This is normal on first deploy (empty cache).

#### 4.3 Test CV Analysis (Main Feature)
1. Go to your site: `https://your-site.netlify.app`
2. Upload a test CV (PDF)
3. Paste a job description
4. Click **"Optimize"**
5. Wait for results page

**What to check:**
- ✅ Loading screen appears
- ✅ Results page loads after ~10-30 seconds
- ✅ No errors in browser console (F12)

#### 4.4 Test Cache (Upload Same CV Again)
1. Go back to homepage
2. Upload **the exact same CV and job description**
3. Click **"Optimize"** again

**Expected behavior:**
- ⚡ Much faster response (~1-2 seconds instead of 10-30 seconds)
- Check cache stats: `totalHits` should be > 1

#### 4.5 Test Rate Limiting
Try uploading 11 CVs in quick succession:

**Expected behavior:**
- First 10 requests: ✅ Success
- 11th request: ❌ Error 429 (Rate limit exceeded)
- Error message: "Too many requests from this IP. Please try again in an hour."

---

## Monitoring & Maintenance

### Daily Monitoring

#### Check Cache Performance
```bash
curl https://your-site.netlify.app/.netlify/functions/cache-stats
```

**Target metrics:**
- Hit rate: > 40% (good), > 60% (excellent)
- Total hits: Growing over time
- Avg hit count: > 1.5

#### Check System Health
```bash
curl https://your-site.netlify.app/.netlify/functions/health
```

**Should always return:** `"status": "healthy"`

### Weekly Tasks

#### 1. Review Netlify Analytics
- Go to Netlify → Analytics
- Check:
  - Function invocations (should be under 125k/month for free tier)
  - Bandwidth usage
  - Error rates

#### 2. Review Supabase Usage
- Go to Supabase → Settings → Usage
- Check:
  - Database size (should be < 500MB for free tier)
  - API requests
  - Storage usage

#### 3. Check Gemini API Costs
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Navigate to: APIs & Services → Gemini API → Quotas & limits
- Check total token usage and costs

### Monthly Tasks

#### 1. Clean Up Expired Cache
Run this in Supabase SQL Editor:
```sql
SELECT cleanup_expired_cache();
```

Expected: `deleted_count: X` (where X is number of expired entries)

#### 2. Clean Up Old Rate Limits
Run this in Supabase SQL Editor:
```sql
SELECT cleanup_old_rate_limits();
```

#### 3. Review Cost Breakdown
Track costs:
- Netlify Pro: $19/mo (fixed)
- Gemini API: $X (variable, check Google Cloud)
- Supabase: $0 (free tier) or $25/mo (pro)
- Total: ~$20-50/mo depending on usage

---

## Cost Optimization Tips

### 1. Increase Cache Hit Rate (Target: 60%+)
**Current:** Check with cache-stats endpoint
**How to improve:**
- Extend cache expiration (edit cache-helper.js, line 65)
- Pre-cache popular job descriptions
- Encourage users to use standardized job titles

**Savings:** 60% hit rate = ~$10-15/mo saved on AI costs

### 2. Monitor Rate Limiting
**Current:** 10 requests/hour per IP
**How to adjust:**
- Too strict? Increase limit in rate-limiter.js line 12
- Too loose? Decrease limit
- Add user-based limits (requires auth)

**Savings:** Prevents abuse = ~$5-10/mo saved

### 3. Optimize AI Model Usage
**Current:** Using `gemini-2.0-flash` (cheapest)
**Alternatives:**
- Gemini 1.5 Flash: Even cheaper, slightly less capable
- Gemini 1.5 Pro: More expensive, better quality

**Cost comparison (per 1k requests):**
- Flash 2.0: ~$0.08
- Flash 1.5: ~$0.05
- Pro 1.5: ~$0.30

### 4. Set Up Supabase Cron Jobs (Advanced)
Automate cleanup tasks:
1. Go to Supabase → Database → Cron Jobs
2. Add daily job: `SELECT cleanup_expired_cache();`
3. Add hourly job: `SELECT cleanup_old_rate_limits();`

**Savings:** Keeps database small = better performance

---

## Troubleshooting

### Problem: Health check shows "unhealthy"

**Solution:**
1. Check which component is unhealthy
2. If environment: Verify all env vars in Netlify
3. If database: Check Supabase credentials
4. If AI: Verify Gemini API key

### Problem: Cache not working (0% hit rate)

**Possible causes:**
1. Supabase table not created → Run supabase-setup.sql
2. Wrong Supabase key → Use service_role, not anon
3. Cache expiring too soon → Check expires_at in database

**Debug:**
```sql
-- Check cache table in Supabase
SELECT * FROM ai_cache ORDER BY created_at DESC LIMIT 10;
```

### Problem: Rate limiting too aggressive

**Solution:**
Edit `netlify/functions/rate-limiter.js`:
```javascript
// Line 12: Change these values
const RATE_LIMITS = {
  ip: {
    max: 20, // Increase from 10 to 20
    window: 3600000, // Keep at 1 hour
  }
};
```

Then commit and push:
```bash
git add netlify/functions/rate-limiter.js
git commit -m "Increase rate limit to 20/hour"
git push origin main
```

### Problem: High AI costs

**Solutions:**
1. Check cache hit rate → Should be > 40%
2. Look for abuse → Check rate_limits table
3. Review Netlify logs → Look for errors causing retries
4. Consider switching to Gemini 1.5 Flash

**Debug costs:**
```bash
# Check total API calls in Netlify logs
netlify logs:function analyze-cv --follow
```

### Problem: Slow performance

**Solutions:**
1. Check cache hit rate → Low hit rate = more AI calls
2. Verify Supabase region → Should be close to users
3. Check function cold starts → First request is always slow
4. Monitor Netlify function logs → Look for errors

---

## Advanced Configuration

### Custom Rate Limits

Edit `netlify/functions/rate-limiter.js`:

```javascript
const RATE_LIMITS = {
  // Per IP limits
  ip: {
    max: 10,
    window: 3600000, // 1 hour
    message: 'Too many requests from this IP.'
  },

  // Global limits (all users combined)
  global: {
    max: 1000,
    window: 60000, // 1 minute
    message: 'Service is experiencing high load.'
  },

  // Per user limits (requires auth)
  user: {
    max: 50,
    window: 86400000, // 24 hours
    message: 'Daily limit reached for your account.'
  }
};
```

### Cache Expiration Tuning

Edit `netlify/functions/cache-helper.js`:

```javascript
// Line 65: Change expiration time
const newExpiresAt = new Date();
newExpiresAt.setDate(newExpiresAt.getDate() + 60); // 60 days instead of 30
```

**Recommendation:**
- High hit rate (>60%): Keep at 30 days
- Low hit rate (<40%): Increase to 60-90 days
- Very active site: Decrease to 14 days

---

## Security Best Practices

### 1. Never Commit Secrets
❌ **Don't:**
```bash
# Bad - exposes secrets
git add .env
git commit -m "Add API keys"
```

✅ **Do:**
```bash
# Good - .env is in .gitignore
echo "GEMINI_API_KEY=xxx" >> .env
# Then add to Netlify UI instead
```

### 2. Rotate API Keys Regularly
**Schedule:**
- Gemini API key: Every 90 days
- Supabase service key: Every 180 days
- Stripe keys: When suspicious activity detected

### 3. Monitor for Abuse
**Red flags:**
- Sudden spike in function invocations
- High rate limit violations
- Unusual API costs

**Action:**
1. Check Netlify logs
2. Review rate_limits table in Supabase
3. Temporarily reduce rate limits if needed

### 4. Enable Supabase Row Level Security (RLS)

In Supabase SQL Editor:
```sql
-- Enable RLS on cache table
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

-- Only allow service role access
CREATE POLICY "Service role only" ON ai_cache
  FOR ALL TO service_role
  USING (true);
```

---

## Next Steps

### Immediate (This Week)
- [x] Deploy code changes
- [x] Set up Supabase database
- [x] Configure Netlify env vars
- [ ] Test all endpoints
- [ ] Monitor for 24 hours

### Short Term (This Month)
- [ ] Set up Supabase cron jobs for cleanup
- [ ] Add monitoring alerts (optional)
- [ ] Create backup of Supabase database
- [ ] Document any custom changes

### Long Term (3+ Months)
- [ ] Review cost trends
- [ ] Optimize based on usage patterns
- [ ] Consider upgrading Supabase if needed
- [ ] Explore Cloudflare Workers (optional)

---

## Support & Resources

### Documentation
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Supabase Docs](https://supabase.com/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)

### Monitoring Tools
- Netlify Analytics: Built-in (free with Pro)
- Supabase Dashboard: Real-time metrics
- Google Cloud Console: Gemini API usage

### Getting Help
- Netlify Support: support@netlify.com (Pro plan includes email support)
- Supabase Discord: https://discord.supabase.com
- Stack Overflow: Tag questions with `netlify`, `supabase`

---

## Summary

**What you deployed:**
- ✅ Secure CORS configuration
- ✅ Rate limiting (10 req/hour per IP)
- ✅ Cache with 30-day expiration
- ✅ Health check endpoint
- ✅ Cache statistics endpoint
- ✅ Environment validation

**Expected costs:**
- Base: ~$27/mo for 1,000 users
- Per user: ~$0.027 (2.7 cents)

**Next action:**
Test the health endpoint to verify everything is working!

```bash
curl https://your-site.netlify.app/.netlify/functions/health
```

If you see `"status": "healthy"` - you're done! 🎉

---

**Questions?** Check the Troubleshooting section or refer to the support resources above.

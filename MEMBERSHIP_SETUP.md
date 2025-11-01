# 🎯 Membership System Setup Guide

Complete guide to set up the Stripe + Supabase membership system for the CV Tool.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Stripe Configuration](#stripe-configuration)
5. [Environment Variables](#environment-variables)
6. [Testing the System](#testing-the-system)
7. [Cost Analysis](#cost-analysis)
8. [Troubleshooting](#troubleshooting)

---

## 🌟 Overview

The membership system provides:
- **Free Tier**: 3 CVs per month
- **Premium Tier**: Unlimited CVs for €9.99/month
- **Low Cost**: ~€0-2/month for first 50k users
- **Fast Checks**: Database queries instead of Stripe API calls
- **Full Audit Trail**: All subscription events logged

### Architecture

```
User → Frontend → Netlify Functions → Supabase Database
                      ↓
                   Stripe API
                      ↓
                  Webhooks → Update Supabase
```

---

## ✅ Prerequisites

Before you begin, ensure you have:

1. ✅ **Supabase Account** (free tier is perfect)
   - Sign up at [supabase.com](https://supabase.com)

2. ✅ **Stripe Account** (test mode is fine initially)
   - Sign up at [stripe.com](https://stripe.com)

3. ✅ **Netlify Account** (for hosting functions)
   - Your site must be deployed on Netlify

---

## 🗄️ Database Setup

### Step 1: Run SQL Scripts

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Run the following scripts **in order**:

#### A. Main Database Setup (if not already done)
```bash
# In Supabase SQL Editor, run:
supabase-setup.sql
```
This creates:
- `ai_cache` table (for caching AI responses)
- `rate_limits` table (for IP-based rate limiting)
- `usage_tracking` table (for analytics)

#### B. Membership Tables
```bash
# In Supabase SQL Editor, run:
supabase-membership.sql
```
This creates:
- `users` table (user profiles + subscription info)
- `subscription_events` table (audit log)
- Helper functions for subscription management
- Row Level Security policies

### Step 2: Verify Tables

Run this query to verify everything is created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- ✅ ai_cache
- ✅ rate_limits
- ✅ subscription_events
- ✅ usage_tracking
- ✅ users

### Step 3: Enable Supabase Auth

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider (required)
3. Optionally enable **Google**, **GitHub**, etc.
4. Configure email templates under **Email Templates**

### Step 4: Set Up Cron Jobs (Optional but Recommended)

In Supabase dashboard → **Database** → **Cron Jobs**:

```sql
-- Reset monthly CV usage on 1st of each month at 00:00 UTC
SELECT cron.schedule(
    'reset-monthly-usage',
    '0 0 1 * *',
    $$SELECT reset_monthly_usage()$$
);

-- Clean up old rate limit entries every hour
SELECT cron.schedule(
    'cleanup-rate-limits',
    '0 * * * *',
    $$SELECT cleanup_old_rate_limits()$$
);

-- Clean up expired cache entries daily at 3 AM
SELECT cron.schedule(
    'cleanup-expired-cache',
    '0 3 * * *',
    $$SELECT cleanup_expired_cache()$$
);
```

---

## 💳 Stripe Configuration

### Step 1: Get API Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Click **Developers** → **API keys**
3. Copy these keys (start with test keys):
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

### Step 2: Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks** in Stripe dashboard
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-site.netlify.app/.netlify/functions/stripe-webhook
   ```
4. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

### Step 3: Test Webhook (Important!)

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

---

## 🔐 Environment Variables

### Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **service_role key** (⚠️ keep secret!)

### Step 2: Configure Netlify

Go to your Netlify site → **Site settings** → **Environment variables**

Add these variables:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Optional: Developer Mode (bypass rate limits)
DEV_WHITELIST_IPS=your.ip.address.here
```

### Step 3: Local Development

Create `.env` file in project root:

```bash
cp .env.example .env
# Then edit .env with your actual values
```

**⚠️ NEVER commit `.env` to git!**

---

## 🧪 Testing the System

### Test 1: Database Connection

```bash
# Run Netlify functions locally
netlify dev

# Test health check
curl http://localhost:8888/.netlify/functions/health
```

### Test 2: Subscription Check

```bash
# Test subscription status for non-existent user (should return free tier)
curl -X POST http://localhost:8888/.netlify/functions/check-subscription \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected response:
{
  "hasActiveSubscription": false,
  "canUse": true,
  "subscription": {
    "status": "free",
    "plan": "free",
    "isPremium": false,
    "canProcess": true,
    "monthlyLimit": 3,
    "monthlyUsed": 0,
    "remainingUses": 3
  }
}
```

### Test 3: Checkout Session

```bash
# Create a checkout session
curl -X POST http://localhost:8888/.netlify/functions/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected response:
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Test 4: Full Flow

1. **Create Checkout** → Get checkout URL
2. **Complete Payment** → Use Stripe test card: `4242 4242 4242 4242`
3. **Webhook Fires** → Updates Supabase database
4. **Check Subscription** → Should now return `isPremium: true`

---

## 💰 Cost Analysis

### Current Setup (No Database)

```
Stripe API calls for subscription checks:
- 10,000 checks/day × 30 days = 300,000 checks/month
- Cost: ~€6/month just for API calls
- Slow: ~200-500ms per check
```

### New Setup (With Supabase)

```
Supabase Database:
- Free tier: 500MB storage + 2GB bandwidth
- Database queries: unlimited and free
- Fast: ~10-50ms per check

Stripe API calls:
- Only on checkout/webhooks
- ~10-50 calls/month
- Cost: ~€0/month

Total: €0-2/month for first 50,000 users! 🎉
```

### Scaling

| Users     | DB Size | Cost/Month |
|-----------|---------|------------|
| 1,000     | ~10MB   | €0         |
| 10,000    | ~100MB  | €0         |
| 50,000    | ~500MB  | €0         |
| 100,000   | ~1GB    | €8         |
| 500,000   | ~5GB    | €32        |

---

## 🐛 Troubleshooting

### Issue: "Supabase credentials not configured"

**Solution**: Check environment variables in Netlify dashboard

```bash
# Verify in Netlify deploy logs
netlify env:list
```

### Issue: Webhook not receiving events

**Solutions**:
1. Check webhook URL is correct in Stripe dashboard
2. Verify webhook secret is set in environment variables
3. Check Netlify function logs for errors
4. Test with Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Issue: "Row Level Security" errors

**Solution**: Ensure you're using `SUPABASE_SERVICE_KEY` (not anon key!)

### Issue: Monthly usage not resetting

**Solution**: Check cron job is set up:

```sql
-- In Supabase SQL Editor
SELECT * FROM cron.job;
```

### Issue: Users can't sign up

**Solution**:
1. Enable Email provider in Supabase Auth settings
2. Check email templates are configured
3. Verify `users` table exists with correct RLS policies

---

## 📊 Monitoring

### Check Subscription Stats

```sql
-- In Supabase SQL Editor

-- Active subscriptions
SELECT * FROM active_subscriptions;

-- Revenue metrics
SELECT * FROM subscription_revenue;

-- Recent subscription events
SELECT * FROM subscription_events
ORDER BY created_at DESC
LIMIT 10;

-- User usage stats
SELECT
  subscription_status,
  COUNT(*) as user_count,
  AVG(monthly_cv_count) as avg_usage
FROM users
GROUP BY subscription_status;
```

### Netlify Function Logs

```bash
netlify functions:log stripe-webhook
netlify functions:log check-subscription
netlify functions:log create-checkout
```

---

## 🚀 Going Live

Before going to production:

1. ✅ Switch Stripe from test mode to live mode
2. ✅ Update Stripe API keys in Netlify
3. ✅ Update webhook endpoint to use live keys
4. ✅ Test full checkout flow with real payment
5. ✅ Set up Stripe billing settings (tax, invoices, etc.)
6. ✅ Configure email notifications in Supabase
7. ✅ Set up monitoring alerts

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🆘 Need Help?

If you encounter issues:

1. Check Netlify function logs
2. Check Supabase logs (Database → Logs)
3. Check Stripe webhook logs
4. Review the code in `netlify/functions/` directory
5. Test locally with `netlify dev`

---

**Built with ❤️ using Stripe + Supabase**

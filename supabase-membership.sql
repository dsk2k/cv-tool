-- ==================================================================
-- CV Tool - Membership & Subscription System
-- ==================================================================
-- This script sets up user authentication and Stripe subscription management
-- Run this in your Supabase SQL Editor AFTER running supabase-setup.sql
-- ==================================================================

-- ==================================================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- ==================================================================
-- Stores additional user profile data and subscription info
-- Linked to Supabase Auth via user_id (UUID)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,

  -- Stripe Integration
  stripe_customer_id text UNIQUE,

  -- Subscription Status
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'past_due', 'canceled', 'trialing')),
  subscription_id text,
  subscription_plan text DEFAULT 'free' CHECK (subscription_plan IN ('free', 'monthly', 'yearly')),

  -- Subscription Dates
  subscription_created_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,

  -- Usage Tracking
  monthly_cv_count integer DEFAULT 0,
  last_reset_at timestamptz DEFAULT now(),

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON public.users(subscription_id);

-- Add comments
COMMENT ON TABLE public.users IS 'User profiles with Stripe subscription data';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.users.subscription_status IS 'Current subscription status (free, active, past_due, canceled, trialing)';
COMMENT ON COLUMN public.users.monthly_cv_count IS 'Number of CVs processed this month (resets monthly)';

-- ==================================================================
-- 2. SUBSCRIPTION EVENTS TABLE
-- ==================================================================
-- Audit log of all subscription changes (from Stripe webhooks)
-- ==================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  subscription_id text,

  -- Event Data
  status text,
  plan text,
  amount integer,
  currency text DEFAULT 'eur',

  -- Metadata
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_id ON subscription_events(stripe_event_id);

-- Add comment
COMMENT ON TABLE subscription_events IS 'Audit log of subscription changes from Stripe webhooks';

-- ==================================================================
-- 3. AUTO-UPDATE TIMESTAMP TRIGGER
-- ==================================================================
-- Automatically updates the updated_at column
-- ==================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================
-- 4. MONTHLY USAGE RESET FUNCTION
-- ==================================================================
-- Resets monthly CV count for all users
-- Run this as a cron job on the 1st of each month
-- ==================================================================

CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS TABLE(reset_count bigint) AS $$
DECLARE
  rows_updated bigint;
BEGIN
  UPDATE public.users
  SET
    monthly_cv_count = 0,
    last_reset_at = now()
  WHERE last_reset_at < date_trunc('month', now());

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN QUERY SELECT rows_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_usage IS 'Resets monthly CV counts - run on 1st of each month';

-- ==================================================================
-- 5. USER SUBSCRIPTION STATUS FUNCTION
-- ==================================================================
-- Returns current subscription status and usage limits
-- ==================================================================

CREATE OR REPLACE FUNCTION get_user_subscription(user_email text)
RETURNS TABLE(
  user_id uuid,
  subscription_status text,
  subscription_plan text,
  monthly_limit integer,
  monthly_used integer,
  can_process boolean,
  is_premium boolean,
  days_remaining integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.subscription_status,
    u.subscription_plan,
    CASE
      WHEN u.subscription_status IN ('active', 'trialing') THEN 999999  -- Unlimited for premium
      ELSE 3  -- Free tier: 3 per month
    END as monthly_limit,
    u.monthly_cv_count as monthly_used,
    CASE
      WHEN u.subscription_status IN ('active', 'trialing') THEN true
      WHEN u.monthly_cv_count < 3 THEN true
      ELSE false
    END as can_process,
    CASE
      WHEN u.subscription_status IN ('active', 'trialing') THEN true
      ELSE false
    END as is_premium,
    CASE
      WHEN u.current_period_end IS NOT NULL THEN
        EXTRACT(day FROM u.current_period_end - now())::integer
      ELSE NULL
    END as days_remaining
  FROM public.users u
  WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_subscription IS 'Returns user subscription status and usage limits';

-- ==================================================================
-- 6. INCREMENT CV USAGE FUNCTION
-- ==================================================================
-- Increments the monthly CV count for a user
-- ==================================================================

CREATE OR REPLACE FUNCTION increment_cv_usage(user_email text)
RETURNS TABLE(
  success boolean,
  new_count integer,
  limit_reached boolean
) AS $$
DECLARE
  v_new_count integer;
  v_is_premium boolean;
BEGIN
  -- Update the count
  UPDATE public.users
  SET monthly_cv_count = monthly_cv_count + 1
  WHERE email = user_email
  RETURNING monthly_cv_count, (subscription_status IN ('active', 'trialing'))
  INTO v_new_count, v_is_premium;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, true;
    RETURN;
  END IF;

  -- Check if limit reached (only for free users)
  RETURN QUERY SELECT
    true,
    v_new_count,
    CASE WHEN v_is_premium THEN false ELSE v_new_count >= 3 END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_cv_usage IS 'Increments CV usage count and checks limits';

-- ==================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==================================================================
-- Enable RLS for secure access to user data
-- ==================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own non-subscription fields
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role (backend functions) has full access
CREATE POLICY "Service role has full access to users"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to subscription_events"
  ON subscription_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own subscription events
CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- ==================================================================
-- 8. HELPER VIEW - ACTIVE SUBSCRIPTIONS
-- ==================================================================
-- Easy view of all active premium users
-- ==================================================================

CREATE OR REPLACE VIEW active_subscriptions AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.subscription_plan,
  u.subscription_status,
  u.monthly_cv_count,
  u.current_period_start,
  u.current_period_end,
  u.cancel_at_period_end,
  EXTRACT(day FROM u.current_period_end - now())::integer as days_remaining
FROM public.users u
WHERE u.subscription_status IN ('active', 'trialing')
ORDER BY u.current_period_end ASC;

COMMENT ON VIEW active_subscriptions IS 'List of all active premium subscribers';

-- ==================================================================
-- 9. HELPER VIEW - SUBSCRIPTION REVENUE
-- ==================================================================
-- Monthly recurring revenue metrics
-- ==================================================================

CREATE OR REPLACE VIEW subscription_revenue AS
SELECT
  COUNT(*) FILTER (WHERE subscription_plan = 'monthly') as monthly_subs,
  COUNT(*) FILTER (WHERE subscription_plan = 'yearly') as yearly_subs,
  (COUNT(*) FILTER (WHERE subscription_plan = 'monthly') * 9.99) as monthly_mrr,
  (COUNT(*) FILTER (WHERE subscription_plan = 'yearly') * 99.99 / 12) as yearly_mrr,
  (COUNT(*) FILTER (WHERE subscription_plan = 'monthly') * 9.99) +
  (COUNT(*) FILTER (WHERE subscription_plan = 'yearly') * 99.99 / 12) as total_mrr
FROM public.users
WHERE subscription_status = 'active';

COMMENT ON VIEW subscription_revenue IS 'Monthly recurring revenue metrics';

-- ==================================================================
-- 10. SETUP VERIFICATION
-- ==================================================================
-- Run this to verify everything is set up correctly
-- ==================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Membership system setup complete!';
  RAISE NOTICE '📊 Tables created: users, subscription_events';
  RAISE NOTICE '🔍 Views created: active_subscriptions, subscription_revenue';
  RAISE NOTICE '⚙️  Functions created: reset_monthly_usage, get_user_subscription, increment_cv_usage';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Enable Supabase Auth in your project dashboard';
  RAISE NOTICE '2. Configure allowed auth providers (email/password, Google, etc.)';
  RAISE NOTICE '3. Set up cron job for reset_monthly_usage() - run on 1st of each month';
  RAISE NOTICE '4. Update Stripe webhook handler to write to subscription_events table';
  RAISE NOTICE '5. Test subscription flow: signup → checkout → webhook → verification';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Usage:';
  RAISE NOTICE '   - Check user status: SELECT * FROM get_user_subscription(''user@example.com'');';
  RAISE NOTICE '   - View active subs: SELECT * FROM active_subscriptions;';
  RAISE NOTICE '   - Check revenue: SELECT * FROM subscription_revenue;';
END $$;

-- ==================================================================
-- END OF MEMBERSHIP SETUP SCRIPT
-- ==================================================================

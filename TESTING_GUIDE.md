# 🧪 Testing Guide - Complete Membership Flow

Step-by-step guide to test the entire membership system locally with Stripe test mode.

---

## 🚀 Quick Start

```bash
# 1. Start local development server
netlify dev

# 2. Open browser
open http://localhost:8888
```

---

## ✅ Test Checklist

### Phase 1: Frontend & Auth (No Backend Required)

- [ ] **Auth Modal Opens**
  - Click "Login / Sign Up" button
  - Modal should slide up with smooth animation
  - Can close by clicking X, outside modal, or ESC key

- [ ] **Sign Up Flow**
  - Enter email, password, name
  - Click "Create Account"
  - Should see success message
  - Check Supabase dashboard → Authentication → Users

- [ ] **Sign In Flow**
  - Use same email/password from signup
  - Click "Sign In"
  - Should see success and page reloads
  - User avatar/email appears in header

- [ ] **Sign Out**
  - Click on user avatar/email in header
  - Confirm logout
  - Should return to logged-out state

- [ ] **Google Sign In** (Optional - requires setup)
  - Click "Sign in with Google"
  - Should redirect to Google OAuth
  - After auth, redirects back to site

### Phase 2: Analytics Tracking

- [ ] **CV Optimization Tracking**
  - Open browser console (F12)
  - Click "✨ Optimize My CV" button
  - Should see: `📊 Tracked: CV Optimization Started (CONVERSION)`
  - Verify in GA4 Realtime view

- [ ] **Signup Tracking**
  - Sign up with new email
  - Should see: `📊 Tracked: User Signup via email`

- [ ] **Login Tracking**
  - Sign in
  - Should see: `📊 Tracked: User Login via email`

### Phase 3: Database & Subscriptions

- [ ] **Database Setup**
  - Run `supabase-setup.sql` in Supabase SQL Editor
  - Run `supabase-membership.sql` in Supabase SQL Editor
  - Verify tables exist (users, subscription_events, etc.)

- [ ] **User Creation in Database**
  - Sign up with new email
  - Check Supabase dashboard → Table Editor → `users` table
  - Should see new user with `subscription_status: 'free'`

- [ ] **Subscription Check API**
  - Open browser console
  - Run:
    ```javascript
    fetch('/.netlify/functions/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    })
    .then(r => r.json())
    .then(console.log)
    ```
  - Should return subscription status

### Phase 4: Stripe Integration

- [ ] **Stripe Webhook Setup**
  - Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (Mac) or download from stripe.com
  - Login: `stripe login`
  - Forward webhooks:
    ```bash
    stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
    ```
  - Copy webhook signing secret to `.env`

- [ ] **Create Checkout Session**
  - Run in browser console:
    ```javascript
    fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    })
    .then(r => r.json())
    .then(data => window.open(data.url, '_blank'))
    ```
  - Should open Stripe checkout page

- [ ] **Complete Test Purchase**
  - Use test card: `4242 4242 4242 4242`
  - CVC: any 3 digits (e.g., `123`)
  - Expiry: any future date (e.g., `12/34`)
  - Click "Subscribe"

- [ ] **Verify Webhook Processing**
  - Check Stripe CLI output for webhook events
  - Check Netlify function logs
  - Should see:
    ```
    📬 Received webhook event: customer.subscription.created
    ✅ Successfully updated subscription in Supabase
    ```

- [ ] **Verify Database Update**
  - Check Supabase → Table Editor → `users`
  - User should now have:
    - `subscription_status: 'active'`
    - `subscription_plan: 'monthly'`
    - `stripe_customer_id: 'cus_...'`
  - Check `subscription_events` table for logged events

- [ ] **Verify Subscription Check**
  - Run subscription check again (Phase 3)
  - Should now return `isPremium: true`

### Phase 5: Rate Limiting

- [ ] **Free User Limit**
  - Sign in as free user
  - Submit 3 CVs
  - 4th submission should be blocked with:
    ```
    📊 Tracked: Rate Limit Hit - monthly
    Subscription limit exceeded
    ```

- [ ] **Premium User Unlimited**
  - Sign in as premium user (after test purchase)
  - Submit multiple CVs
  - Should all go through

### Phase 6: Admin Dashboard

- [ ] **Open Dashboard**
  - Navigate to `/admin-dashboard.html`
  - Update Supabase credentials in the file
  - Click "🔄 Refresh"

- [ ] **Verify Stats**
  - Total Users: Should show count
  - Premium Users: Should show count after test purchase
  - MRR: Should calculate based on premium users
  - CVs This Month: Should show total usage

- [ ] **View Tables**
  - Active Subscriptions table should show test subscription
  - Recent Users table should show recent signups

---

## 🐛 Common Issues & Solutions

### Issue 1: "Supabase credentials not configured"

**Symptom:** Auth doesn't work, can't sign up

**Solution:**
1. Open `config.js`
2. Replace `YOUR_PROJECT.supabase.co` with your actual Supabase URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key
4. Get these from: Supabase Dashboard → Settings → API

### Issue 2: "Failed to create checkout session"

**Symptom:** Checkout doesn't open

**Solutions:**
1. Check Stripe keys in `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```
2. Verify Netlify Functions are running: `netlify dev`
3. Check browser console for error details
4. Check Netlify function logs

### Issue 3: Webhooks not firing

**Symptom:** Purchase doesn't update database

**Solutions:**
1. Check Stripe CLI is running: `stripe listen --forward-to ...`
2. Verify webhook secret in `.env` matches CLI output
3. Check webhook function logs for errors
4. Manually trigger test event:
   ```bash
   stripe trigger customer.subscription.created
   ```

### Issue 4: "Table does not exist"

**Symptom:** Database queries fail

**Solution:**
1. Run SQL scripts in order:
   - First: `supabase-setup.sql`
   - Second: `supabase-membership.sql`
2. Verify tables exist in Supabase → Table Editor
3. Check for any SQL errors in query results

### Issue 5: GA4 events not showing

**Symptom:** Console shows tracking but not in GA4

**Solutions:**
1. Wait 30-60 seconds (there's a delay)
2. Check GA4 Realtime view, not standard reports
3. Verify GA4 property ID is correct
4. Check Ad Blockers aren't blocking gtag.js
5. Use GA4 DebugView for detailed event inspection

---

## 📊 Expected Data Flow

```
User Action → Frontend → Netlify Function → Supabase/Stripe
     ↓
  Analytics (GA4)

Example Flow:
1. User clicks "Optimize My CV"
   → trackCVOptimizationStart()
   → GA4 receives 'cv_optimization_started' event

2. User signs up
   → authManager.signUp()
   → Supabase Auth creates user
   → supabase-client creates user profile in 'users' table
   → trackUserSignup() → GA4

3. User upgrades
   → create-checkout.js → Creates Stripe checkout
   → User completes payment
   → Stripe webhook → stripe-webhook.js
   → Updates 'users' table with subscription
   → Logs to 'subscription_events' table
   → trackSubscriptionPurchase() → GA4

4. User submits CV
   → Check rate limit
   → If premium: allow
   → If free: check monthly_cv_count
   → Increment usage in database
```

---

## 🎯 Success Criteria

System is working correctly when:

✅ Users can sign up and sign in
✅ GA4 receives all tracking events
✅ Test purchases create subscriptions
✅ Webhooks update database correctly
✅ Rate limiting works for free/premium users
✅ Admin dashboard shows correct data
✅ No console errors
✅ All Netlify functions return 200 status

---

## 📸 Screenshots to Take

When testing, capture:

1. **Auth Modal** - Signup/login forms
2. **Stripe Checkout** - Test payment page
3. **GA4 Realtime** - Events appearing
4. **Supabase Dashboard** - Users table with data
5. **Admin Dashboard** - Stats and tables populated
6. **Browser Console** - Tracking logs
7. **Stripe Dashboard** - Test subscription created
8. **Webhook Logs** - Events being processed

---

## 🚀 Next Steps After Testing

Once everything works:

1. ✅ Document any customizations you made
2. ✅ Set up monitoring/alerts
3. ✅ Plan production deployment
4. ✅ Configure email templates in Supabase
5. ✅ Set up Stripe live mode (when ready)
6. ✅ Add custom branding
7. ✅ Configure GA4 conversion goals
8. ✅ Set up customer success emails

---

## 💡 Pro Tips

- Use different email addresses for testing different scenarios
- Use Gmail + trick: `test+1@gmail.com`, `test+2@gmail.com` all go to `test@gmail.com`
- Keep Stripe CLI running while testing
- Monitor Netlify function logs: `netlify dev` shows all logs
- Use browser's Network tab to debug API calls
- Check Supabase logs for database errors
- Test on mobile too (responsive design)

---

## 🆘 Still Having Issues?

1. Check all console.log messages - they tell you what's happening
2. Review [MEMBERSHIP_SETUP.md](MEMBERSHIP_SETUP.md) for backend setup
3. Review [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) for frontend
4. Check Netlify deploy logs if deployed
5. Verify all environment variables are set
6. Try clearing browser cache and cookies

---

**Happy Testing! 🎉**

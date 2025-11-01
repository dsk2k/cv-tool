# 🎨 Frontend Integration Guide

Complete guide to integrate auth, analytics, and subscription features into your frontend.

---

## 📦 Step 1: Add Required Files

Make sure these files exist in your project root:
- ✅ `config.js` - Configuration
- ✅ `auth.js` - Auth manager
- ✅ `auth-modal.html` - Auth UI
- ✅ `tracking.js` - Analytics tracking

---

## 🔧 Step 2: Configure Supabase & Stripe

Edit `config.js` and replace placeholders with your actual values:

```javascript
window.APP_CONFIG = {
    supabase: {
        url: 'https://abcdefgh.supabase.co',  // Your Supabase project URL
        anonKey: 'eyJhbGc...'                   // Your Supabase anon key
    },
    stripe: {
        publishableKey: 'pk_test_...'           // Your Stripe publishable key
    }
};
```

### Where to Find These Values:

**Supabase:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click Settings → API
4. Copy:
   - **Project URL** → `supabase.url`
   - **anon/public key** → `supabase.anonKey` (⚠️ This is PUBLIC and safe to expose)

**Stripe:**
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Click Developers → API keys
3. Copy **Publishable key** (starts with `pk_test_` in test mode)

---

## 📝 Step 3: Add to index.html

### A. Add Scripts to `<head>` (after existing scripts)

```html
<!-- Auth & Subscription System -->
<script src="/config.js"></script>
<script src="/auth.js"></script>
<script src="/tracking.js"></script>
```

### B. Add Auth Modal Before Closing `</body>`

```html
<!-- Auth Modal -->
<div id="auth-modal-container"></div>
<script>
    // Load auth modal HTML
    fetch('/auth-modal.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('auth-modal-container').innerHTML = html;
        });
</script>

<!-- Initialize Auth with Supabase Config -->
<script>
    // Wait for config to load, then init auth with correct credentials
    window.addEventListener('DOMContentLoaded', async () => {
        const config = window.getSupabaseConfig();

        // Override auth manager init to use config
        const originalInit = window.authManager.init;
        window.authManager.init = async function() {
            if (!window.supabase) {
                await this.loadSupabaseScript();
            }

            this.supabase = window.supabase.createClient(config.url, config.anonKey);

            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state changed:', event);
                this.currentUser = session?.user || null;
                this.notifyAuthChange(session);

                // Update UI when auth changes
                updateAuthUI();
            });

            const { data: { session } } = await this.supabase.auth.getSession();
            this.currentUser = session?.user || null;

            // Initial UI update
            updateAuthUI();

            return this.currentUser;
        };

        // Initialize
        await window.authManager.init();
    });

    // Update UI based on auth state
    function updateAuthUI() {
        const user = window.authManager.getUser();
        const authButton = document.getElementById('auth-button');

        if (authButton) {
            if (user) {
                authButton.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                            ${user.email.charAt(0).toUpperCase()}
                        </div>
                        <span>${user.email}</span>
                    </div>
                `;
                authButton.onclick = () => {
                    if (confirm('Log out?')) {
                        window.authManager.signOut().then(() => window.location.reload());
                    }
                };
            } else {
                authButton.innerHTML = '🔐 Login / Sign Up';
                authButton.onclick = () => openAuthModal('login');
            }
        }
    }
</script>
```

### C. Add Auth Button to Header/Navigation

Find your header/navigation section and add:

```html
<!-- Add this to your header -->
<button
    id="auth-button"
    onclick="openAuthModal('login')"
    class="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:scale-105 transition-transform"
>
    🔐 Login / Sign Up
</button>
```

### D. Add Tracking to CV Submit Button

Find the form submit button (around line 1347) and update it:

```html
<button
    type="submit"
    class="w-full btn-primary text-white py-4 rounded-lg font-bold text-lg shadow-xl"
    onclick="trackCVOptimizationStart()"
>
    <span data-i18n="form-submit">✨ Optimize My CV</span>
</button>
```

**OR** add tracking to form submit handler in your JavaScript:

```javascript
document.getElementById('cvForm').addEventListener('submit', function(e) {
    // Your existing submit logic here...

    // Add tracking
    trackCVOptimizationStart();

    // Track with job title if available
    const jobTitle = document.getElementById('jobDescription')?.value || '';
    if (jobTitle) {
        trackCVSubmissionSuccess(jobTitle);
    }
});
```

---

## 🎯 Step 4: Add to improvements.html

### A. Add Same Scripts to `<head>`

```html
<!-- Auth & Subscription System -->
<script src="/config.js"></script>
<script src="/auth.js"></script>
<script src="/tracking.js"></script>
```

### B. Add Subscription Status Display

Add this somewhere visible (e.g., in the header or stats section):

```html
<!-- Subscription Status Banner -->
<div id="subscription-status" style="display: none;" class="mb-6">
    <div class="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
        <div class="flex items-center justify-between">
            <div>
                <div class="font-bold text-purple-900" id="subscription-plan-text">Free Plan</div>
                <div class="text-sm text-purple-700" id="subscription-usage-text">
                    <span id="subscription-remaining">3</span> CVs remaining this month
                </div>
            </div>
            <button
                onclick="trackUpgradeClick('status_banner'); window.location.href='/plans.html';"
                class="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:scale-105 transition-transform"
                id="upgrade-button"
            >
                ⭐ Upgrade
            </button>
        </div>
    </div>
</div>

<script>
    // Check and display subscription status
    async function checkSubscriptionStatus() {
        const user = window.authManager.getUser();

        if (!user) {
            // Not logged in - show free tier
            document.getElementById('subscription-status').style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/check-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });

            const data = await response.json();
            const sub = data.subscription;

            // Update UI
            document.getElementById('subscription-status').style.display = 'block';

            if (sub.isPremium) {
                document.getElementById('subscription-plan-text').textContent = '⭐ Premium Member';
                document.getElementById('subscription-usage-text').textContent = 'Unlimited CVs';
                document.getElementById('upgrade-button').style.display = 'none';
            } else {
                document.getElementById('subscription-plan-text').textContent = 'Free Plan';
                document.getElementById('subscription-remaining').textContent = sub.remainingUses || 0;

                if (sub.remainingUses === 0) {
                    document.getElementById('subscription-usage-text').innerHTML = '<span class="text-red-600 font-bold">Limiet bereikt! Upgrade voor meer.</span>';
                }
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
        }
    }

    // Run on page load
    window.addEventListener('DOMContentLoaded', checkSubscriptionStatus);
</script>
```

### C. Track Category Expansions

Find the `toggleCategory` function and add tracking:

```javascript
function toggleCategory(catKey) {
    // Your existing logic...

    // Add tracking
    trackCategoryExpansion(catKey);
}
```

---

## 🧪 Step 5: Test Locally

```bash
# Run local development server
netlify dev

# Open browser to http://localhost:8888
# Click "Login / Sign Up" to test auth
# Submit a CV to test tracking
```

### Test Checklist:

- [ ] Auth modal opens when clicking login button
- [ ] Can sign up with email/password
- [ ] Can sign in after signing up
- [ ] User avatar/email shows in header when logged in
- [ ] GA4 events fire (check browser console for "📊 Tracked" messages)
- [ ] Subscription status displays correctly
- [ ] "Optimize My CV" button tracks conversion

---

## 🔍 Debugging

### Check Browser Console

Look for these messages:
- `⚙️ App configuration loaded`
- `✅ Enhanced tracking loaded`
- `🔐 Auth state changed: SIGNED_IN`
- `📊 Tracked: CV Optimization Started (CONVERSION)`

### Common Issues:

**Auth Modal Not Showing:**
- Check if `/auth-modal.html` loads (Network tab)
- Check browser console for errors
- Verify `openAuthModal()` function exists

**Supabase Connection Error:**
- Verify `config.js` has correct URL and anon key
- Check Supabase project is active
- Verify anon key starts with `eyJhbGc...`

**Tracking Not Working:**
- Check if `gtag` is defined: `typeof gtag` in console
- Verify GA4 script loaded
- Check GA4 Realtime view in Google Analytics

---

## 📊 Verify in Google Analytics

1. Go to [analytics.google.com](https://analytics.google.com)
2. Select your property
3. Go to **Reports** → **Realtime**
4. Perform actions on your site
5. Events should appear within 30 seconds

### Key Events to Check:

- ✅ `cv_optimization_started` (PRIMARY CONVERSION)
- ✅ `sign_up`
- ✅ `login`
- ✅ `category_view`
- ✅ `begin_checkout` (upgrade clicks)

---

## 🚀 Going Live

Once everything works locally:

1. ✅ Commit all changes to git
2. ✅ Push to GitHub
3. ✅ Netlify will auto-deploy
4. ✅ Test on live site
5. ✅ Verify GA4 events in production

---

## 📚 Next Steps

- [ ] Set up Google OAuth in Supabase (optional)
- [ ] Configure email templates in Supabase
- [ ] Set up Stripe webhook in production
- [ ] Run `supabase-membership.sql` in your Supabase dashboard
- [ ] Test full subscription flow
- [ ] Monitor conversions in GA4

---

**Need help?** Check [MEMBERSHIP_SETUP.md](MEMBERSHIP_SETUP.md) for backend setup.

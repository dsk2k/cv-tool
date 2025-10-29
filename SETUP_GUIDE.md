# Complete Setup Guide: Custom Domain + GA4

This guide will walk you through setting up your custom domain (applyjobmatch.nl) with Netlify and configuring Google Analytics 4 tracking.

**Estimated Time:** 30-45 minutes
**Prerequisites:** Access to your domain registrar account (where you bought applyjobmatch.nl)

---

## Part 1: Custom Domain Setup (20 minutes)

### Step 1: Add Custom Domain in Netlify

1. **Open Netlify Dashboard**
   - Go to https://app.netlify.com/
   - Sign in to your account
   - Click on your `cv-tool` site

2. **Navigate to Domain Settings**
   - Click **"Domain settings"** in the top menu
   - OR click **"Set up a custom domain"** button

3. **Add Custom Domain**
   - Click **"Add custom domain"** or **"Add domain alias"**
   - Enter: `applyjobmatch.nl`
   - Click **"Verify"**
   - Click **"Yes, add domain"** (even if it shows a warning)

4. **Set as Primary Domain** (Important!)
   - Find `applyjobmatch.nl` in your domains list
   - Click the **"Options"** menu (three dots)
   - Select **"Set as primary domain"**
   - This ensures all traffic redirects to your custom domain

---

### Step 2: Configure DNS Records at Your Domain Registrar

Netlify will show you DNS records to add. You need to add these at **the website where you bought applyjobmatch.nl**.

#### Find Your DNS Records from Netlify:
1. In Netlify Domain Settings, click **"Set up Netlify DNS"** OR
2. Look for a message saying **"Check DNS configuration"**
3. Netlify will show you the records you need to add

#### Common Domain Registrars:

<details>
<summary><b>📘 If you bought from TransIP (Netherlands)</b></summary>

1. Go to https://www.transip.nl/cp/
2. Sign in
3. Click **"Domeinen"** → Select **applyjobmatch.nl**
4. Click **"DNS"** tab
5. Click **"Bewerken"** (Edit)

**Add these records:**

| Type  | Name | Value                        | TTL  |
|-------|------|------------------------------|------|
| A     | @    | 75.2.60.5                   | 3600 |
| CNAME | www  | cvtool.netlify.app          | 3600 |

*Note: The IP address may be different - use the one Netlify shows you*

6. Click **"Opslaan"** (Save)
</details>

<details>
<summary><b>📘 If you bought from Namecheap</b></summary>

1. Go to https://ap.www.namecheap.com/
2. Sign in
3. Click **"Domain List"** → Click **"Manage"** next to applyjobmatch.nl
4. Click **"Advanced DNS"** tab
5. Click **"Add New Record"**

**Add these records:**

| Type  | Host | Value                        | TTL  |
|-------|------|------------------------------|------|
| A     | @    | 75.2.60.5                   | Automatic |
| CNAME | www  | cvtool.netlify.app          | Automatic |

*Delete any existing A or CNAME records for @ and www first*

6. Click **"Save All Changes"**
</details>

<details>
<summary><b>📘 If you bought from GoDaddy</b></summary>

1. Go to https://dcc.godaddy.com/
2. Sign in
3. Click **"DNS"** next to applyjobmatch.nl
4. Scroll to **"Records"** section

**Add these records:**

| Type  | Name | Value                        | TTL  |
|-------|------|------------------------------|------|
| A     | @    | 75.2.60.5                   | 600  |
| CNAME | www  | cvtool.netlify.app          | 1 Hour |

*Delete any existing parking page or default records first*

5. Click **"Save"**
</details>

<details>
<summary><b>📘 If you bought from Cloudflare</b></summary>

1. Go to https://dash.cloudflare.com/
2. Sign in
3. Select **applyjobmatch.nl**
4. Click **"DNS"** in the left menu
5. Click **"Add record"**

**Add these records:**

| Type  | Name | Content                      | Proxy Status |
|-------|------|------------------------------|--------------|
| A     | @    | 75.2.60.5                   | DNS only (gray cloud) |
| CNAME | www  | cvtool.netlify.app          | DNS only (gray cloud) |

**Important:** Turn OFF the orange cloud (proxy) - it should be gray!

6. Click **"Save"**
</details>

#### What You're Adding:

- **A Record (@):** Points your root domain (applyjobmatch.nl) to Netlify's server
- **CNAME (www):** Points www.applyjobmatch.nl to your Netlify site

---

### Step 3: Wait for DNS Propagation (5-60 minutes)

After adding DNS records:

1. **Wait Time:** DNS changes can take 5 minutes to 48 hours (usually 15-30 minutes)

2. **Check Propagation:**
   - Go to https://dnschecker.org/
   - Enter: `applyjobmatch.nl`
   - Check if the A record shows Netlify's IP
   - Green checkmarks = propagated ✅

3. **Check in Netlify:**
   - Go back to Netlify Domain Settings
   - Refresh the page
   - You should see: **"applyjobmatch.nl is configured correctly"**

---

### Step 4: Enable HTTPS/SSL (Automatic)

Netlify automatically provisions an SSL certificate once DNS is configured.

1. **In Netlify Domain Settings:**
   - Scroll to **"HTTPS"** section
   - You should see: **"Your site has HTTPS enabled"**
   - If not, wait a few minutes and refresh

2. **Force HTTPS Redirect (Important!):**
   - In HTTPS section, toggle **"Force HTTPS"** to ON
   - This redirects http:// to https:// automatically

3. **Verify HTTPS:**
   - Visit https://applyjobmatch.nl
   - You should see a 🔒 padlock in the browser
   - Your site should load correctly

---

## Part 2: Google Analytics 4 Setup (15 minutes)

### Step 5: Create GA4 Property

1. **Go to Google Analytics**
   - Visit https://analytics.google.com/
   - Sign in with your Google account

2. **Create Account (if you don't have one)**
   - Click **"Start measuring"**
   - Account name: `ApplyJobMatch` or your company name
   - Account data sharing: Keep defaults
   - Click **"Next"**

3. **Create Property**
   - Property name: `AI CV Tailor - ApplyJobMatch`
   - Reporting time zone: Select `Netherlands` (or your timezone)
   - Currency: `EUR - Euro (€)`
   - Click **"Next"**

4. **Business Information**
   - Industry: `Online communities` or `Jobs & Education`
   - Business size: Select your size
   - Usage: Check relevant boxes
   - Click **"Create"**

5. **Accept Terms of Service**
   - Check both boxes
   - Click **"I Accept"**

---

### Step 6: Set Up Data Stream

1. **Choose Platform:**
   - You'll see: "Start collecting data"
   - Click **"Web"**

2. **Configure Web Stream:**
   - Website URL: `https://applyjobmatch.nl`
   - Stream name: `ApplyJobMatch - Main Site`
   - Click **"Create stream"**

3. **Copy Your Measurement ID:**
   - You'll see a box labeled **"Measurement ID"**
   - Format: `G-XXXXXXXXXX` (G- followed by 10 characters)
   - Example: `G-1A2B3C4D5E`
   - **Copy this ID** - you'll need it in the next steps
   - ⚠️ **IMPORTANT:** Keep this page open!

---

### Step 7: Update Code with Measurement ID

Now we need to replace the placeholder `G-XXXXXXXXXX` in your code with your real Measurement ID.

#### Option A: Edit Locally (Recommended if you have the repo)

1. **Open your code editor**
2. **Edit index.html:**
   ```html
   <!-- Line 36 -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR_REAL_ID"></script>

   <!-- Line 41 -->
   gtag('config', 'G-YOUR_REAL_ID', {
   ```

3. **Edit improvements.html:**
   ```html
   <!-- Line 9 -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR_REAL_ID"></script>

   <!-- Line 14 -->
   gtag('config', 'G-YOUR_REAL_ID', {
   ```

4. **Save both files**

5. **Commit and push:**
   ```bash
   git add index.html improvements.html
   git commit -m "Add real GA4 Measurement ID"
   git push origin main
   ```

#### Option B: Edit on GitHub (If you don't have local repo)

1. **Go to GitHub Repository:**
   - Visit https://github.com/dsk2k/cv-tool

2. **Edit index.html:**
   - Click on `index.html`
   - Click the **pencil icon** (Edit this file)
   - Press `Ctrl+F` (or `Cmd+F` on Mac)
   - Search for: `G-XXXXXXXXXX`
   - Replace ALL instances (should be 2) with your real ID: `G-1A2B3C4D5E`
   - Scroll to bottom
   - Commit message: `Update GA4 Measurement ID in index.html`
   - Click **"Commit changes"**

3. **Edit improvements.html:**
   - Go back to repository root
   - Click on `improvements.html`
   - Click the **pencil icon** (Edit this file)
   - Press `Ctrl+F`
   - Search for: `G-XXXXXXXXXX`
   - Replace ALL instances (should be 2) with your real ID
   - Commit message: `Update GA4 Measurement ID in improvements.html`
   - Click **"Commit changes"**

---

### Step 8: Wait for Netlify Deployment (2-3 minutes)

1. **Check Netlify Dashboard:**
   - Go to https://app.netlify.com/sites/cvtool/deploys
   - You should see **"Building"** or **"Deploying"**
   - Wait for it to turn green: **"Published"**

2. **Deployment Time:**
   - Usually takes 1-3 minutes
   - Netlify automatically deploys when you push to GitHub

---

### Step 9: Test GA4 Tracking

1. **Open Your Website:**
   - Go to https://applyjobmatch.nl
   - Open in an **incognito/private window** (to avoid ad blockers)

2. **Open Browser Console (Optional but helpful):**
   - Press `F12` (or right-click → Inspect)
   - Click **"Console"** tab
   - You should see: `📊 Event tracked: improvements_page_view`

3. **Interact with Your Site:**
   - Click around
   - Select language preference
   - Upload a file (or try to)
   - Open an FAQ

4. **Check GA4 Realtime:**
   - Go back to Google Analytics
   - Click **"Reports"** in the left menu
   - Click **"Realtime"**
   - You should see **1 user** (you!)
   - Scroll down to see **"Event count by Event name"**
   - You should see events like:
     - `page_view`
     - `language_selected`
     - `faq_opened`
     - etc.

5. **Verify Events (within 30 seconds):**
   - If you see your activity in Realtime → ✅ **GA4 is working!**
   - If not, see troubleshooting below

---

## Troubleshooting

### Custom Domain Issues

**❌ "Site not found" or "Page not found"**
- **Wait longer:** DNS can take up to 48 hours
- **Check DNS:** Use https://dnschecker.org/
- **Clear browser cache:** Ctrl+Shift+R (hard refresh)

**❌ "Not secure" warning**
- **Wait:** SSL certificate takes 10-30 minutes after DNS propagates
- **Check Netlify:** Domain Settings → HTTPS should show "enabled"
- **Force refresh:** Visit https://applyjobmatch.nl (with https://)

**❌ Domain shows but site looks broken**
- **Check deployment:** Netlify dashboard → Deploys → Latest should be green
- **Check console:** F12 → Console for JavaScript errors

### GA4 Tracking Issues

**❌ Events not showing in Realtime**
- **Verify Measurement ID:** Check it matches exactly (including G- prefix)
- **Disable ad blockers:** uBlock, AdBlock, Ghostery block GA4
- **Use incognito mode:** Test in private browsing
- **Check console:** Should see `📊 Event tracked:` messages
- **Wait 30 seconds:** Realtime has slight delay

**❌ Console shows gtag errors**
- **Check ID format:** Must be `G-XXXXXXXXXX` (exactly 10 characters after G-)
- **Check quotes:** Should be `'G-...'` with single or double quotes
- **Redeploy:** Make sure Netlify deployed the updated files

**❌ Some events work, others don't**
- **This is normal initially:** GA4 learns event schemas over 24 hours
- **Check spelling:** Event names are case-sensitive
- **Check parameters:** Go to Configure → Events in GA4

---

## Verification Checklist

### ✅ Custom Domain
- [ ] applyjobmatch.nl loads your site
- [ ] www.applyjobmatch.nl redirects to applyjobmatch.nl
- [ ] 🔒 HTTPS is enabled (padlock in browser)
- [ ] cvtool.netlify.app redirects to applyjobmatch.nl
- [ ] No certificate warnings

### ✅ GA4 Tracking
- [ ] Measurement ID replaced in index.html (2 places)
- [ ] Measurement ID replaced in improvements.html (2 places)
- [ ] Realtime shows you as active user
- [ ] Events appear in Realtime when you interact
- [ ] Console logs show `📊 Event tracked:` messages
- [ ] No JavaScript errors in console

---

## Next Steps After Setup

### 1. Test All User Flows
- Upload a CV
- Complete the analysis
- View improvements page
- Click category filters
- Copy CV content
- Check all tracked events appear in GA4

### 2. Set Up Custom Reports (Optional)
- Use [GA4_EVENTS.md](GA4_EVENTS.md) as reference
- Create dashboards for:
  - Conversion funnel
  - User engagement
  - Error monitoring
  - Language preferences

### 3. Configure Alerts (Optional)
- Go to GA4 → Admin → Custom Alerts
- Set up notifications for:
  - High error rates
  - Low conversion rates
  - Traffic spikes

### 4. Marketing & SEO
- Submit sitemap to Google Search Console
- Set up Google Ads conversion tracking (if using ads)
- Configure goal tracking in GA4
- Monitor user acquisition sources

---

## Support Resources

**Netlify Docs:** https://docs.netlify.com/domains-https/custom-domains/
**GA4 Setup Guide:** https://support.google.com/analytics/answer/9304153
**DNS Propagation Checker:** https://dnschecker.org/
**SSL Certificate Checker:** https://www.sslshopper.com/ssl-checker.html

**Need Help?**
- Check Netlify support: https://answers.netlify.com/
- GA4 Community: https://support.google.com/analytics/community
- Open GitHub issue: https://github.com/dsk2k/cv-tool/issues

---

## Quick Reference

### Your Details (Fill these in):
- **Custom Domain:** applyjobmatch.nl
- **Netlify Site:** cvtool.netlify.app
- **GA4 Measurement ID:** `G-________________` (write it here!)
- **Domain Registrar:** ________________
- **DNS Propagation Status:** ⏳ Pending / ✅ Complete

### Important Links:
- **Live Site:** https://applyjobmatch.nl
- **Netlify Dashboard:** https://app.netlify.com/sites/cvtool
- **GA4 Dashboard:** https://analytics.google.com/
- **GitHub Repo:** https://github.com/dsk2k/cv-tool

---

**Estimated Total Time:**
- Custom Domain Setup: 20 minutes
- DNS Propagation Wait: 15-30 minutes
- GA4 Setup: 15 minutes
- Testing: 10 minutes
- **Total: 60-75 minutes**

Good luck! 🚀

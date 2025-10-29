# GA4 Quick Setup (Without Custom Domain)

**Time:** 15 minutes
**Works with:** cvtool.netlify.app (your current site)
**Will continue working:** When you switch to applyjobmatch.nl later

---

## Step 1: Create GA4 Property (5 minutes)

### 1.1 Go to Google Analytics
- Visit https://analytics.google.com/
- Sign in with your Google account

### 1.2 Create Account (if you don't have one)
- Click **"Start measuring"**
- Account name: `ApplyJobMatch`
- Account data sharing: Keep defaults checked
- Click **"Next"**

### 1.3 Create Property
- Property name: `AI CV Tailor`
- Reporting time zone: `(GMT+01:00) Amsterdam`
- Currency: `EUR - Euro (€)`
- Click **"Next"**

### 1.4 Business Information
- Industry: `Jobs & Education` (or `Online communities`)
- Business size: Choose your size
- Usage: Check the boxes that apply
- Click **"Create"**

### 1.5 Accept Terms
- Check **GDPR** checkbox
- Check **Terms of Service** checkbox
- Click **"I Accept"**

---

## Step 2: Set Up Web Data Stream (2 minutes)

### 2.1 Choose Platform
- You'll see: "Start collecting data"
- Click **"Web"**

### 2.2 Configure Stream

**Important:** Use your Netlify URL for now!

- Website URL: `https://cvtool.netlify.app`
- Stream name: `CV Tool - Main Site`
- Click **"Create stream"**

---

## Step 3: Get Your Measurement ID (1 minute)

### 3.1 Copy the ID
You'll see a box with your **Measurement ID**:

```
Measurement ID
G-ABC123XYZ4
```

**Example IDs:**
- `G-1A2B3C4D5E`
- `G-ZYXW9876VU`

### 3.2 Write It Down
✏️ **Your Measurement ID:** `G-________________`

**Keep this page open** - you'll need it for testing later!

---

## Step 4: Update Your Code (5 minutes)

Now replace `G-XXXXXXXXXX` with your real ID in both files.

### Option A: Edit on GitHub (Easiest)

#### 4.1 Edit index.html
1. Go to https://github.com/dsk2k/cv-tool
2. Click on **`index.html`**
3. Click the **✏️ pencil icon** (Edit this file)
4. Press `Ctrl+F` (Windows) or `Cmd+F` (Mac)
5. Search for: `G-XXXXXXXXXX`
6. You'll find it on **line 36** and **line 41**
7. Replace BOTH with your real ID (e.g., `G-1A2B3C4D5E`)

**Before:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

**After:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1A2B3C4D5E"></script>
```

8. Scroll to bottom
9. Commit message: `Add GA4 Measurement ID to index.html`
10. Click **"Commit changes"**

#### 4.2 Edit improvements.html
1. Click **"cv-tool"** at the top to go back to repo
2. Click on **`improvements.html`**
3. Click the **✏️ pencil icon**
4. Press `Ctrl+F`
5. Search for: `G-XXXXXXXXXX`
6. You'll find it on **line 9** and **line 14**
7. Replace BOTH with your real ID
8. Commit message: `Add GA4 Measurement ID to improvements.html`
9. Click **"Commit changes"**

### Option B: Edit Locally (If you have VSCode/editor open)

#### 4.1 Open Files
```bash
code index.html
code improvements.html
```

#### 4.2 Find and Replace
Press `Ctrl+H` (Find and Replace):
- **Find:** `G-XXXXXXXXXX`
- **Replace:** `G-YOUR_REAL_ID` (e.g., `G-1A2B3C4D5E`)
- Click **"Replace All"** in both files

#### 4.3 Save and Push
```bash
git add index.html improvements.html
git commit -m "Add GA4 Measurement ID"
git push origin main
```

---

## Step 5: Wait for Deployment (2 minutes)

### 5.1 Check Netlify
1. Go to https://app.netlify.com/
2. Click on your **cv-tool** site
3. Click **"Deploys"** at the top
4. You should see: **"Building"** → **"Published"** (green)
5. Takes 1-3 minutes

### 5.2 Check Deploy Status
When you see:
```
✓ Published at 3:45 PM
```
Your site is live with GA4 tracking!

---

## Step 6: Test GA4 Tracking (5 minutes)

### 6.1 Open Your Site
- Go to https://cvtool.netlify.app
- **Use incognito/private mode** (to avoid ad blockers)
- Chrome: `Ctrl+Shift+N`
- Firefox: `Ctrl+Shift+P`

### 6.2 Check Browser Console (Optional but helpful)
1. Press `F12` (or right-click → Inspect)
2. Click **"Console"** tab
3. Look for: `📊 Event tracked: ...`

**Example console output:**
```
📊 Event tracked: page_view {}
📊 Event tracked: language_selected {language: 'nl', language_name: 'Dutch'}
```

If you see these → GA4 is working! ✅

### 6.3 Interact with Your Site
Do these actions to trigger events:
- ✅ Select language (NL/EN toggle)
- ✅ Click an FAQ item
- ✅ Try to upload a file
- ✅ Scroll around the page

### 6.4 Check GA4 Realtime
1. Go back to Google Analytics
2. In the left sidebar, click **"Reports"**
3. Click **"Realtime"** (usually at the top)
4. You should see:
   - **Users in last 30 minutes: 1** (that's you!)
   - **Event count by Event name** (scroll down)
   - Events like: `page_view`, `language_selected`, `faq_opened`

**If you see your events → Success! 🎉**

---

## Verification Checklist

### ✅ Setup Complete
- [ ] GA4 property created
- [ ] Measurement ID copied
- [ ] index.html updated (2 places)
- [ ] improvements.html updated (2 places)
- [ ] Netlify deployed successfully (green checkmark)
- [ ] Site loads at cvtool.netlify.app
- [ ] Console shows `📊 Event tracked:` messages
- [ ] Realtime shows you as active user
- [ ] Events appear when you interact with site

---

## What If It's Not Working?

### ❌ "No users in Realtime"

**Check 1: Ad Blocker**
- Disable uBlock Origin, AdBlock, etc.
- Use incognito mode
- Try a different browser

**Check 2: Measurement ID**
- Go to index.html on GitHub
- Press `Ctrl+F` and search for your ID
- Make sure it appears exactly (no typos)
- Format must be: `G-XXXXXXXXXX` (G- + 10 characters)

**Check 3: Deployment**
- Check Netlify Deploys page
- Latest deploy should be green "Published"
- Try clearing browser cache: `Ctrl+Shift+Delete`

**Check 4: Console Errors**
- Press `F12` → Console tab
- Look for red errors
- Common error: `gtag is not defined` → ID not loaded correctly

### ❌ "Console shows no 📊 messages"

**Solution:**
- Hard refresh the page: `Ctrl+Shift+R`
- Check that index.html was actually updated
- View page source: `Ctrl+U` and search for your real ID

### ❌ "Some events work, others don't"

**This is normal!**
- GA4 takes 24-48 hours to fully register new events
- As long as you see SOME events, it's working
- Check again tomorrow in standard reports

---

## What About Custom Domain Later?

### When You Add applyjobmatch.nl:

**Good News:** Nothing needs to change! 🎉

GA4 will automatically track both:
- `cvtool.netlify.app` (now)
- `applyjobmatch.nl` (later)

### Optional: Update Data Stream URL
1. Go to GA4 → Admin → Data Streams
2. Click on your stream
3. Change URL to `https://applyjobmatch.nl`
4. This is cosmetic only - tracking still works either way!

---

## Next Steps

### Immediate (Today):
1. ✅ Complete this GA4 setup
2. ✅ Verify tracking works
3. ✅ Familiarize yourself with Realtime reports

### Tomorrow:
1. Check standard reports (Admin → Reports → Engagement)
2. Events should appear in full reports (24 hour delay)
3. Start seeing user behavior patterns

### In 24 Hours (After Domain Wait):
1. Follow [SETUP_GUIDE.md](SETUP_GUIDE.md) Part 1 for custom domain
2. Point applyjobmatch.nl to Netlify
3. GA4 continues tracking automatically
4. Optionally update data stream URL

---

## Quick Reference

**Your Information:**
- Measurement ID: `G-________________`
- Current Site: https://cvtool.netlify.app
- Future Site: https://applyjobmatch.nl
- Netlify: https://app.netlify.com/sites/cvtool
- GA4: https://analytics.google.com/

**Files Updated:**
- [x] index.html (lines 36 & 41)
- [x] improvements.html (lines 9 & 14)

**Events Tracked (24 total):**
See [GA4_EVENTS.md](GA4_EVENTS.md) for complete list

---

## Support

**GA4 Realtime not updating?**
- Wait 30 seconds (realtime has slight delay)
- Try different browser
- Disable all extensions

**Still stuck?**
- Check [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting section
- GA4 Help: https://support.google.com/analytics/
- Open GitHub issue with screenshots

---

**Total Time: 15 minutes** ⏱️

You can complete the custom domain setup later - GA4 works perfectly with Netlify subdomain!

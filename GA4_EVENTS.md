# Google Analytics 4 Event Tracking Documentation

## Overview
This document lists all Google Analytics 4 (GA4) events tracked in the AI CV Tailor application. These events provide insights into user behavior, engagement, and conversion metrics.

## Setup Instructions

### 1. Get Your GA4 Measurement ID
1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property (if you don't have one)
3. Copy your Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Replace Placeholder in Code
Replace `G-XXXXXXXXXX` in the following files:
- **[index.html](index.html)** - Line 36 and Line 41
- **[improvements.html](improvements.html)** - Line 9 and Line 14

```javascript
// Change this:
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
gtag('config', 'G-XXXXXXXXXX');

// To this (example):
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4"></script>
gtag('config', 'G-ABC123DEF4');
```

### 3. Verify Tracking
1. Deploy your changes
2. Visit your site and interact with it
3. Go to GA4 → Reports → Realtime to see events appearing
4. Check Events → All events to see historical data (24-48 hours delay)

---

## Event Catalog

### 🚀 Form Submission & CV Analysis

#### `form_submit`
**Triggered when:** User submits CV upload form
**Location:** [app.js](app.js) - Line 164
**Parameters:**
- `language` (string): Selected language preference ('nl' or 'en')
- `has_email` (boolean): Whether user provided email
- `file_type` (string): File extension (pdf, doc, docx)
- `file_size_kb` (number): File size in kilobytes

**Use Case:** Track conversion funnel, understand file type preferences

---

#### `cv_analysis_success`
**Triggered when:** CV analysis completes successfully
**Location:** [app.js](app.js) - Line 189
**Parameters:**
- `language` (string): Selected language preference
- `has_email` (boolean): Whether user provided email

**Use Case:** Calculate success rate, track completed analyses

---

#### `cv_analysis_error`
**Triggered when:** CV analysis fails with error
**Location:** [app.js](app.js) - Line 203
**Parameters:**
- `error_message` (string): Technical error message
- `language` (string): Selected language preference

**Use Case:** Monitor technical issues, identify error patterns

---

#### `language_selected`
**Triggered when:** User selects language preference
**Location:** [index.html](index.html) - Line 1787
**Parameters:**
- `language` (string): Selected language code ('nl' or 'en')
- `language_name` (string): Human-readable language name

**Use Case:** Understand language preference distribution

---

### 📊 Gamification & Engagement

#### `cv_score_calculated`
**Triggered when:** CV improvement scores are calculated
**Location:** [improvements.html](improvements.html) - Line 1035
**Parameters:**
- `overall_score` (number): Overall CV score (0-100)
- `total_changes` (number): Total number of improvements
- `ats_score` (number): ATS & Keywords category score (0-100)
- `impact_score` (number): Impact & Results category score (0-100)
- `polish_score` (number): Professional Polish category score (0-100)
- `structure_score` (number): Structure & Readability category score (0-100)
- `targeting_score` (number): Job Match & Targeting category score (0-100)

**Use Case:** Analyze CV quality distribution, identify weak categories

---

#### `achievements_unlocked`
**Triggered when:** User unlocks achievement badges
**Location:** [improvements.html](improvements.html) - Line 1072
**Parameters:**
- `achievement_count` (number): Number of achievements unlocked
- `achievements` (string): Comma-separated achievement names
- `score` (number): Overall score when unlocked
- `total_changes` (number): Total improvements count

**Achievements:**
- 🏆 Perfectionist (10+ changes)
- ⭐ High Achiever (80+ score)
- 🎯 Expert Level (90+ score)
- 🚀 Overachiever (15+ changes)

**Use Case:** Gamification effectiveness, user engagement metrics

---

#### `confetti_celebration`
**Triggered when:** Confetti animation plays for high scores (≥85)
**Location:** [improvements.html](improvements.html) - Line 1087
**Parameters:**
- `score` (number): Score that triggered celebration

**Use Case:** Track exceptional CV quality, engagement peak

---

#### `category_expanded`
**Triggered when:** User expands a category filter
**Location:** [improvements.html](improvements.html) - Line 1083
**Parameters:**
- `category` (string): Category key (ats, impact, polish, structure, targeting)

**Use Case:** Understand which categories users focus on

---

#### `category_collapsed`
**Triggered when:** User collapses active category filter
**Location:** [improvements.html](improvements.html) - Line 1066
**Parameters:**
- `category` (string): Category key that was collapsed

**Use Case:** Track filter usage patterns

---

### 📄 Content Interaction

#### `collapse_all_clicked`
**Triggered when:** User clicks "Collapse All" button
**Location:** [improvements.html](improvements.html) - Line 1354
**Parameters:**
- `items_count` (number): Number of items collapsed

**Use Case:** Interface usability insights

---

#### `expand_all_clicked`
**Triggered when:** User clicks "Expand All" button
**Location:** [improvements.html](improvements.html) - Line 1377
**Parameters:**
- `items_count` (number): Number of items expanded

**Use Case:** Content consumption preferences

---

#### `cv_copied`
**Triggered when:** User successfully copies CV to clipboard
**Location:** [improvements.html](improvements.html) - Line 1561
**Parameters:**
- `content_length` (number): Character count of copied CV

**Use Case:** Track export success, content length distribution

---

#### `cv_copy_error`
**Triggered when:** CV copy to clipboard fails
**Location:** [improvements.html](improvements.html) - Line 1583
**Parameters:**
- `error_message` (string): Technical error message

**Use Case:** Identify clipboard API issues by browser

---

#### `pdf_download_attempted`
**Triggered when:** User clicks PDF download button
**Location:** [improvements.html](improvements.html) - Line 1548
**Parameters:**
- `status` (string): 'coming_soon' (feature not yet implemented)

**Use Case:** Measure demand for PDF download feature

---

#### `improvements_page_view`
**Triggered when:** Results page loads
**Location:** [improvements.html](improvements.html) - Line 27
**Parameters:**
- `page_title` (string): 'CV Improvements'

**Use Case:** Track funnel completion, page views

---

### 📤 File Upload

#### `file_uploaded`
**Triggered when:** User successfully uploads a file
**Location:** [index.html](index.html) - Line 1917
**Parameters:**
- `file_type` (string): File extension
- `file_size_kb` (number): File size in kilobytes
- `file_name_length` (number): Length of filename

**Use Case:** File type preferences, size distribution

---

#### `file_upload_error`
**Triggered when:** File upload validation fails
**Location:** [index.html](index.html) - Lines 1897, 1907
**Parameters:**
- `error_type` (string): 'invalid_type' or 'too_large'
- `file_type` (string): Attempted file extension (for invalid_type)
- `file_size_mb` (number): File size in MB (for too_large)

**Use Case:** Identify common user errors, improve UX

---

#### `file_removed`
**Triggered when:** User removes uploaded file
**Location:** [index.html](index.html) - Line 1973
**Parameters:** None

**Use Case:** Track upload corrections, user hesitation

---

### ❓ User Engagement

#### `faq_opened`
**Triggered when:** User expands FAQ item
**Location:** [index.html](index.html) - Line 1818
**Parameters:**
- `faq_number` (number): FAQ item number (1-8)

**FAQs:**
1. How does the AI CV optimization work?
2. What file formats do you support?
3. Is my data safe and private?
4. How is this different from ChatGPT?
5. How long does the analysis take?
6. Can I edit the AI suggestions?
7. What's included in the free version?
8. Do you offer refunds?

**Use Case:** Identify common questions, improve documentation

---

#### `chat_loaded`
**Triggered when:** Tawk.to chat widget loads
**Location:** [index.html](index.html) - Line 2098
**Parameters:** None

**Use Case:** Monitor chat widget availability

---

#### `chat_started`
**Triggered when:** User starts a chat conversation
**Location:** [index.html](index.html) - Line 2104
**Parameters:** None

**Use Case:** Track support engagement rate

---

#### `chat_message_sent`
**Triggered when:** User sends a chat message
**Location:** [index.html](index.html) - Line 2110
**Parameters:** None

**Use Case:** Measure chat interaction depth

---

## Key Metrics to Monitor

### Conversion Funnel
1. **Page Visits** → Standard GA4 page_view
2. **File Upload** → `file_uploaded`
3. **Form Submit** → `form_submit`
4. **Analysis Success** → `cv_analysis_success`
5. **Results View** → `improvements_page_view`
6. **Content Export** → `cv_copied` or `pdf_download_attempted`

### Engagement Metrics
- **Average Score:** `cv_score_calculated.overall_score`
- **Achievement Rate:** Users with `achievements_unlocked` / Total users
- **Category Interest:** Distribution of `category_expanded`
- **Export Rate:** `cv_copied` / `improvements_page_view`

### Quality Metrics
- **Error Rate:** `cv_analysis_error` / `form_submit`
- **Upload Success:** `file_uploaded` / (`file_uploaded` + `file_upload_error`)
- **Copy Success:** `cv_copied` / (`cv_copied` + `cv_copy_error`)

### User Preferences
- **Language Split:** `language_selected` distribution
- **File Type Preference:** `file_uploaded.file_type` distribution
- **Top FAQs:** Most frequent `faq_opened.faq_number`

---

## Custom Reporting Ideas

### 1. CV Quality Dashboard
**Purpose:** Monitor quality of CVs being improved

**Metrics:**
- Average overall_score
- Distribution by category scores
- Correlation between total_changes and score

**Exploration:**
```
Events: cv_score_calculated
Dimensions: overall_score, total_changes
Filters: None
```

### 2. Gamification Effectiveness
**Purpose:** Measure engagement with game elements

**Metrics:**
- Confetti trigger rate (score ≥85)
- Achievement unlock rate
- Category interaction depth

**Exploration:**
```
Events: achievements_unlocked, confetti_celebration, category_expanded
Compare: Users with achievements vs without
```

### 3. Language Preference Analysis
**Purpose:** Understand multilingual user base

**Metrics:**
- Language selection distribution
- Success rate by language
- Score differences by language

**Exploration:**
```
Events: language_selected, cv_analysis_success, cv_score_calculated
Dimension: language
Segment by: Country/Region
```

### 4. Error Analysis
**Purpose:** Identify and fix technical issues

**Metrics:**
- Error frequency by type
- Most common error_messages
- Error rate by browser/device

**Exploration:**
```
Events: cv_analysis_error, file_upload_error, cv_copy_error
Dimensions: error_type, error_message, browser, device_category
```

---

## Privacy & GDPR Compliance

### What's NOT Tracked
- Personal information (names, emails, addresses)
- CV content or job descriptions
- User IP addresses (unless required for fraud prevention)
- Cross-site tracking cookies

### What IS Tracked
- Anonymized user interactions
- Aggregate usage statistics
- Technical error information (for debugging)
- Session-based behavior (no user identification)

### User Control
- Cookie consent banner on first visit
- Opt-out option via browser settings
- Data deletion requests honored (privacy@aicvtailor.com)

### Data Retention
- Standard GA4 retention: 14 months
- Can be adjusted in GA4 settings
- Complies with GDPR "right to be forgotten"

---

## Testing & Debugging

### Console Logging
All events are logged to browser console:
```
📊 Event tracked: event_name {param1: value1, param2: value2}
```

### Real-Time Verification
1. Open GA4 → Reports → Realtime
2. Interact with your site
3. See events appear within ~30 seconds
4. Click event name to see parameters

### Debug Mode (Chrome)
1. Install [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger)
2. Enable extension
3. Open DevTools Console
4. See detailed GA4 debug information

### Common Issues

**Events not showing:**
- Check measurement ID is correct
- Ensure ad blockers are disabled for testing
- Verify browser console for JavaScript errors
- Check GA4 data retention settings

**Parameters missing:**
- Verify parameter values are defined (not undefined/null)
- Check parameter naming (case-sensitive)
- Ensure parameters are within GA4 limits (40 characters max for names)

**Realtime delay:**
- GA4 shows data within 30 seconds in Realtime reports
- Standard reports have 24-48 hour processing delay
- Use Realtime view for immediate verification

---

## Next Steps

1. **Replace Measurement ID:** Update `G-XXXXXXXXXX` in both HTML files
2. **Deploy Changes:** Push to production (Netlify auto-deploys from GitHub)
3. **Verify Tracking:** Test all major user flows and check Realtime reports
4. **Create Custom Dashboards:** Build reports for key metrics in GA4
5. **Set Up Alerts:** Configure notifications for critical events (errors, low conversion)
6. **Regular Review:** Weekly check for trends, issues, and opportunities

---

## Support

**GA4 Documentation:** https://support.google.com/analytics/answer/9304153
**Event Tracking Guide:** https://developers.google.com/analytics/devguides/collection/ga4/events
**Custom Reports:** https://support.google.com/analytics/answer/9327076

**Project Questions:** Open an issue on GitHub or contact support@aicvtailor.com

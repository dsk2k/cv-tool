# CV Tool - AI-Powered CV Optimization Platform

An intelligent CV tailoring tool that uses Google Gemini AI to optimize resumes for specific job descriptions. Built on a serverless architecture with Netlify Pro + Supabase.

---

## Features ✨

### Core Functionality
- **AI-Powered CV Analysis** - Analyzes and improves CVs using Google Gemini 2.0 Flash
- **Cover Letter Generation** - Creates personalized cover letters
- **Recruiter Tips** - Provides interview preparation and negotiation guidance
- **Changes Overview** - Detailed explanation of all CV modifications

### Performance & Cost Optimization
- **Smart Caching** - 30-day cache with auto-extension, saves 60%+ on AI costs
- **Rate Limiting** - IP-based throttling (10 req/hour) prevents abuse
- **Cache Monitoring** - Real-time performance metrics and cost savings tracking

### Security
- **CORS Protection** - Whitelist-only origin access
- **Environment Validation** - Automatic config verification
- **Health Monitoring** - System health check endpoint
- **Secure Key Management** - All secrets in Netlify environment variables

### User Experience
- **Live Translation** - One-click Dutch ↔ English translation
- **Beautiful UI** - Modern gradient design with smooth animations
- **Download Options** - Export as PDF or DOCX
- **Mobile Responsive** - Works on all devices

---

## Architecture

```
Frontend (Netlify Pro)
    ↓
Netlify Functions (Serverless)
    ├─ analyze-cv.js      → AI CV optimization
    ├─ translate.js       → Live translation (NEW!)
    ├─ cache-stats.js     → Cache monitoring (NEW!)
    ├─ health.js          → Health check (NEW!)
    └─ rate-limiter.js    → Abuse prevention (NEW!)
    ↓
External Services
    ├─ Google Gemini API  → AI processing
    ├─ Supabase           → Caching + rate limits
    └─ Stripe (optional)  → Payments
```

---

## Quick Start

### 1. Prerequisites
- Netlify Pro account ($19/mo)
- Supabase account (free tier)
- Google Gemini API key ([Get here](https://makersuite.google.com/app/apikey))

### 2. Setup Database
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project
3. Run `supabase-setup.sql` in SQL Editor
4. Copy your Project URL and Service Role Key

### 3. Configure Netlify
1. Go to Site settings → Environment variables
2. Add:
   - `GEMINI_API_KEY` - Your Gemini API key
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key

### 4. Deploy
```bash
git clone <your-repo>
cd cv-tool
npm install
git push origin main
```

### 5. Verify
Visit: `https://your-site.netlify.app/.netlify/functions/health`

Expected: `{ "status": "healthy" }`

**Full deployment guide:** See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

## Recent Updates (January 2025)

### Security Improvements 🔒
- ✅ Fixed CORS vulnerability (whitelist-only)
- ✅ Added IP-based rate limiting (10 req/hour)
- ✅ Added environment variable validation
- ✅ Added health check endpoint

### Performance Improvements ⚡
- ✅ Implemented cache expiration (30 days)
- ✅ Auto-extend cache on access
- ✅ Added cache statistics endpoint
- ✅ Automatic expired entry cleanup

### New Features 🎉
- ✅ Live translation (Dutch ↔ English)
- ✅ Translation caching (instant re-translation)
- ✅ Cache performance monitoring
- ✅ System health monitoring

**Full changes:** See [CHANGES-SUMMARY.md](CHANGES-SUMMARY.md)

---

## Cost Breakdown

### Monthly Costs (1,000 users)
| Component | Cost | Notes |
|-----------|------|-------|
| Netlify Pro | $19/mo | Fixed |
| Gemini API | ~$8/mo | 60% cache hit rate |
| Supabase | $0 | Free tier |
| **Total** | **~$27/mo** | **$0.027 per user** |

### Cost Optimization
- **60%+ cache hit rate** → Saves $10-15/mo
- **Rate limiting** → Prevents abuse spikes
- **Free Supabase tier** → Supports 5,000+ users

---

## API Endpoints

### Main Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/analyze-cv` | POST | Analyze and optimize CV |
| `/translate` | POST | Translate content (NEW!) |

### Monitoring Endpoints (NEW!)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | System health check |
| `/cache-stats` | GET | Cache performance metrics |

### Examples

#### Health Check
```bash
curl https://your-site.netlify.app/.netlify/functions/health
```

Response:
```json
{
  "status": "healthy",
  "checks": {
    "environment": { "status": "healthy" },
    "database": { "status": "healthy" },
    "ai": { "status": "configured" }
  }
}
```

#### Cache Statistics
```bash
curl https://your-site.netlify.app/.netlify/functions/cache-stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalEntries": 150,
    "totalHits": 420,
    "hitRate": "64%",
    "estimatedCostSavings": "$3.20"
  }
}
```

---

## Features In Detail

### 1. Live Translation (NEW!)

**Location:** Improvements page (top-right button)

**How it works:**
1. Click "Translate to English" button
2. First translation: Calls Gemini API (~3-5 seconds)
3. Subsequent translations: Instant (cached)
4. Toggle back to Dutch anytime

**Cost:** ~$0.01 per translation (cached for free)

**Code:**
- Frontend: [improvements.html](improvements.html) (line 168-183, 570-748)
- Backend: [netlify/functions/translate.js](netlify/functions/translate.js)

---

### 2. Smart Caching

**How it works:**
- Generates SHA-256 hash of CV + Job Description
- Checks Supabase cache before calling AI
- Saves result for 30 days, extends on access
- Auto-deletes expired entries

**Performance:**
- Cache hit: ~50-100ms (98% faster)
- Cache miss: ~10-30s (full AI processing)

**Monitoring:**
```bash
# Check cache performance
curl https://your-site.netlify.app/.netlify/functions/cache-stats
```

**Code:**
- [netlify/functions/cache-helper.js](netlify/functions/cache-helper.js)
- [netlify/functions/analyze-cv.js](netlify/functions/analyze-cv.js) (line 65-80)

---

### 3. Rate Limiting

**Configuration:**
- **Limit:** 10 requests per hour per IP
- **Window:** Rolling 1-hour window
- **Response:** 429 error with retry-after header

**Customization:**
Edit [netlify/functions/rate-limiter.js](netlify/functions/rate-limiter.js):
```javascript
const RATE_LIMITS = {
  ip: {
    max: 10,        // Change this
    window: 3600000 // 1 hour in ms
  }
};
```

---

### 4. Health Monitoring

**Endpoint:** `/.netlify/functions/health`

**Checks:**
- ✅ Environment variables configured
- ✅ Database connection working
- ✅ AI API key set
- ✅ Memory usage

**Use cases:**
- Uptime monitoring (UptimeRobot, Pingdom)
- Deployment verification
- Debugging configuration issues

---

## Database Schema

### Tables

#### ai_cache
Stores AI-generated results
```sql
cache_key        text      (SHA-256 hash)
improved_cv      text      (Generated CV)
cover_letter     text      (Generated letter)
recruiter_tips   text      (Interview tips)
changes_overview text      (Modifications list)
hit_count        int       (Reuse count)
expires_at       timestamp (Auto-expire)
```

#### rate_limits
Tracks API requests
```sql
identifier   text      (IP address)
limit_type   text      ('ip' or 'global')
timestamp    timestamp (Request time)
```

**Full schema:** See [supabase-setup.sql](supabase-setup.sql)

---

## Monitoring & Maintenance

### Daily Monitoring
```bash
# Check health
curl https://your-site.netlify.app/.netlify/functions/health

# Check cache performance
curl https://your-site.netlify.app/.netlify/functions/cache-stats
```

**Target metrics:**
- Health status: "healthy"
- Cache hit rate: > 60%
- Avg hits per entry: > 2.0

### Weekly Tasks
1. Review Netlify function logs
2. Check Supabase usage (should be < 500MB)
3. Monitor Gemini API costs

### Monthly Tasks
1. Clean up expired cache:
   ```sql
   SELECT cleanup_expired_cache();
   ```
2. Clean up old rate limits:
   ```sql
   SELECT cleanup_old_rate_limits();
   ```
3. Review cost breakdown

---

## Troubleshooting

### Problem: Health check shows "unhealthy"

**Solution:**
1. Check environment variables in Netlify
2. Verify Supabase credentials (use service_role key!)
3. Check Gemini API key

### Problem: Cache not working (0% hit rate)

**Solution:**
1. Verify Supabase table exists (run supabase-setup.sql)
2. Check Supabase logs for errors
3. Verify SUPABASE_SERVICE_KEY (not anon key)

### Problem: Translation not working

**Solution:**
1. Check browser console for errors
2. Verify `/translate` function deployed
3. Check Gemini API quota not exceeded

**Full troubleshooting:** See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

## File Structure

```
cv-tool/
├── index.html                    # Main landing page
├── improvements.html             # Results page (with translation!)
├── app.js                        # Frontend logic
├── netlify/
│   └── functions/
│       ├── analyze-cv.js         # Main CV analysis
│       ├── translate.js          # Translation (NEW!)
│       ├── cache-helper.js       # Cache management
│       ├── cache-stats.js        # Cache monitoring (NEW!)
│       ├── rate-limiter.js       # Rate limiting (NEW!)
│       ├── health.js             # Health check (NEW!)
│       ├── config-validator.js   # Config validation (NEW!)
│       ├── extract-pdf.js        # PDF processing
│       ├── create-checkout.js    # Stripe checkout
│       └── stripe-webhook.js     # Payment webhooks
├── supabase-setup.sql            # Database setup (NEW!)
├── netlify.toml                  # Netlify config
├── package.json                  # Dependencies
├── DEPLOYMENT-GUIDE.md           # Full deployment guide (NEW!)
├── CHANGES-SUMMARY.md            # All changes explained (NEW!)
└── README.md                     # This file!
```

---

## Technology Stack

### Frontend
- HTML5, CSS3 (Tailwind CSS)
- Vanilla JavaScript
- Marked.js (Markdown rendering)

### Backend (Serverless)
- Netlify Functions (AWS Lambda)
- Node.js 20

### Services
- **AI:** Google Gemini 2.0 Flash
- **Database:** Supabase PostgreSQL
- **Hosting:** Netlify Pro
- **Payments:** Stripe (optional)

### Key Dependencies
```json
{
  "@google/generative-ai": "^0.24.1",
  "@supabase/supabase-js": "^2.76.1",
  "parse-multipart-data": "^1.5.0",
  "pdf-parse": "^1.1.1",
  "stripe": "^19.1.0"
}
```

---

## Security Best Practices

✅ **Implemented:**
- Environment variables for all secrets
- CORS whitelist (no wildcard *)
- Rate limiting per IP
- Input validation and sanitization
- Secure Supabase service role key

⚠️ **Recommendations:**
- Enable Supabase Row Level Security (RLS)
- Rotate API keys quarterly
- Monitor for suspicious activity
- Set up alerting for rate limit violations

---

## Performance Metrics

### Response Times
| Scenario | Time | Notes |
|----------|------|-------|
| Cache hit | ~100ms | 98% faster |
| Cache miss | ~15s | Full AI processing |
| Translation (cached) | ~50ms | Instant |
| Translation (new) | ~3-5s | AI translation |

### Scalability
- **Current:** Handles 1,000 users/month easily
- **Free tier limit:** ~5,000 users/month (Supabase)
- **Cost at scale:** ~$0.01 per user

---

## Roadmap

### Short Term (1-3 months)
- [ ] Add user authentication
- [ ] Implement usage analytics dashboard
- [ ] Add email notifications
- [ ] Cache warming for popular jobs

### Long Term (3-6 months)
- [ ] Multi-language support (French, German, Spanish)
- [ ] A/B testing for prompts
- [ ] Progressive Web App (PWA)
- [ ] Admin dashboard

---

## Support & Resources

### Documentation
- **Deployment:** [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- **Changes:** [CHANGES-SUMMARY.md](CHANGES-SUMMARY.md)
- **Database:** [supabase-setup.sql](supabase-setup.sql)

### External Resources
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Supabase Docs](https://supabase.com/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)

### Monitoring
- Netlify Dashboard → Functions → Logs
- Supabase Dashboard → Logs & Metrics
- Health endpoint: `/.netlify/functions/health`

---

## Contributing

This is a private project, but if you have suggestions:
1. Test changes locally with `netlify dev`
2. Follow existing code style
3. Update documentation
4. Test health and cache-stats endpoints

---

## License

MIT License - See LICENSE file for details

---

## Credits

- **AI Model:** Google Gemini 2.0 Flash
- **Hosting:** Netlify Pro
- **Database:** Supabase
- **Design:** Tailwind CSS
- **Icons:** Heroicons

---

## Contact

For issues or questions:
- Check [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for troubleshooting
- Review [CHANGES-SUMMARY.md](CHANGES-SUMMARY.md) for recent updates
- Check health endpoint: `/.netlify/functions/health`

---

**Last Updated:** January 2025
**Version:** 2.0.0
**Status:** Production Ready ✅

---

## Quick Command Reference

```bash
# Local development
npm install
netlify dev

# Deploy
git push origin main

# Check health
curl https://your-site.netlify.app/.netlify/functions/health

# Check cache stats
curl https://your-site.netlify.app/.netlify/functions/cache-stats

# Database maintenance (in Supabase SQL Editor)
SELECT cleanup_expired_cache();
SELECT cleanup_old_rate_limits();
SELECT * FROM get_cache_stats();
```

---

🎉 **You're all set!** Your optimized, secure, and cost-effective CV tool is ready to go!

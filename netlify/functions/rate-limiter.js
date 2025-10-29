// netlify/functions/rate-limiter.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Rate limit configurations
const RATE_LIMITS = {
  ip: {
    max: 10, // 10 requests
    window: 3600000, // per hour (in ms)
    message: 'Too many requests from this IP. Please try again in an hour.'
  },
  global: {
    max: 100, // 100 requests
    window: 60000, // per minute (in ms)
    message: 'Service is currently experiencing high load. Please try again shortly.'
  }
};

/**
 * Check if IP is whitelisted for developer mode
 * Whitelisted IPs bypass rate limiting
 *
 * SECURITY NOTE: This function safely checks if an IP is whitelisted without
 * exposing the whitelist itself. The DEV_WHITELIST_IPS variable is never logged,
 * returned, or exposed in any way. Only the result (boolean) is used.
 *
 * Set DEV_WHITELIST_IPS environment variable with comma-separated IPs
 * Example: "192.168.1.100,10.0.0.5" (use your actual IP addresses)
 */
function isWhitelistedIP(ip) {
  try {
    // Check environment variable for whitelisted IPs (NO hardcoded IPs for security)
    const whitelist = process.env.DEV_WHITELIST_IPS;

    // If not configured, no developer mode
    if (!whitelist || whitelist.trim() === '') {
      return false;
    }

    // Parse whitelist (value never leaves this function scope)
    const whitelistedIPs = whitelist
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    // Check if current IP is in whitelist
    const isWhitelisted = whitelistedIPs.includes(ip);

    // Log result (without exposing IP for privacy)
    if (isWhitelisted) {
      console.log(`🔓 DEVELOPER MODE ACTIVATED`);
    }

    return isWhitelisted;
  } catch (error) {
    // If anything goes wrong, fail closed (no developer mode)
    console.error('❌ Error checking whitelist:', error.message);
    return false;
  }
}

/**
 * Check if request should be rate limited
 * @param {string} identifier - IP address or user identifier
 * @param {string} limitType - Type of limit ('ip' or 'global')
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date, used: number, total: number, isDeveloperMode: boolean}>}
 */
async function checkRateLimit(identifier, limitType = 'ip') {
  try {
    const config = RATE_LIMITS[limitType];
    if (!config) {
      throw new Error(`Invalid limit type: ${limitType}`);
    }

    // Check if IP is whitelisted for developer mode
    const isDeveloperMode = isWhitelistedIP(identifier);

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.window);

    // Clean up old entries
    await supabase
      .from('rate_limits')
      .delete()
      .lt('timestamp', windowStart.toISOString());

    // Count requests in current window (even for whitelisted IPs, for display purposes)
    const { data, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('limit_type', limitType)
      .gte('timestamp', windowStart.toISOString());

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limit check fails
      return {
        allowed: true,
        remaining: config.max,
        resetAt: new Date(now.getTime() + config.window),
        used: 0,
        total: config.max,
        isDeveloperMode
      };
    }

    const requestCount = data?.length || 0;
    const remaining = Math.max(0, config.max - requestCount);
    const resetAt = new Date(now.getTime() + config.window);

    // Developer mode: always allow, but still track usage
    if (isDeveloperMode) {
      // Still record the request for statistics
      await supabase
        .from('rate_limits')
        .insert({
          identifier,
          limit_type: limitType,
          timestamp: now.toISOString()
        });

      console.log(`🔓 Developer mode: ${requestCount + 1} requests (unlimited)`);

      return {
        allowed: true,
        remaining: 999999, // Unlimited
        resetAt,
        used: requestCount + 1,
        total: 999999,
        isDeveloperMode: true
      };
    }

    // Normal mode: check rate limit
    if (requestCount >= config.max) {
      console.log(`⛔ Rate limit exceeded for ${identifier} (${limitType}): ${requestCount}/${config.max}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: config.message,
        used: requestCount,
        total: config.max,
        isDeveloperMode: false
      };
    }

    // Record this request
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        limit_type: limitType,
        timestamp: now.toISOString()
      });

    console.log(`✅ Rate limit OK for ${identifier} (${limitType}): ${requestCount + 1}/${config.max}`);

    return {
      allowed: true,
      remaining: remaining - 1,
      resetAt,
      used: requestCount + 1,
      total: config.max,
      isDeveloperMode: false
    };

  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open - allow request if something goes wrong
    return {
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
      used: 0,
      total: 100,
      isDeveloperMode: false
    };
  }
}

/**
 * Get client IP address from event
 */
function getClientIP(event) {
  return event.headers['x-forwarded-for']?.split(',')[0].trim()
    || event.headers['x-real-ip']
    || event.headers['client-ip']
    || 'unknown';
}

/**
 * Middleware to check rate limits
 * Usage: await rateLimitMiddleware(event)
 */
async function rateLimitMiddleware(event, options = {}) {
  const ip = getClientIP(event);
  const limitType = options.limitType || 'ip';

  console.log(`🔍 Checking rate limit for IP: ${ip}`);

  const result = await checkRateLimit(ip, limitType);

  return {
    ...result,
    ip,
    headers: {
      'X-RateLimit-Limit': result.total.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
      'X-RateLimit-Used': result.used.toString(),
      'X-Developer-Mode': result.isDeveloperMode ? 'true' : 'false'
    }
  };
}

/**
 * Create error response for rate limit exceeded
 */
function rateLimitResponse(rateLimitResult, corsHeaders = {}) {
  return {
    statusCode: 429,
    headers: {
      ...corsHeaders,
      ...rateLimitResult.headers,
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil((rateLimitResult.resetAt - new Date()) / 1000).toString()
    },
    body: JSON.stringify({
      error: 'Rate limit exceeded',
      message: rateLimitResult.message,
      resetAt: rateLimitResult.resetAt.toISOString(),
      remaining: 0
    })
  };
}

module.exports = {
  rateLimitMiddleware,
  rateLimitResponse,
  checkRateLimit,
  getClientIP,
  isWhitelistedIP,
  RATE_LIMITS
};

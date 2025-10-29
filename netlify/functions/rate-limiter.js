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
 * Check if request should be rate limited
 * @param {string} identifier - IP address or user identifier
 * @param {string} limitType - Type of limit ('ip' or 'global')
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
async function checkRateLimit(identifier, limitType = 'ip') {
  try {
    const config = RATE_LIMITS[limitType];
    if (!config) {
      throw new Error(`Invalid limit type: ${limitType}`);
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.window);

    // Clean up old entries
    await supabase
      .from('rate_limits')
      .delete()
      .lt('timestamp', windowStart.toISOString());

    // Count requests in current window
    const { data, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('limit_type', limitType)
      .gte('timestamp', windowStart.toISOString());

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limit check fails
      return { allowed: true, remaining: config.max, resetAt: new Date(now.getTime() + config.window) };
    }

    const requestCount = data?.length || 0;
    const remaining = Math.max(0, config.max - requestCount);
    const resetAt = new Date(now.getTime() + config.window);

    if (requestCount >= config.max) {
      console.log(`⛔ Rate limit exceeded for ${identifier} (${limitType}): ${requestCount}/${config.max}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: config.message
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
      resetAt
    };

  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open - allow request if something goes wrong
    return { allowed: true, remaining: 99, resetAt: new Date() };
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
      'X-RateLimit-Limit': RATE_LIMITS[limitType].max.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
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
  RATE_LIMITS
};

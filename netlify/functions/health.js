// netlify/functions/health.js
const { validateConfig } = require('./config-validator');
const { createClient } = require('@supabase/supabase-js');

/**
 * Health check endpoint
 * Endpoint: /.netlify/functions/health
 * Method: GET
 *
 * Returns system health status
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('🏥 Running health check...');

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // 1. Check environment variables
    console.log('🔍 Checking environment variables...');
    const configResults = validateConfig();
    health.checks.environment = {
      status: configResults.valid ? 'healthy' : 'unhealthy',
      configured: configResults.configured,
      missing: configResults.missing,
      warnings: configResults.warnings
    };

    // 2. Check Supabase connection
    console.log('🔍 Checking Supabase connection...');
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );

        // Simple query to test connection
        const { data, error } = await supabase
          .from('ai_cache')
          .select('count')
          .limit(1);

        health.checks.database = {
          status: error ? 'unhealthy' : 'healthy',
          message: error ? error.message : 'Connected successfully',
          latency: 'N/A'
        };
      } else {
        health.checks.database = {
          status: 'skipped',
          message: 'Supabase credentials not configured'
        };
      }
    } catch (dbError) {
      console.error('❌ Database check failed:', dbError);
      health.checks.database = {
        status: 'unhealthy',
        message: dbError.message
      };
    }

    // 3. Check Gemini API key format
    console.log('🔍 Checking AI API configuration...');
    health.checks.ai = {
      status: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
      message: process.env.GEMINI_API_KEY
        ? 'API key is set'
        : 'GEMINI_API_KEY not set'
    };

    // 4. Overall status
    const hasUnhealthy = Object.values(health.checks).some(
      check => check.status === 'unhealthy'
    );
    health.status = hasUnhealthy ? 'unhealthy' : 'healthy';

    // 5. Add system info
    health.system = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };

    console.log(`✅ Health check complete: ${health.status}`);

    return {
      statusCode: health.status === 'healthy' ? 200 : 503,
      headers,
      body: JSON.stringify(health, null, 2)
    };

  } catch (error) {
    console.error('❌ Health check failed:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// netlify/functions/cache-stats.js
const { getCacheStats } = require('./cache-helper');

/**
 * Get cache statistics
 * Endpoint: /.netlify/functions/cache-stats
 * Method: GET
 *
 * Returns cache performance metrics for monitoring
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('📊 Fetching cache statistics...');

    const stats = await getCacheStats();

    if (!stats) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch cache statistics',
          message: 'Database connection issue or function not available'
        }),
      };
    }

    // Calculate additional metrics
    const hitRate = stats.total_entries > 0
      ? ((stats.reused_entries / stats.total_entries) * 100).toFixed(2)
      : 0;

    const estimatedSavings = stats.total_hits > 1
      ? ((stats.total_hits - stats.total_entries) * 0.008).toFixed(2)
      : 0;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalEntries: stats.total_entries || 0,
        totalHits: stats.total_hits || 0,
        avgHitCount: parseFloat(stats.avg_hit_count) || 0,
        maxHitCount: stats.max_hit_count || 0,
        reusedEntries: stats.reused_entries || 0,
        expiredEntries: stats.expired_entries || 0,
        tableSize: stats.table_size || '0 bytes',
        hitRate: `${hitRate}%`,
        estimatedCostSavings: `$${estimatedSavings}`,
      },
      recommendations: getRecommendations(stats, parseFloat(hitRate))
    };

    console.log('✅ Cache stats retrieved:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('❌ Error fetching cache stats:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
    };
  }
};

/**
 * Generate recommendations based on cache performance
 */
function getRecommendations(stats, hitRate) {
  const recommendations = [];

  // Hit rate recommendations
  if (hitRate < 30) {
    recommendations.push({
      type: 'warning',
      message: 'Low cache hit rate. Consider increasing cache expiration time.',
      action: 'Increase expires_at from 30 days to 60 days'
    });
  } else if (hitRate > 60) {
    recommendations.push({
      type: 'success',
      message: 'Excellent cache hit rate! Cache is working well.',
      action: 'Continue monitoring'
    });
  }

  // Expired entries
  if (stats.expired_entries > 100) {
    recommendations.push({
      type: 'info',
      message: 'Many expired entries detected.',
      action: 'Run cleanup_expired_cache() function in Supabase'
    });
  }

  // Total entries
  if (stats.total_entries > 10000) {
    recommendations.push({
      type: 'info',
      message: 'Large cache size detected.',
      action: 'Monitor database storage usage and consider cleanup'
    });
  }

  // No cache entries
  if (stats.total_entries === 0) {
    recommendations.push({
      type: 'warning',
      message: 'No cache entries found.',
      action: 'Verify Supabase connection and table setup'
    });
  }

  return recommendations;
}

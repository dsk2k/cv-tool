/**
 * Get Public Configuration
 * Serves public configuration from environment variables
 * Safe to expose - returns only public keys (anon keys, publishable keys)
 */

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Return public configuration from environment variables
        const config = {
            supabase: {
                anonKey: process.env.SUPABASE_ANON_KEY || ''
            },
            stripe: {
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
            }
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            },
            body: JSON.stringify(config)
        };
    } catch (error) {
        console.error('Error getting config:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get configuration' })
        };
    }
};

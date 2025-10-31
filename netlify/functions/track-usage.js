// netlify/functions/track-usage.js
// Production-ready usage tracking with environment variable whitelist

const usageStore = new Map();

// Get whitelisted IPs from environment variable (SECURE!)
// Set in Netlify Dashboard: Environment Variables
// Format: WHITELISTED_IPS=123.45.67.89,98.76.54.32,111.22.33.44
const WHITELISTED_IPS = process.env.WHITELISTED_IPS 
    ? process.env.WHITELISTED_IPS.split(',').map(ip => ip.trim())
    : [];

// Log on startup (for debugging only - won't expose IPs to users)
if (WHITELISTED_IPS.length > 0) {
    console.log('IP whitelist enabled with', WHITELISTED_IPS.length, 'addresses');
} else {
    console.log('No IP whitelist configured');
}

exports.handler = async (event) => {
    // Handle OPTIONS for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { fingerprint, action } = JSON.parse(event.body);

        if (!fingerprint) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Fingerprint required' })
            };
        }

        // Get user's IP
        const userIP = event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                       event.headers['client-ip'] || 
                       'unknown';

        // Check if IP is whitelisted
        const isWhitelisted = WHITELISTED_IPS.length > 0 && WHITELISTED_IPS.includes(userIP);

        if (isWhitelisted) {
            console.log('Whitelisted IP detected - Unlimited access granted');
            
            // Always return 0 usage for whitelisted IPs
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usage: 0,
                    whitelisted: true,
                    message: 'Unlimited access (whitelisted)'
                })
            };
        }

        // Create composite key for non-whitelisted users
        const userKey = fingerprint + '-' + userIP;

        if (action === 'check') {
            // Return usage count for this user
            const usage = usageStore.get(userKey) || 0;
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usage: usage,
                    whitelisted: false,
                    message: 'Check successful'
                })
            };
        }

        if (action === 'increment') {
            // Increment usage
            const currentUsage = usageStore.get(userKey) || 0;
            const newUsage = currentUsage + 1;
            usageStore.set(userKey, newUsage);

            console.log('Usage incremented:', {
                keyPreview: userKey.substring(0, 20) + '...',
                usage: newUsage,
                timestamp: new Date().toISOString()
            });

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    usage: newUsage,
                    whitelisted: false,
                    message: 'Usage tracked'
                })
            };
        }

        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Invalid action' })
        };

    } catch (error) {
        console.error('Track usage error:', error);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usage: 0,
                whitelisted: false,
                message: 'Tracking unavailable'
            })
        };
    }
};

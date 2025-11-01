// netlify/functions/track-usage.js
// Production-ready usage tracking with environment variable whitelist

const usageStore = new Map();

// Get whitelisted IPs from environment variables (SECURE!)
// Set in Netlify Dashboard: Environment Variables
// Format: WHITELISTED_IPS=123.45.67.89,98.76.54.32,111.22.33.44
const WHITELISTED_IPS = process.env.WHITELISTED_IPS
    ? process.env.WHITELISTED_IPS.split(',').map(ip => ip.trim())
    : [];

// Developer whitelist (for testing - separate from production whitelist)
const DEV_WHITELIST_IPS = process.env.DEV_WHITELIST_IPS
    ? process.env.DEV_WHITELIST_IPS.split(',').map(ip => ip.trim())
    : [];

// Combine both whitelists
const ALL_WHITELISTED_IPS = [...WHITELISTED_IPS, ...DEV_WHITELIST_IPS];

// Log on startup (for debugging only - won't expose IPs to users)
if (ALL_WHITELISTED_IPS.length > 0) {
    console.log('IP whitelist enabled with', ALL_WHITELISTED_IPS.length, 'addresses');
    console.log('Production:', WHITELISTED_IPS.length, 'Dev:', DEV_WHITELIST_IPS.length);
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

        // Check if IP is whitelisted (production or dev)
        const isWhitelisted = ALL_WHITELISTED_IPS.length > 0 && ALL_WHITELISTED_IPS.includes(userIP);
        const isDevWhitelisted = DEV_WHITELIST_IPS.includes(userIP);

        if (isWhitelisted) {
            const whitelistType = isDevWhitelisted ? 'developer' : 'production';
            console.log(`Whitelisted IP detected (${whitelistType}) - Unlimited access granted`);

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
                    isDeveloper: isDevWhitelisted,
                    message: `Unlimited access (${whitelistType} whitelist)`
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

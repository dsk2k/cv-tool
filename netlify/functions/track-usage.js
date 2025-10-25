// netlify/functions/track-usage.js
// Simple usage tracking without database

// In-memory storage (resets when function restarts, but good enough)
const usageStore = new Map();

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

        // Get user's IP for additional tracking
        const userIP = event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                       event.headers['client-ip'] || 
                       'unknown';

        // Create composite key
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
                key: userKey.substring(0, 20) + '...',
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
                message: 'Tracking unavailable'
            })
        };
    }
};
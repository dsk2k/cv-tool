const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        const { userId } = JSON.parse(event.body);
        
        // Search for customer by metadata
        const customers = await stripe.customers.list({
            limit: 1
        });
        
        // Find customer with matching userId in metadata
        let customer = null;
        for (const c of customers.data) {
            if (c.metadata && c.metadata.userId === userId) {
                customer = c;
                break;
            }
        }
        
        if (!customer) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    hasActiveSubscription: false,
                    canUse: true // No subscription found, can still use free trial
                })
            };
        }
        
        // Check if customer has active subscription
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });
        
        const hasActiveSubscription = subscriptions.data.length > 0;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                hasActiveSubscription,
                canUse: hasActiveSubscription // If they have subscription, they can use
            })
        };
        
    } catch (error) {
        console.error('Error checking subscription:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to check subscription status',
                hasActiveSubscription: false,
                canUse: true // Default to allowing use on error
            })
        };
    }
};
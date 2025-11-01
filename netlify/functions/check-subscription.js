const { getUserSubscriptionStatus } = require('./supabase-client');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        console.log('🔍 Checking subscription for:', email);

        // Get subscription status from Supabase (much faster than Stripe API!)
        const status = await getUserSubscriptionStatus(email);

        console.log('📊 Subscription status:', status);

        return {
            statusCode: 200,
            body: JSON.stringify({
                // Legacy format for backwards compatibility
                hasActiveSubscription: status.is_premium,
                canUse: status.can_process,

                // New detailed format
                subscription: {
                    status: status.subscription_status,
                    plan: status.subscription_plan,
                    isPremium: status.is_premium,
                    canProcess: status.can_process,
                    monthlyLimit: status.monthly_limit,
                    monthlyUsed: status.monthly_used,
                    remainingUses: status.monthly_limit - status.monthly_used,
                    daysRemaining: status.days_remaining
                }
            })
        };

    } catch (error) {
        console.error('❌ Error checking subscription:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to check subscription status',
                hasActiveSubscription: false,
                canUse: true, // Default to allowing use on error (graceful degradation)
                subscription: {
                    status: 'free',
                    plan: 'free',
                    isPremium: false,
                    canProcess: true,
                    monthlyLimit: 3,
                    monthlyUsed: 0,
                    remainingUses: 3
                }
            })
        };
    }
};
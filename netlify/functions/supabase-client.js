const { createClient } = require('@supabase/supabase-js');

/**
 * Creates a Supabase client with service role key (full access)
 * Use this for backend operations that need to bypass RLS
 */
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Gets or creates a user in Supabase by email
 * Used during Stripe checkout to link customer to user
 * @param {string} email - User email address
 * @returns {Promise<{id: string, email: string}>} User object
 */
async function getOrCreateUser(email) {
    const supabase = getSupabaseClient();

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

    if (existingUser) {
        return existingUser;
    }

    // User doesn't exist - create via Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm email for now
        user_metadata: {
            created_via: 'stripe_checkout'
        }
    });

    if (authError) {
        console.error('❌ Error creating auth user:', authError);
        throw new Error(`Failed to create user: ${authError.message}`);
    }

    // Create user profile
    const { data: newUser, error: profileError } = await supabase
        .from('users')
        .insert([{
            id: authData.user.id,
            email: email,
            subscription_status: 'free'
        }])
        .select()
        .single();

    if (profileError) {
        console.error('❌ Error creating user profile:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    console.log('✅ Created new user:', email);
    return newUser;
}

/**
 * Updates user's Stripe customer ID
 * @param {string} userId - Supabase user ID
 * @param {string} stripeCustomerId - Stripe customer ID
 */
async function updateUserStripeCustomer(userId, stripeCustomerId) {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);

    if (error) {
        console.error('❌ Error updating Stripe customer ID:', error);
        throw new Error(`Failed to update Stripe customer: ${error.message}`);
    }

    console.log('✅ Updated Stripe customer ID for user:', userId);
}

/**
 * Gets user by Stripe customer ID
 * @param {string} stripeCustomerId - Stripe customer ID
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserByStripeCustomer(stripeCustomerId) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching user by Stripe customer:', error);
        throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
}

/**
 * Updates user subscription status from Stripe webhook
 * @param {string} stripeCustomerId - Stripe customer ID
 * @param {Object} subscriptionData - Subscription data from Stripe
 */
async function updateUserSubscription(stripeCustomerId, subscriptionData) {
    const supabase = getSupabaseClient();

    const user = await getUserByStripeCustomer(stripeCustomerId);
    if (!user) {
        throw new Error(`User not found for Stripe customer: ${stripeCustomerId}`);
    }

    const { error } = await supabase
        .from('users')
        .update({
            subscription_id: subscriptionData.id,
            subscription_status: subscriptionData.status,
            subscription_plan: subscriptionData.plan || 'monthly',
            current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
            subscription_created_at: subscriptionData.created ? new Date(subscriptionData.created * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

    if (error) {
        console.error('❌ Error updating subscription:', error);
        throw new Error(`Failed to update subscription: ${error.message}`);
    }

    console.log('✅ Updated subscription for user:', user.email);
    return user;
}

/**
 * Logs subscription event to audit table
 * @param {string} userId - Supabase user ID
 * @param {Object} stripeEvent - Stripe event object
 */
async function logSubscriptionEvent(userId, stripeEvent) {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('subscription_events')
        .insert([{
            user_id: userId,
            stripe_event_id: stripeEvent.id,
            event_type: stripeEvent.type,
            subscription_id: stripeEvent.data?.object?.id,
            status: stripeEvent.data?.object?.status,
            metadata: stripeEvent.data?.object
        }]);

    if (error) {
        console.error('⚠️ Error logging subscription event:', error);
        // Don't throw - logging is not critical
    }
}

/**
 * Gets user subscription status by email
 * @param {string} email - User email
 * @returns {Promise<Object>} Subscription status object
 */
async function getUserSubscriptionStatus(email) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .rpc('get_user_subscription', { user_email: email });

    if (error) {
        console.error('❌ Error getting subscription status:', error);
        throw new Error(`Failed to get subscription status: ${error.message}`);
    }

    if (!data || data.length === 0) {
        // User doesn't exist - return default free tier
        return {
            subscription_status: 'free',
            subscription_plan: 'free',
            monthly_limit: 3,
            monthly_used: 0,
            can_process: true,
            is_premium: false
        };
    }

    return data[0];
}

/**
 * Increments CV usage for a user
 * @param {string} email - User email
 * @returns {Promise<Object>} Usage update result
 */
async function incrementCVUsage(email) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .rpc('increment_cv_usage', { user_email: email });

    if (error) {
        console.error('❌ Error incrementing CV usage:', error);
        throw new Error(`Failed to increment usage: ${error.message}`);
    }

    return data[0];
}

module.exports = {
    getSupabaseClient,
    getOrCreateUser,
    updateUserStripeCustomer,
    getUserByStripeCustomer,
    updateUserSubscription,
    logSubscriptionEvent,
    getUserSubscriptionStatus,
    incrementCVUsage
};

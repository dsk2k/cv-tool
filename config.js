/**
 * Configuration File
 * Centralized configuration for Supabase, Stripe, and feature flags
 */

// ⚠️ IMPORTANT: Replace these with your actual values
// These are PUBLIC keys and can safely be exposed in frontend code
window.APP_CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'https://YOUR_PROJECT.supabase.co', // Replace with your Supabase project URL
        anonKey: 'YOUR_SUPABASE_ANON_KEY'        // Replace with your anon/public key (safe to expose)
    },

    // Stripe Configuration
    stripe: {
        publishableKey: 'pk_test_YOUR_KEY'       // Replace with your Stripe publishable key (safe to expose)
    },

    // Feature Flags
    features: {
        authentication: true,     // Enable/disable auth system
        subscriptions: true,      // Enable/disable subscription features
        googleAuth: false,        // Enable/disable Google OAuth (requires setup in Supabase)
        analytics: true,          // Enable/disable enhanced analytics
        rateLimiting: true        // Enable/disable rate limiting checks
    },

    // Rate Limiting
    rateLimits: {
        free: {
            monthly: 3,           // Free users: 3 CVs per month
            message: 'Je hebt je gratis limiet bereikt. Upgrade naar Premium voor onbeperkte toegang!'
        },
        premium: {
            monthly: 999999,      // Premium users: unlimited
            message: 'Premium toegang'
        }
    },

    // UI Configuration
    ui: {
        showUserMenu: true,       // Show user menu in header
        showSubscriptionBadge: true, // Show premium badge
        enableDarkMode: false     // Dark mode support (future feature)
    },

    // API Endpoints
    api: {
        baseUrl: '/.netlify/functions',
        endpoints: {
            submitCV: '/submit-cv-job',
            checkStatus: '/check-job-status',
            checkSubscription: '/check-subscription',
            createCheckout: '/create-checkout'
        }
    }
};

/**
 * Get Supabase configuration
 */
window.getSupabaseConfig = function() {
    return window.APP_CONFIG.supabase;
};

/**
 * Get Stripe configuration
 */
window.getStripeConfig = function() {
    return window.APP_CONFIG.stripe;
};

/**
 * Check if feature is enabled
 */
window.isFeatureEnabled = function(featureName) {
    return window.APP_CONFIG.features[featureName] === true;
};

/**
 * Get rate limit for user type
 */
window.getRateLimit = function(isPremium = false) {
    return isPremium
        ? window.APP_CONFIG.rateLimits.premium
        : window.APP_CONFIG.rateLimits.free;
};

console.log('⚙️ App configuration loaded');

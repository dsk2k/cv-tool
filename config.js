/**
 * Configuration File
 * Centralized configuration for Supabase, Stripe, and feature flags
 */

// ⚠️ IMPORTANT: Update your Supabase URL below
// Anon key is loaded from SUPABASE_ANON_KEY environment variable in Netlify
window.APP_CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'https://wyglsmhhdfsdndjjulwc.supabase.co',
        anonKey: null  // Loaded from SUPABASE_ANON_KEY environment variable
    },

    // Stripe Configuration
    stripe: {
        publishableKey: null  // Loaded from STRIPE_PUBLISHABLE_KEY environment variable
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
            createCheckout: '/create-checkout',
            getConfig: '/get-config'
        }
    },

    // Flag to track if config is loaded
    _configLoaded: false
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

/**
 * Load configuration from Netlify environment variables
 * This fetches the anon key and publishable key from the backend
 */
window.loadAppConfig = async function() {
    if (window.APP_CONFIG._configLoaded) {
        return window.APP_CONFIG;
    }

    try {
        const response = await fetch('/.netlify/functions/get-config');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }

        const config = await response.json();

        // Update APP_CONFIG with values from environment variables
        if (config.supabase?.anonKey) {
            window.APP_CONFIG.supabase.anonKey = config.supabase.anonKey;
        }
        if (config.stripe?.publishableKey) {
            window.APP_CONFIG.stripe.publishableKey = config.stripe.publishableKey;
        }

        window.APP_CONFIG._configLoaded = true;
        console.log('⚙️ App configuration loaded from environment');

        return window.APP_CONFIG;
    } catch (error) {
        console.error('❌ Failed to load app configuration:', error);
        console.warn('⚠️ Continuing with default configuration');
        return window.APP_CONFIG;
    }
};

// Auto-load configuration when the script loads
if (typeof window !== 'undefined') {
    window.loadAppConfig().catch(err => {
        console.error('Failed to auto-load config:', err);
    });
}

console.log('⚙️ App configuration initializing...');

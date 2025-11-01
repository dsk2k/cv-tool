/**
 * Enhanced Analytics & Conversion Tracking
 * Tracks user actions and conversions in Google Analytics 4
 */

/**
 * Track "Optimize My CV" button click - PRIMARY CONVERSION
 * This is the main conversion event when users submit their CV
 */
function trackCVOptimizationStart() {
    if (typeof gtag !== 'function') {
        console.warn('⚠️ GA4 not loaded');
        return;
    }

    // Track as conversion event
    gtag('event', 'conversion', {
        'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with your Google Ads conversion ID if using
        'event_category': 'CV Optimization',
        'event_label': 'Start CV Optimization',
        'value': 1.0
    });

    // Also track as custom event for GA4
    gtag('event', 'cv_optimization_started', {
        'event_category': 'engagement',
        'event_label': 'user_submitted_cv',
        'value': 1
    });

    console.log('📊 Tracked: CV Optimization Started (CONVERSION)');
}

/**
 * Track CV submission success
 */
function trackCVSubmissionSuccess(jobTitle = '') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'cv_submission_success', {
        'event_category': 'conversion',
        'event_label': 'cv_processed_successfully',
        'job_title': jobTitle
    });

    console.log('📊 Tracked: CV Submission Success');
}

/**
 * Track CV submission failure
 */
function trackCVSubmissionError(errorType = '') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'cv_submission_error', {
        'event_category': 'error',
        'event_label': errorType || 'unknown_error'
    });

    console.log('📊 Tracked: CV Submission Error -', errorType);
}

/**
 * Track user signup/registration
 */
function trackUserSignup(method = 'email') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'sign_up', {
        method: method // 'email', 'google', etc.
    });

    gtag('event', 'conversion', {
        'send_to': 'AW-CONVERSION_ID/SIGNUP_LABEL', // Replace if using Google Ads
        'event_category': 'User Acquisition',
        'event_label': `signup_${method}`
    });

    console.log('📊 Tracked: User Signup via', method);
}

/**
 * Track user login
 */
function trackUserLogin(method = 'email') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'login', {
        method: method
    });

    console.log('📊 Tracked: User Login via', method);
}

/**
 * Track premium upgrade click
 */
function trackUpgradeClick(source = 'unknown') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'begin_checkout', {
        'event_category': 'monetization',
        'event_label': `upgrade_click_${source}`,
        'currency': 'EUR',
        'value': 9.99
    });

    console.log('📊 Tracked: Upgrade Click from', source);
}

/**
 * Track successful subscription purchase
 */
function trackSubscriptionPurchase(plan = 'monthly', value = 9.99) {
    if (typeof gtag !== 'function') return;

    gtag('event', 'purchase', {
        'transaction_id': `sub_${Date.now()}`,
        'value': value,
        'currency': 'EUR',
        'items': [{
            'item_id': `plan_${plan}`,
            'item_name': `CV Tool Premium - ${plan}`,
            'price': value,
            'quantity': 1
        }]
    });

    gtag('event', 'conversion', {
        'send_to': 'AW-CONVERSION_ID/PURCHASE_LABEL', // Replace if using Google Ads
        'event_category': 'Revenue',
        'event_label': `subscription_${plan}`,
        'value': value,
        'currency': 'EUR'
    });

    console.log('📊 Tracked: Subscription Purchase -', plan, '€' + value);
}

/**
 * Track subscription cancellation
 */
function trackSubscriptionCancellation(reason = '') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'subscription_cancelled', {
        'event_category': 'retention',
        'event_label': reason || 'no_reason_provided'
    });

    console.log('📊 Tracked: Subscription Cancelled -', reason);
}

/**
 * Track download actions (CV, cover letter, etc.)
 */
function trackDownload(fileType = 'cv') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'file_download', {
        'event_category': 'engagement',
        'event_label': fileType,
        'file_type': fileType
    });

    console.log('📊 Tracked: File Download -', fileType);
}

/**
 * Track email result submission
 */
function trackEmailResults() {
    if (typeof gtag !== 'function') return;

    gtag('event', 'email_results', {
        'event_category': 'engagement',
        'event_label': 'user_requested_email_results'
    });

    console.log('📊 Tracked: Email Results Requested');
}

/**
 * Track category expansion (in improvements page)
 */
function trackCategoryExpansion(category = '') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'category_view', {
        'event_category': 'engagement',
        'event_label': category
    });

    console.log('📊 Tracked: Category Viewed -', category);
}

/**
 * Track rate limit hit
 */
function trackRateLimitHit(limitType = 'monthly') {
    if (typeof gtag !== 'function') return;

    gtag('event', 'rate_limit_reached', {
        'event_category': 'conversion_opportunity',
        'event_label': limitType,
        'limit_type': limitType
    });

    console.log('📊 Tracked: Rate Limit Hit -', limitType);
}

/**
 * Track page views with enhanced data
 */
function trackEnhancedPageView(pageName = '', customData = {}) {
    if (typeof gtag !== 'function') return;

    gtag('event', 'page_view', {
        'page_title': pageName,
        'page_location': window.location.href,
        'page_path': window.location.pathname,
        ...customData
    });

    console.log('📊 Tracked: Enhanced Page View -', pageName);
}

/**
 * Set user properties (for segmentation)
 */
function setUserProperties(properties = {}) {
    if (typeof gtag !== 'function') return;

    gtag('set', 'user_properties', properties);

    console.log('📊 Set User Properties:', properties);
}

// Export functions to global scope
window.trackCVOptimizationStart = trackCVOptimizationStart;
window.trackCVSubmissionSuccess = trackCVSubmissionSuccess;
window.trackCVSubmissionError = trackCVSubmissionError;
window.trackUserSignup = trackUserSignup;
window.trackUserLogin = trackUserLogin;
window.trackUpgradeClick = trackUpgradeClick;
window.trackSubscriptionPurchase = trackSubscriptionPurchase;
window.trackSubscriptionCancellation = trackSubscriptionCancellation;
window.trackDownload = trackDownload;
window.trackEmailResults = trackEmailResults;
window.trackCategoryExpansion = trackCategoryExpansion;
window.trackRateLimitHit = trackRateLimitHit;
window.trackEnhancedPageView = trackEnhancedPageView;
window.setUserProperties = setUserProperties;

console.log('✅ Enhanced tracking loaded');

/**
 * Email Storage & Service Integration
 *
 * This module handles email capture, storage, and integration with email services.
 * Supports multiple backends: Netlify Blobs, external APIs, or email services.
 */

const crypto = require('crypto');

/**
 * Store email with metadata
 * Uses Netlify's built-in storage or falls back to console logging
 */
async function storeEmail(emailData) {
    try {
        const {
            email,
            fingerprint,
            language = 'nl',
            source = 'cv_form',
            timestamp = new Date().toISOString(),
            metadata = {}
        } = emailData;

        // Validate email
        if (!email || !isValidEmail(email)) {
            console.error('❌ Invalid email format:', email);
            return { success: false, error: 'Invalid email' };
        }

        // Create storage record
        const record = {
            email: email.toLowerCase().trim(),
            fingerprint,
            language,
            source,
            timestamp,
            plan: 'free',
            cvs_used: 0,
            cvs_limit: 3,
            metadata: {
                ip: metadata.ip || 'unknown',
                userAgent: metadata.userAgent || 'unknown',
                ...metadata
            }
        };

        // Hash email for privacy (optional)
        const emailHash = hashEmail(email);
        record.emailHash = emailHash;

        console.log(`📧 Email captured: ${email} (hash: ${emailHash.substring(0, 8)}...)`);
        console.log(`📊 Email data:`, JSON.stringify(record, null, 2));

        // TODO: Implement actual storage backend
        // Option 1: Netlify Blobs (requires @netlify/blobs package)
        // const { getStore } = require('@netlify/blobs');
        // const store = getStore('emails');
        // await store.set(emailHash, JSON.stringify(record));

        // Option 2: External database (Supabase, Firebase, MongoDB)
        // await saveToDatabase(record);

        // Option 3: Email service provider (Mailchimp, SendGrid)
        // await addToEmailService(record);

        // For now, log to console (development mode)
        console.log('✅ Email stored successfully (console only - implement backend!)');

        // Track in analytics if available
        if (typeof trackEmailCapture === 'function') {
            trackEmailCapture(email, source);
        }

        return {
            success: true,
            emailHash,
            message: 'Email captured successfully'
        };

    } catch (error) {
        console.error('❌ Error storing email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Hash email for privacy and deduplication
 */
function hashEmail(email) {
    return crypto
        .createHash('sha256')
        .update(email.toLowerCase().trim())
        .digest('hex');
}

/**
 * Check if email already exists (for deduplication)
 */
async function emailExists(email) {
    // TODO: Implement with actual storage backend
    const emailHash = hashEmail(email);
    console.log(`🔍 Checking if email exists: ${emailHash.substring(0, 8)}...`);
    return false; // Always return false for now
}

/**
 * Get email stats for a user
 */
async function getEmailStats(email) {
    // TODO: Implement with actual storage backend
    const emailHash = hashEmail(email);
    console.log(`📊 Getting stats for email: ${emailHash.substring(0, 8)}...`);

    return {
        email: email.toLowerCase().trim(),
        emailHash,
        plan: 'free',
        cvs_used: 0,
        cvs_limit: 3,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
    };
}

/**
 * Integration with email service providers
 * Configure with environment variables:
 * - MAILCHIMP_API_KEY
 * - SENDGRID_API_KEY
 * - EMAIL_SERVICE_PROVIDER (mailchimp|sendgrid|none)
 */
async function addToEmailService(emailData) {
    const provider = process.env.EMAIL_SERVICE_PROVIDER || 'none';

    console.log(`📮 Email service provider: ${provider}`);

    switch (provider) {
        case 'mailchimp':
            return await addToMailchimp(emailData);
        case 'sendgrid':
            return await addToSendgrid(emailData);
        case 'none':
        default:
            console.log('ℹ️  No email service configured - skipping integration');
            return { success: true, skipped: true };
    }
}

/**
 * Add email to Mailchimp list
 */
async function addToMailchimp(emailData) {
    try {
        const apiKey = process.env.MAILCHIMP_API_KEY;
        const listId = process.env.MAILCHIMP_LIST_ID;

        if (!apiKey || !listId) {
            console.warn('⚠️  Mailchimp credentials missing - skipping');
            return { success: false, error: 'Missing credentials' };
        }

        // TODO: Implement Mailchimp API call
        console.log('📮 Would add to Mailchimp:', emailData.email);

        return { success: true, provider: 'mailchimp' };
    } catch (error) {
        console.error('❌ Mailchimp error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add email to SendGrid contacts
 */
async function addToSendgrid(emailData) {
    try {
        const apiKey = process.env.SENDGRID_API_KEY;

        if (!apiKey) {
            console.warn('⚠️  SendGrid credentials missing - skipping');
            return { success: false, error: 'Missing credentials' };
        }

        // TODO: Implement SendGrid API call
        console.log('📮 Would add to SendGrid:', emailData.email);

        return { success: true, provider: 'sendgrid' };
    } catch (error) {
        console.error('❌ SendGrid error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(email, language = 'nl') {
    console.log(`📧 Would send welcome email to: ${email} (${language})`);

    // TODO: Implement email sending
    // Use SendGrid, Mailchimp, or Netlify Functions email service

    return { success: true, message: 'Welcome email queued' };
}

/**
 * Send usage reminder email
 */
async function sendUsageReminder(email, cvsRemaining, language = 'nl') {
    console.log(`📧 Would send usage reminder to: ${email} (${cvsRemaining} CVs left, ${language})`);

    // TODO: Implement email sending
    const subject = language === 'nl'
        ? `Je hebt nog ${cvsRemaining} gratis CV analyses over!`
        : `You have ${cvsRemaining} free CV analyses left!`;

    return { success: true, message: 'Reminder email queued' };
}

/**
 * Send upgrade offer email
 */
async function sendUpgradeOffer(email, discount = 50, language = 'nl') {
    console.log(`📧 Would send upgrade offer to: ${email} (${discount}% off, ${language})`);

    // TODO: Implement email sending

    return { success: true, message: 'Upgrade email queued' };
}

module.exports = {
    storeEmail,
    isValidEmail,
    hashEmail,
    emailExists,
    getEmailStats,
    addToEmailService,
    sendWelcomeEmail,
    sendUsageReminder,
    sendUpgradeOffer
};

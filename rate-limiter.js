/**
 * Client-Side Rate Limiter with Persistent Tracking
 * Resistant to cookie deletion and simple evasion methods
 *
 * Uses multiple tracking methods:
 * - Browser fingerprinting (canvas, screen, timezone, language)
 * - LocalStorage + SessionStorage
 * - IP address (server-side)
 * - Multiple storage locations for redundancy
 */

class RateLimiter {
    constructor() {
        this.storageKey = '_cv_usage';
        this.fingerprintKey = '_fp';
        this.maxFreeUses = 3; // Default, can be overridden by environment
        this.fingerprint = null;
    }

    /**
     * Initialize rate limiter
     */
    async init() {
        // Generate browser fingerprint
        this.fingerprint = await this.generateFingerprint();

        // Check if whitelisted
        const isWhitelisted = await this.checkWhitelist();
        if (isWhitelisted) {
            console.log('✅ User is whitelisted - unlimited access');
            return { allowed: true, unlimited: true };
        }

        // Get usage count
        const usage = this.getUsageCount();
        const remaining = Math.max(0, this.maxFreeUses - usage);

        console.log(`📊 Rate limit status: ${usage}/${this.maxFreeUses} used, ${remaining} remaining`);

        return {
            allowed: remaining > 0,
            usage,
            remaining,
            maxUses: this.maxFreeUses,
            fingerprint: this.fingerprint
        };
    }

    /**
     * Generate browser fingerprint for persistent tracking
     * Combines multiple browser characteristics
     */
    async generateFingerprint() {
        const components = [];

        // Canvas fingerprinting (most reliable)
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('CV Tailor 🎨', 2, 15);
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas-blocked');
        }

        // Screen resolution
        components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

        // Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

        // Language
        components.push(navigator.language);

        // Platform
        components.push(navigator.platform);

        // Hardware concurrency (CPU cores)
        components.push(navigator.hardwareConcurrency || 'unknown');

        // Device memory (if available)
        components.push(navigator.deviceMemory || 'unknown');

        // User agent
        components.push(navigator.userAgent);

        // Combine all components and hash
        const fingerprint = await this.hashString(components.join('|||'));

        // Store fingerprint in multiple locations
        this.storeFingerprint(fingerprint);

        return fingerprint;
    }

    /**
     * Hash a string using SubtleCrypto API
     */
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Store fingerprint in multiple locations for redundancy
     */
    storeFingerprint(fingerprint) {
        try {
            localStorage.setItem(this.fingerprintKey, fingerprint);
            sessionStorage.setItem(this.fingerprintKey, fingerprint);

            // Also store in a hidden location
            localStorage.setItem('_system_id', fingerprint);
            localStorage.setItem('_device_token', btoa(fingerprint));
        } catch (e) {
            console.warn('⚠️ Could not store fingerprint:', e);
        }
    }

    /**
     * Get stored fingerprint from any available location
     */
    getStoredFingerprint() {
        try {
            return localStorage.getItem(this.fingerprintKey) ||
                   sessionStorage.getItem(this.fingerprintKey) ||
                   localStorage.getItem('_system_id') ||
                   (localStorage.getItem('_device_token') ? atob(localStorage.getItem('_device_token')) : null);
        } catch (e) {
            return null;
        }
    }

    /**
     * Get current usage count
     * Checks multiple storage locations and takes the highest value
     */
    getUsageCount() {
        try {
            const fp = this.fingerprint || this.getStoredFingerprint();

            // Check multiple storage keys
            const keys = [
                `${this.storageKey}_${fp}`,
                `${this.storageKey}_primary`,
                `${this.storageKey}_backup`,
                '_app_state',
                '_usage_data'
            ];

            let maxUsage = 0;

            for (const key of keys) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    try {
                        const data = JSON.parse(stored);
                        const count = data.count || 0;
                        maxUsage = Math.max(maxUsage, count);
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }

            return maxUsage;
        } catch (e) {
            console.warn('⚠️ Error getting usage count:', e);
            return 0;
        }
    }

    /**
     * Increment usage count
     * Stores in multiple locations
     */
    incrementUsage() {
        try {
            const fp = this.fingerprint || this.getStoredFingerprint();
            const currentCount = this.getUsageCount() + 1;

            const usageData = {
                count: currentCount,
                fingerprint: fp,
                lastUsed: new Date().toISOString(),
                timestamp: Date.now()
            };

            // Store in multiple locations for redundancy
            const keys = [
                `${this.storageKey}_${fp}`,
                `${this.storageKey}_primary`,
                `${this.storageKey}_backup`,
                '_app_state',
                '_usage_data'
            ];

            for (const key of keys) {
                localStorage.setItem(key, JSON.stringify(usageData));
            }

            // Also send to server for server-side tracking
            this.reportUsageToServer(fp, currentCount);

            console.log(`📈 Usage incremented: ${currentCount}/${this.maxFreeUses}`);

            return currentCount;
        } catch (e) {
            console.error('❌ Error incrementing usage:', e);
            return this.getUsageCount();
        }
    }

    /**
     * Report usage to server for IP-based tracking
     */
    async reportUsageToServer(fingerprint, count) {
        try {
            const response = await fetch('/.netlify/functions/track-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerprint,
                    action: 'increment'
                })
            });

            const data = await response.json();
            return data;
        } catch (e) {
            // Silent fail - client-side tracking still works
            console.warn('⚠️ Could not report to server:', e);
            return null;
        }
    }

    /**
     * Check server-side usage and whitelist status
     */
    async checkServerUsage() {
        try {
            const response = await fetch('/.netlify/functions/track-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerprint: this.fingerprint,
                    action: 'check'
                })
            });

            const data = await response.json();
            return data;
        } catch (e) {
            console.warn('⚠️ Could not check server usage:', e);
            return { whitelisted: false, usage: 0 };
        }
    }

    /**
     * Check if user can submit CV
     */
    async canSubmit() {
        const status = await this.init();
        return status.allowed || status.unlimited;
    }

    /**
     * Get remaining uses
     */
    async getRemainingUses() {
        const status = await this.init();
        if (status.unlimited) {
            return 999999; // Unlimited
        }
        return status.remaining;
    }

    /**
     * Reset usage (for testing only)
     */
    resetUsage() {
        try {
            const keys = Object.keys(localStorage).filter(k =>
                k.includes(this.storageKey) ||
                k.includes('_app_state') ||
                k.includes('_usage_data')
            );

            keys.forEach(key => localStorage.removeItem(key));
            console.log('🔄 Usage reset');
        } catch (e) {
            console.error('❌ Error resetting usage:', e);
        }
    }
}

// Create global instance
window.rateLimiter = new RateLimiter();

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
    await window.rateLimiter.init();
});

console.log('✅ Rate limiter initialized');

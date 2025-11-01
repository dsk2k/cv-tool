/**
 * Authentication Module
 * Handles login, signup, and session management with Supabase
 */

class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.onAuthChangeCallbacks = [];
    }

    /**
     * Initialize Supabase client
     */
    async init() {
        // Load Supabase client from CDN if not already loaded
        if (!window.supabase) {
            await this.loadSupabaseScript();
        }

        // Initialize client with public anon key (safe for frontend)
        const supabaseUrl = 'YOUR_SUPABASE_URL'; // Will be replaced with actual URL
        const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Public key, safe to expose

        this.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

        // Listen for auth changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);
            this.currentUser = session?.user || null;
            this.notifyAuthChange(session);
        });

        // Get current session
        const { data: { session } } = await this.supabase.auth.getSession();
        this.currentUser = session?.user || null;

        return this.currentUser;
    }

    /**
     * Load Supabase script from CDN
     */
    loadSupabaseScript() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Sign up with email and password
     */
    async signUp(email, password, fullName = '') {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            console.log('✅ Sign up successful:', data.user?.email);
            return { success: true, user: data.user };

        } catch (error) {
            console.error('❌ Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            console.log('✅ Sign in successful:', data.user?.email);
            return { success: true, user: data.user };

        } catch (error) {
            console.error('❌ Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle() {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;

            return { success: true };

        } catch (error) {
            console.error('❌ Google sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            console.log('✅ Sign out successful');
            return { success: true };

        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Check if user is logged in
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Get user's email
     */
    getUserEmail() {
        return this.currentUser?.email || null;
    }

    /**
     * Register callback for auth state changes
     */
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    /**
     * Notify all callbacks of auth change
     */
    notifyAuthChange(session) {
        this.onAuthChangeCallbacks.forEach(callback => {
            callback(session?.user || null);
        });
    }

    /**
     * Send password reset email
     */
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            console.log('✅ Password reset email sent');
            return { success: true };

        } catch (error) {
            console.error('❌ Password reset error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global auth instance
window.authManager = new AuthManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authManager.init();
    });
} else {
    window.authManager.init();
}

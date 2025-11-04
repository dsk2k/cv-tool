        // Initialize developer mode banner on improvements page
        window.addEventListener('DOMContentLoaded', async () => {
            try {
                let status = { remaining: 3, maxUses: 3, usage: 0, unlimited: false };
                let serverStatus = { whitelisted: false, isDeveloper: false, usage: 0 };

                // Check rate limiter status
                if (window.rateLimiter) {
                    try {
                        status = await window.rateLimiter.init();
                        serverStatus = await window.rateLimiter.checkServerUsage();
                    } catch (apiError) {
                        console.warn('⚠️ Rate limiter API unavailable, using defaults:', apiError);
                    }
                } else {
                    console.warn('⚠️ Rate limiter not available, using defaults');
                }

                // NOTE: Developer mode is now shown in the usage banner, not the separate dev banner
                // The usage banner will show "🔧 Developer Mode: X CVs geanalyseerd" for developers

                // Update USAGE BANNER (for all users)
                const remaining = status.remaining || 0;
                const maxUses = status.maxUses || 3;
                const used = maxUses - remaining;

                const usageBanner = document.getElementById('usage-banner');
                const usageBannerText = document.getElementById('usage-banner-text');
                const usageBannerSubtitle = document.getElementById('usage-banner-subtitle');
                const usageProgressBar = document.getElementById('usage-progress-bar');
                const usageProgressContainer = document.getElementById('usage-progress-container');
                const usageUpgradeBtn = document.getElementById('usage-upgrade-btn');

                // Show/hide sticky upgrade bar and feature comparison
                const stickyUpgradeBar = document.getElementById('sticky-upgrade-bar');
                const featureComparison = document.getElementById('feature-comparison');

                if (status.unlimited || serverStatus.whitelisted) {
                    // Hide upgrade elements for premium/whitelisted users
                    if (stickyUpgradeBar) stickyUpgradeBar.style.display = 'none';
                    if (featureComparison) featureComparison.style.display = 'none';

                    const nextStepsCta = document.getElementById('next-steps-cta');
                    if (nextStepsCta) nextStepsCta.style.display = 'none';

                    const faqSection = document.getElementById('faq-section');
                    if (faqSection) faqSection.style.display = 'none';

                    const progressIndicator = document.getElementById('progress-indicator');
                    if (progressIndicator) progressIndicator.style.display = 'none';

                    const testimonialSlider = document.getElementById('testimonial-slider');
                    if (testimonialSlider) testimonialSlider.style.display = 'none';

                    // UNLOCK PREMIUM CONTENT
                    // Remove locks from cover letter and recruiter tips
                    const coverContent = document.getElementById('cover-content');
                    const tipsContent = document.getElementById('tips-content');

                    if (coverContent) {
                        coverContent.classList.remove('locked-content');
                        const blurDiv = coverContent.querySelector('.blur-content');
                        const unlockOverlay = coverContent.querySelector('.unlock-overlay');
                        if (blurDiv) blurDiv.classList.remove('blur-content');
                        if (unlockOverlay) unlockOverlay.remove();
                    }

                    if (tipsContent) {
                        tipsContent.classList.remove('locked-content');
                        const blurDiv = tipsContent.querySelector('.blur-content');
                        const unlockOverlay = tipsContent.querySelector('.unlock-overlay');
                        if (blurDiv) blurDiv.classList.remove('blur-content');
                        if (unlockOverlay) unlockOverlay.remove();
                    }

                    console.log('✅ Premium content unlocked');

                    // Show unlimited banner for whitelisted/premium users
                    usageBanner.style.display = 'block';

                    if (serverStatus.isDeveloper) {
                        // Developer mode - show usage count
                        const devUsageCount = status.usage || serverStatus.usage || 0;
                        usageBannerText.textContent = `🔧 Developer Mode: ${devUsageCount} CVs geanalyseerd`;
                        usageBannerSubtitle.textContent = 'Unlimited toegang - IP Whitelisted';
                    } else {
                        // Premium/whitelisted
                        usageBannerText.textContent = '∞ Unlimited Analyses';
                        usageBannerSubtitle.textContent = 'Premium toegang actief';
                    }

                    usageProgressContainer.style.display = 'none';
                    usageUpgradeBtn.style.display = 'none';
                } else {
                    // Show upgrade elements for free users
                    if (stickyUpgradeBar) stickyUpgradeBar.style.display = 'block';
                    if (featureComparison) featureComparison.style.display = 'block';

                    const nextStepsCta = document.getElementById('next-steps-cta');
                    if (nextStepsCta) nextStepsCta.style.display = 'block';

                    const faqSection = document.getElementById('faq-section');
                    if (faqSection) faqSection.style.display = 'block';

                    const progressIndicator = document.getElementById('progress-indicator');
                    if (progressIndicator) progressIndicator.style.display = 'inline-flex';

                    const testimonialSlider = document.getElementById('testimonial-slider');
                    if (testimonialSlider) testimonialSlider.style.display = 'block';

                    // Show usage banner for free users (dynamic values!)
                    usageBanner.style.display = 'block';
                    usageBannerText.textContent = `${remaining}/${maxUses} Gratis CV Analyses`;

                    if (remaining === 0) {
                        usageBannerSubtitle.textContent = 'Limiet bereikt - Upgrade voor meer';
                        usageUpgradeBtn.style.display = 'inline-block';
                        usageUpgradeBtn.textContent = '⭐ Upgrade Now';
                    } else if (used > 0) {
                        usageBannerSubtitle.textContent = `${used} gebruikt, ${remaining} over`;
                        usageProgressContainer.style.display = 'flex';
                        usageUpgradeBtn.style.display = 'inline-block';

                        // Update progress bar (dynamic!)
                        const percentage = (remaining / maxUses) * 100;
                        usageProgressBar.style.width = `${percentage}%`;
                    } else {
                        usageBannerSubtitle.textContent = 'Nog beschikbaar deze maand';
                        usageProgressContainer.style.display = 'none';
                        usageUpgradeBtn.style.display = 'none';
                    }
                }

                console.log('✅ Usage banner updated on improvements page:', {
                    remaining,
                    maxUses,
                    used,
                    isDeveloper: serverStatus.isDeveloper,
                    whitelisted: serverStatus.whitelisted
                });
            } catch (error) {
                console.error('❌ Error initializing banners:', error);
            }
        });

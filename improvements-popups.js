let exitIntentShown = false;
let scrollTriggered = false;
const EXIT_INTENT_DELAY = 500; // 500ms delay before showing

// Countdown Timer
let countdownMinutes = 10;
let countdownSeconds = 0;
let countdownInterval;

function startCountdown() {
    const timerElement = document.getElementById('countdown-timer');
    if (!timerElement) return;

    countdownInterval = setInterval(() => {
        if (countdownSeconds === 0) {
            if (countdownMinutes === 0) {
                clearInterval(countdownInterval);
                timerElement.textContent = 'EXPIRED';
                timerElement.style.color = '#dc2626';
                return;
            }
            countdownMinutes--;
            countdownSeconds = 59;
        } else {
            countdownSeconds--;
        }

        const mins = countdownMinutes.toString().padStart(2, '0');
        const secs = countdownSeconds.toString().padStart(2, '0');
        timerElement.textContent = `${mins}:${secs}`;
    }, 1000);
}

function showExitIntent() {
    // Don't show if already shown
    if (exitIntentShown) return;

    // Don't show for premium users
    const status = localStorage.getItem('rateLimitStatus');
    if (status) {
        try {
            const parsed = JSON.parse(status);
            if (parsed.unlimited) {
                console.log('Exit intent: Skipped for premium user');
                return;
            }
        } catch (e) {
            console.error('Error parsing rate limit status:', e);
        }
    }

    const popup = document.getElementById('exit-intent-popup');
    if (popup) {
        popup.style.display = 'block';
        exitIntentShown = true;
        startCountdown();
        console.log('✨ Exit intent popup shown');

        // Track event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exit_intent_shown', {
                event_category: 'conversion',
                event_label: 'exit_intent_popup'
            });
        }
    }
}

function closeExitIntent() {
    const popup = document.getElementById('exit-intent-popup');
    if (popup) {
        popup.style.display = 'none';
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        console.log('Exit intent popup closed');

        // Track close event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exit_intent_closed', {
                event_category: 'conversion',
                event_label: 'exit_intent_popup'
            });
        }
    }
}

// Mouse-out detection (primary trigger)
document.addEventListener('mouseout', (e) => {
    // Only trigger when mouse leaves from top of viewport
    if (e.clientY < 10 && !exitIntentShown) {
        console.log('Exit intent: Mouse out detected');
        setTimeout(showExitIntent, EXIT_INTENT_DELAY);
    }
});

// Scroll-based backup trigger (50% page scroll + 3s delay)
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTriggered || exitIntentShown) return;

    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

    if (scrollPercentage > 50) {
        console.log('Exit intent: 50% scroll reached');
        scrollTriggered = true;

        // Show after 3 seconds of reaching 50%
        scrollTimeout = setTimeout(() => {
            showExitIntent();
        }, 3000);
    }
});

// Close on backdrop click
document.getElementById('exit-intent-popup')?.addEventListener('click', (e) => {
    if (e.target.id === 'exit-intent-popup') {
        closeExitIntent();
    }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && exitIntentShown) {
        closeExitIntent();
    }
});

console.log('✅ Exit intent popup initialized');

// === LIVE UPGRADE COUNTER (Social Proof + FOMO) ===
function updateLastUpgrade() {
    const names = [
        'Sarah', 'Mike', 'Emma', 'David', 'Sophie', 'Tom', 'Lisa', 'John',
        'Anna', 'Peter', 'Laura', 'Mark', 'Julia', 'Chris', 'Nina', 'Alex',
        'Maria', 'Paul', 'Kim', 'Frank', 'Eva', 'Lucas', 'Hannah', 'Max'
    ];

    const nameEl = document.getElementById('last-upgrade-name');
    const timeEl = document.getElementById('last-upgrade-time');

    if (nameEl && timeEl) {
        // Random name
        const randomName = names[Math.floor(Math.random() * names.length)];
        nameEl.textContent = randomName;

        // Random time (2-45 minutes ago)
        const randomMinutes = Math.floor(Math.random() * 43) + 2; // 2-45
        timeEl.textContent = `${randomMinutes} min`;

        console.log(`✅ Last upgrade: ${randomName} - ${randomMinutes} min ago`);
    }
}

// Update immediately on page load
updateLastUpgrade();

// Update every 30-60 seconds with random interval
setInterval(() => {
    updateLastUpgrade();
}, (Math.random() * 30000) + 30000); // Random between 30-60 seconds

// === TESTIMONIAL SLIDER (Social Proof) ===
let currentTestimonial = 0;
const testimonials = document.querySelectorAll('.testimonial-item');
const testimonialDots = document.querySelectorAll('.testimonial-dot');

function showTestimonial(index) {
    // Hide all testimonials
    testimonials.forEach(item => {
        item.style.display = 'none';
        item.classList.remove('active');
    });

    // Remove active class from all dots
    testimonialDots.forEach(dot => {
        dot.classList.remove('active');
        dot.classList.remove('bg-purple-600');
        dot.classList.add('bg-gray-300');
    });

    // Show selected testimonial
    if (testimonials[index]) {
        testimonials[index].style.display = 'block';
        testimonials[index].classList.add('active');
    }

    // Activate corresponding dot
    if (testimonialDots[index]) {
        testimonialDots[index].classList.add('active');
        testimonialDots[index].classList.add('bg-purple-600');
        testimonialDots[index].classList.remove('bg-gray-300');
    }

    currentTestimonial = index;
}

function nextTestimonial() {
    let next = (currentTestimonial + 1) % testimonials.length;
    showTestimonial(next);
}

// Add click handlers to dots
testimonialDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showTestimonial(index);
        // Reset interval when user manually clicks
        clearInterval(testimonialInterval);
        testimonialInterval = setInterval(nextTestimonial, 6000);
    });
});

// Auto-rotate every 6 seconds
let testimonialInterval = setInterval(nextTestimonial, 6000);

// Initialize first testimonial
if (testimonials.length > 0) {
    showTestimonial(0);
    console.log('✅ Testimonial slider initialized with', testimonials.length, 'testimonials');
}

// === STICKY DOWNLOAD BUTTON (Scroll-activated CTA) ===
const stickyBtn = document.getElementById('sticky-download-btn');
const stickyBtnAction = document.getElementById('sticky-download-action');
const stickyBtnTitle = document.getElementById('sticky-btn-title');
const stickyBtnSubtitle = document.getElementById('sticky-btn-subtitle');
const stickyBtnCta = document.getElementById('sticky-btn-cta');
let stickyBtnVisible = false;

// Show/hide based on scroll position
window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;

    // Show after scrolling 300px
    if (scrollPosition > 300 && !stickyBtnVisible) {
        stickyBtn.style.bottom = '20px';
        stickyBtnVisible = true;
    } else if (scrollPosition <= 300 && stickyBtnVisible) {
        stickyBtn.style.bottom = '-100px';
        stickyBtnVisible = false;
    }
});

// Handle click based on user status
stickyBtnAction.addEventListener('click', () => {
    // Check if premium/whitelisted
    const status = window.rateLimiter?.getStatus() || { unlimited: false };
    let serverStatus = { whitelisted: false, unlimited: false, devMode: false };

    try {
        const serverData = localStorage.getItem('rateLimitServerStatus');
        if (serverData) {
            serverStatus = JSON.parse(serverData);
        }
    } catch (e) {
        console.error('Error parsing server status:', e);
    }

    if (status.unlimited || serverStatus.whitelisted) {
        // Premium user - trigger download
        window.trackEvent('sticky_download_clicked', {
            user_type: 'premium',
            source: 'sticky_button'
        });
        downloadPDF();
    } else {
        // Free user - redirect to pricing
        window.trackEvent('sticky_download_clicked', {
            user_type: 'free',
            source: 'sticky_button'
        });
        trackUpgradeClick('sticky_download_button');
        window.location.href = '/#pricing';
    }
});

// Update button text based on user status
function updateStickyButton() {
    const status = window.rateLimiter?.getStatus() || { unlimited: false };
    let serverStatus = { whitelisted: false, unlimited: false, devMode: false };

    try {
        const serverData = localStorage.getItem('rateLimitServerStatus');
        if (serverData) {
            serverStatus = JSON.parse(serverData);
        }
    } catch (e) {
        console.error('Error parsing server status:', e);
    }

    if (status.unlimited || serverStatus.whitelisted) {
        // Premium user
        stickyBtnTitle.textContent = 'Ready to Download?';
        stickyBtnSubtitle.textContent = 'Get your complete CV analysis';
        stickyBtnCta.textContent = 'Download PDF';
    } else {
        // Free user
        stickyBtnTitle.textContent = 'Want Full Analysis?';
        stickyBtnSubtitle.textContent = 'Unlock all 12+ improvements + cover letter';
        stickyBtnCta.textContent = 'Upgrade Now';
    }
}

// Update button on page load
setTimeout(updateStickyButton, 1000);

console.log('✅ Sticky download button initialized');

// === COMPARE TO AVERAGE STATS (Social Proof + Motivation) ===
function updateComparisonStats(userScore) {
    const averageScore = 58; // Average CV score

    // Calculate improvement percentage
    const improvement = userScore - averageScore;
    const improvementPercentage = Math.round(improvement);

    // Calculate percentile (rough estimation based on normal distribution)
    let percentile;
    if (userScore >= 90) percentile = "5%";
    else if (userScore >= 85) percentile = "10%";
    else if (userScore >= 80) percentile = "15%";
    else if (userScore >= 75) percentile = "20%";
    else if (userScore >= 70) percentile = "25%";
    else if (userScore >= 65) percentile = "30%";
    else if (userScore >= 60) percentile = "40%";
    else percentile = "50%";

    // Calculate how many CVs user beats
    const percentileNum = parseInt(percentile);
    const beatPercentage = (100 - percentileNum) + "%";

    // Update UI elements
    const userScoreEl = document.getElementById('user-score-comparison');
    const userScoreBar = document.getElementById('user-score-bar');
    const improvementEl = document.getElementById('improvement-percentage');
    const percentileEl = document.getElementById('percentile-rank');
    const beatEl = document.getElementById('beat-percentage');
    const motivationTitle = document.getElementById('motivation-title');
    const motivationMessage = document.getElementById('motivation-message');

    if (userScoreEl) userScoreEl.textContent = userScore + '%';
    if (improvementEl) improvementEl.textContent = improvementPercentage;
    if (percentileEl) percentileEl.textContent = percentile;
    if (beatEl) beatEl.textContent = beatPercentage;

    // Animate score bar
    if (userScoreBar) {
        setTimeout(() => {
            userScoreBar.style.width = userScore + '%';
        }, 500);
    }

    // Personalized motivation message
    if (motivationTitle && motivationMessage) {
        if (userScore >= 90) {
            motivationTitle.textContent = "Outstanding! 🌟";
            motivationMessage.textContent = "You're in the top 5%! Your CV is highly competitive. Unlock Pro to get the full detailed analysis and cover letter.";
        } else if (userScore >= 80) {
            motivationTitle.textContent = "Excellent work! 🎉";
            motivationMessage.textContent = "You're in the top 15%! Just a few more improvements to reach top 5%. Unlock Pro to see all suggestions.";
        } else if (userScore >= 70) {
            motivationTitle.textContent = "Great progress! 💪";
            motivationMessage.textContent = "You're above average! Unlock Pro to see 12+ improvements that will push you to top 10%.";
        } else if (userScore >= 60) {
            motivationTitle.textContent = "Good start! 👍";
            motivationMessage.textContent = "You're close to average. Unlock Pro to see exactly what's holding you back and how to fix it.";
        } else {
            motivationTitle.textContent = "Lots of potential! 🚀";
            motivationMessage.textContent = "Your CV needs work, but don't worry! Unlock Pro to get 12+ specific improvements that will boost your score by 30%+.";
        }
    }

    console.log(`✅ Comparison stats updated: ${userScore}% (Top ${percentile}, beats ${beatPercentage})`);
}

// Call this function when match score is available
// This will be triggered by the existing stats update logic
window.updateComparisonStats = updateComparisonStats;

// === SCARCITY TIMER (Urgency + FOMO) ===
function initScarcityTimers() {
    const TIMER_DURATION_MINUTES = 15; // 15 minute countdown
    const STORAGE_KEY = 'scarcity_timer_end';

    // Get or create timer end time
    let timerEnd = localStorage.getItem(STORAGE_KEY);
    if (!timerEnd || new Date(timerEnd) < new Date()) {
        // Timer expired or doesn't exist - create new one
        timerEnd = new Date(Date.now() + TIMER_DURATION_MINUTES * 60 * 1000).toISOString();
        localStorage.setItem(STORAGE_KEY, timerEnd);
    }

    // Update all timer displays
    function updateTimers() {
        const now = new Date();
        const end = new Date(timerEnd);
        const diff = end - now;

        if (diff <= 0) {
            // Timer expired - reset for next session
            const newEnd = new Date(Date.now() + TIMER_DURATION_MINUTES * 60 * 1000).toISOString();
            localStorage.setItem(STORAGE_KEY, newEnd);
            timerEnd = newEnd;
            return updateTimers(); // Restart with new timer
        }

        // Calculate minutes and seconds
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Update sticky bar timer
        const stickyTimer = document.getElementById('sticky-timer');
        if (stickyTimer) {
            stickyTimer.textContent = timeString;
        }

        // Update exit-intent timer
        const countdownTimer = document.getElementById('countdown-timer');
        if (countdownTimer) {
            countdownTimer.textContent = timeString;
        }

        // Add pulsing effect when less than 3 minutes
        if (minutes < 3) {
            if (stickyTimer) stickyTimer.style.animation = 'pulse 1s infinite';
            if (countdownTimer) countdownTimer.style.animation = 'pulse 1s infinite';
        }
    }

    // Update immediately and then every second
    updateTimers();
    setInterval(updateTimers, 1000);

    console.log('✅ Scarcity timers initialized');
}

// Initialize timers
initScarcityTimers();

// Expose functions to global scope for inline onclick handlers
window.closeExitIntent = closeExitIntent;


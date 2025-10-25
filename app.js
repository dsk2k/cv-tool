// Global state
let currentLanguage = localStorage.getItem('language') || 'en';
let outputLanguage = 'en';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initForm();
    initOutputLanguageSelector();
});

// ==================== Language Management ====================

function initLanguage() {
    updateLanguageButtons();
    updateContent();
}

function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updateLanguageButtons();
    updateContent();
}

function updateLanguageButtons() {
    document.querySelectorAll('.language-btn').forEach(btn => {
        if (btn.dataset.lang === currentLanguage) {
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('bg-gray-200', 'text-gray-700');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
}

function updateContent() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const value = getTranslation(key);
        
        if (value) {
            element.textContent = value;
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const value = getTranslation(key);
        
        if (value) {
            element.placeholder = value;
        }
    });

    // Update document language
    document.documentElement.lang = currentLanguage;
}

function getTranslation(key) {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
        value = value?.[k];
    }
    
    return value;
}

// ==================== Output Language Selection ====================

function initOutputLanguageSelector() {
    const outputLangInput = document.getElementById('outputLanguage');
    if (outputLangInput) {
        outputLanguage = outputLangInput.value || 'en';
    }
}

function selectOutputLanguage(lang) {
    outputLanguage = lang;
    
    // Update hidden input
    const outputLangInput = document.getElementById('outputLanguage');
    if (outputLangInput) {
        outputLangInput.value = lang;
    }
    
    // Update UI
    document.querySelectorAll('.language-option').forEach(option => {
        if (option.dataset.lang === lang) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// ==================== Clipboard Functionality ====================

async function pasteFromClipboard(elementId) {
    try {
        const text = await navigator.clipboard.readText();
        const element = document.getElementById(elementId);
        
        if (element && text) {
            element.value = text;
            
            // Show success feedback
            const button = event.target.closest('button');
            if (button) {
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check mr-1"></i> ' + 
                    (currentLanguage === 'nl' ? 'Geplakt!' : 'Pasted!');
                button.classList.add('bg-green-600');
                button.classList.remove('bg-blue-600', 'bg-purple-600');
                
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('bg-green-600');
                    button.classList.add(elementId === 'cvInput' ? 'bg-blue-600' : 'bg-purple-600');
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        alert(currentLanguage === 'nl' 
            ? 'Kon niet plakken vanaf klembord. Probeer handmatig plakken (Ctrl+V).'
            : 'Failed to paste from clipboard. Try pasting manually (Ctrl+V).');
    }
}

// ==================== Form Handling ====================

function initForm() {
    const form = document.getElementById('cvForm');
    if (!form) return;

    form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();

    // Get form values
    const cv = document.getElementById('cvInput').value.trim();
    const jobDescription = document.getElementById('jobInput').value.trim();
    const outputLang = document.getElementById('outputLanguage').value;

    // Validate inputs
    if (!cv || !jobDescription) {
        alert(currentLanguage === 'nl' 
            ? 'Vul alstublieft zowel uw CV als de functiebeschrijving in.'
            : 'Please fill in both your CV and the job description.');
        return;
    }

    if (cv.length < 100) {
        alert(currentLanguage === 'nl' 
            ? 'Uw CV lijkt te kort. Voeg meer informatie toe.'
            : 'Your CV seems too short. Please add more information.');
        return;
    }

    if (jobDescription.length < 50) {
        alert(currentLanguage === 'nl' 
            ? 'De functiebeschrijving lijkt te kort. Voeg meer informatie toe.'
            : 'The job description seems too short. Please add more information.');
        return;
    }

    // Check reCAPTCHA (if enabled)
    const recaptchaResponse = grecaptcha?.getResponse();
    if (recaptchaResponse === undefined || recaptchaResponse === '') {
        // reCAPTCHA not configured or not completed
        // For now, we'll allow submission
        console.warn('reCAPTCHA not configured or not completed');
    }

    // Show loading state
    showLoading(true);

    try {
        // Call the backend API
        const response = await fetch('/.netlify/functions/analyze-cv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cv,
                jobDescription,
                outputLanguage: outputLang,
                recaptchaToken: recaptchaResponse,
                userId: getUserId() // Get or create user ID for usage tracking
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle specific errors
            if (response.status === 403) {
                // Free tier limit reached
                if (confirm(currentLanguage === 'nl'
                    ? 'U heeft uw gratis limiet bereikt. Wilt u upgraden naar een betaald plan?'
                    : 'You have reached your free tier limit. Would you like to upgrade to a paid plan?')) {
                    window.location.href = '/plans.html';
                }
                return;
            }
            
            throw new Error(data.error || 'An error occurred');
        }

        if (!data.success) {
            throw new Error(data.error || 'Failed to generate results');
        }

        // Store results in sessionStorage
        sessionStorage.setItem('cvResults', JSON.stringify(data.data));

        // Redirect to improvements page
        window.location.href = '/improvements.html';

    } catch (error) {
        console.error('Error:', error);
        
        showLoading(false);
        
        alert(currentLanguage === 'nl'
            ? `Er is een fout opgetreden: ${error.message || 'Onbekende fout'}. Probeer het opnieuw.`
            : `An error occurred: ${error.message || 'Unknown error'}. Please try again.`);
        
        // Reset reCAPTCHA if present
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }
    }
}

function showLoading(show) {
    const submitBtn = document.getElementById('submitBtn');
    const loadingState = document.getElementById('loadingState');
    const form = document.getElementById('cvForm');

    if (show) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        loadingState.classList.remove('hidden');
        
        // Scroll to loading indicator
        loadingState.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        loadingState.classList.add('hidden');
    }
}

// ==================== User ID Management ====================

function getUserId() {
    // Get or create a unique user ID for usage tracking
    let userId = localStorage.getItem('userId');
    
    if (!userId) {
        // Generate a simple UUID
        userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    
    return userId;
}

// ==================== Helper Functions ====================

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Update year in footer
const currentYear = new Date().getFullYear();
const yearElements = document.querySelectorAll('.current-year');
yearElements.forEach(el => {
    el.textContent = currentYear;
});

// Analytics tracking (optional - implement your own)
function trackEvent(eventName, eventData) {
    // Implement analytics tracking here
    // Example: Google Analytics, Mixpanel, etc.
    console.log('Event tracked:', eventName, eventData);
}

// Track form submissions
document.getElementById('cvForm')?.addEventListener('submit', () => {
    trackEvent('form_submit', {
        outputLanguage: outputLanguage,
        uiLanguage: currentLanguage
    });
});

// Export functions for use in HTML
window.switchLanguage = switchLanguage;
window.selectOutputLanguage = selectOutputLanguage;
window.pasteFromClipboard = pasteFromClipboard;
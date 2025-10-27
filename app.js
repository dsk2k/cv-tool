// AI CV Tailor - Main Application Logic

// Form submission handler with file upload support
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cvForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const cvFile = document.getElementById('cvFile').files[0];
            const jobDescription = document.getElementById('jobDescription').value.trim();
            const email = document.getElementById('email').value.trim();
            
            // Validate inputs
            if (!cvFile) {
                alert('Please upload your CV');
                return;
            }
            
            if (!jobDescription) {
                alert('Please paste the job description');
                return;
            }
            
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(cvFile.type)) {
                alert('Please upload a PDF, DOC, or DOCX file');
                return;
            }
            
            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (cvFile.size > maxSize) {
                alert('File size must be less than 10MB');
                return;
            }
            
            // Show loading overlay with animated progress steps
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.classList.add('flex');
            
            // Reset all steps
            document.querySelectorAll('.progress-step').forEach((step, index) => {
                step.classList.remove('active', 'completed');
                if (index === 0) step.classList.add('active');
            });
            
            // Animate progress steps
            setTimeout(() => {
                const step1 = document.querySelector('[data-step="1"]');
                if (step1) {
                    step1.classList.add('completed');
                }
                const step2 = document.querySelector('[data-step="2"]');
                if (step2) {
                    step2.classList.add('active');
                    step2.style.opacity = '1';
                }
            }, 2000);
            
            setTimeout(() => {
                const step2 = document.querySelector('[data-step="2"]');
                if (step2) {
                    step2.classList.add('completed');
                }
                const step3 = document.querySelector('[data-step="3"]');
                if (step3) {
                    step3.classList.add('active');
                    step3.style.opacity = '1';
                }
            }, 5000);
            
            try {
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('cvFile', cvFile);
                formData.append('jobDescription', jobDescription);
                if (email) {
                    formData.append('email', email);
                }
                
                // Send to backend
                const response = await fetch('/.netlify/functions/analyze-cv', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                const result = await response.json();
                
                // Store result in sessionStorage
                sessionStorage.setItem('cvAnalysisResult', JSON.stringify(result));
                
                // Redirect to results page
                window.location.href = 'improvements.html';
                
            } catch (error) {
                console.error('Error:', error);
                
                // Hide loading overlay
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('flex');
                
                // Show user-friendly error message
                alert('Sorry, there was an error processing your CV. Please try again or contact support if the problem persists.');
            }
        });
    }
    
    // File input change handler - show file name
    const cvFileInput = document.getElementById('cvFile');
    if (cvFileInput) {
        cvFileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name;
            if (fileName) {
                console.log('Selected file:', fileName);
                // You can add visual feedback here if needed
            }
        });
    }
});

// Smooth scroll helper functions
function scrollToPricing() {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function scrollToForm() {
    const formSection = document.getElementById('upload-form');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Expose functions globally for onclick handlers
window.scrollToPricing = scrollToPricing;
window.scrollToForm = scrollToForm;

// Analytics and tracking (placeholder - replace with your analytics)
function trackEvent(eventName, eventData = {}) {
    console.log('Event:', eventName, eventData);
    
    // Example: Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Example: Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, eventData);
    }
}

// Track page views
document.addEventListener('DOMContentLoaded', () => {
    trackEvent('PageView', {
        page: window.location.pathname
    });
});

// Track pricing plan clicks
document.addEventListener('DOMContentLoaded', () => {
    const pricingButtons = document.querySelectorAll('[data-i18n="plan-free-cta"], [data-i18n="plan-pro-cta"], [data-i18n="plan-enterprise-cta"]');
    
    pricingButtons.forEach(button => {
        button.addEventListener('click', () => {
            const planName = button.closest('.card-hover')?.querySelector('[data-i18n*="plan-"]').getAttribute('data-i18n');
            trackEvent('PricingPlanClick', {
                plan: planName
            });
        });
    });
});

// Track form starts
document.addEventListener('DOMContentLoaded', () => {
    let formStartTracked = false;
    const formInputs = document.querySelectorAll('#cvForm input, #cvForm textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (!formStartTracked) {
                trackEvent('FormStart');
                formStartTracked = true;
            }
        });
    });
});

// Prevent double submission
let isSubmitting = false;
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cvForm');
    if (form) {
        form.addEventListener('submit', () => {
            if (isSubmitting) {
                return false;
            }
            isSubmitting = true;
            
            // Reset after 60 seconds in case of error
            setTimeout(() => {
                isSubmitting = false;
            }, 60000);
        });
    }
});

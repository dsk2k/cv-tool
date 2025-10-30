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
            const language = document.getElementById('language')?.value || 'nl'; // Get language preference

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
            
            // Show loading modal with animated progress
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.classList.add('flex');

            // Reset progress
            const progressBar = document.getElementById('progressBar');
            if (progressBar) progressBar.style.width = '0%';

            // Reset all steps to initial state
            document.querySelectorAll('.progress-step').forEach((step, index) => {
                step.classList.remove('active', 'completed');
                if (index === 0) {
                    // First step starts as active
                    step.classList.add('active');
                    step.style.opacity = '1';
                    step.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)';
                    step.style.border = '1.5px solid rgba(102,126,234,0.2)';
                    step.style.boxShadow = '0 4px 12px rgba(102,126,234,0.08)';
                } else {
                    // Other steps start inactive
                    step.style.opacity = '0.5';
                    step.style.background = 'rgba(243,244,246,0.6)';
                    step.style.border = '1.5px solid rgba(229,231,235,0.8)';
                    step.style.boxShadow = 'none';
                }
            });

            // Step 1 complete (CV extracted)
            setTimeout(() => {
                if (progressBar) progressBar.style.width = '33%';
                const step1 = document.querySelector('[data-step="1"]');
                if (step1) {
                    step1.classList.add('completed');
                    step1.classList.remove('active');
                    const spinner = step1.querySelector('.step-spinner');
                    if (spinner) spinner.textContent = '✅';
                    step1.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.08) 100%)';
                    step1.style.border = '1.5px solid rgba(16,185,129,0.2)';
                    step1.style.boxShadow = '0 4px 12px rgba(16,185,129,0.08)';
                }
            }, 2000);

            // Step 2 active (AI analyzing)
            setTimeout(() => {
                if (progressBar) progressBar.style.width = '66%';
                const step2 = document.querySelector('[data-step="2"]');
                if (step2) {
                    step2.classList.add('active');
                    step2.style.opacity = '1';
                    step2.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)';
                    step2.style.border = '1.5px solid rgba(102,126,234,0.2)';
                    step2.style.boxShadow = '0 4px 12px rgba(102,126,234,0.08)';
                }
            }, 3000);

            // Step 2 complete, Step 3 active (Generating improvements)
            setTimeout(() => {
                if (progressBar) progressBar.style.width = '100%';

                // Complete step 2
                const step2 = document.querySelector('[data-step="2"]');
                if (step2) {
                    step2.classList.add('completed');
                    step2.classList.remove('active');
                    const spinner2 = step2.querySelector('.step-spinner');
                    if (spinner2) spinner2.textContent = '✅';
                    step2.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.08) 100%)';
                    step2.style.border = '1.5px solid rgba(16,185,129,0.2)';
                    step2.style.boxShadow = '0 4px 12px rgba(16,185,129,0.08)';
                }

                // Activate step 3
                const step3 = document.querySelector('[data-step="3"]');
                if (step3) {
                    step3.classList.add('active');
                    step3.style.opacity = '1';
                    step3.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)';
                    step3.style.border = '1.5px solid rgba(102,126,234,0.2)';
                    step3.style.boxShadow = '0 4px 12px rgba(102,126,234,0.08)';
                }
            }, 6000);
            
            try {
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('cv', cvFile);
                formData.append('jobDescription', jobDescription);
                formData.append('language', language);
                if (email) {
                    formData.append('email', email);
                }

                // Track form submission in GA4
                if (window.trackEvent) {
                    window.trackEvent('form_submit', {
                        language: language,
                        has_email: !!email,
                        file_type: cvFile.name.split('.').pop(),
                        file_size_kb: Math.round(cvFile.size / 1024)
                    });
                }

                // Submit job to background queue
                console.log('📤 Submitting CV analysis job...');
                const submitResponse = await fetch('/.netlify/functions/submit-cv-job', {
                    method: 'POST',
                    body: formData
                });

                if (!submitResponse.ok) {
                    throw new Error(`Submit failed: ${submitResponse.status}`);
                }

                const submitResult = await submitResponse.json();
                console.log('✅ Job submitted:', submitResult.jobId);
                console.log('📊 Rate limit:', submitResult.rateLimit);

                // If result is already available (cached), use it immediately
                if (submitResult.status === 'completed' && submitResult.result) {
                    console.log('🎯 Result was cached, using immediately');
                    const dataToStore = JSON.stringify({
                        ...submitResult.result,
                        rateLimit: submitResult.rateLimit
                    });
                    sessionStorage.setItem('cvAnalysisResult', dataToStore);
                    window.location.href = 'improvements.html';
                    return;
                }

                // Poll for job completion
                const jobId = submitResult.jobId;
                let pollCount = 0;
                const maxPolls = 60; // 60 polls x 2 seconds = 2 minutes max

                const pollInterval = setInterval(async () => {
                    pollCount++;
                    console.log(`🔄 Polling job status (attempt ${pollCount})...`);

                    try {
                        const statusResponse = await fetch(`/.netlify/functions/check-job-status?jobId=${jobId}`);

                        if (!statusResponse.ok) {
                            console.error('❌ Status check failed');
                            return;
                        }

                        const statusData = await statusResponse.json();
                        console.log(`📋 Job status: ${statusData.status}`);

                        if (statusData.status === 'completed') {
                            clearInterval(pollInterval);
                            console.log('✅ Job completed!');

                            // Store result
                            const dataToStore = JSON.stringify({
                                ...statusData.result,
                                rateLimit: statusData.rateLimit || submitResult.rateLimit
                            });
                            sessionStorage.setItem('cvAnalysisResult', dataToStore);

                            // Track success
                            if (window.trackEvent) {
                                window.trackEvent('cv_analysis_success', {
                                    language: language,
                                    has_email: !!email,
                                    processing_time: statusData.processingTime
                                });
                            }

                            // Redirect
                            console.log('🚀 Redirecting to improvements.html');
                            window.location.href = 'improvements.html';

                        } else if (statusData.status === 'failed') {
                            clearInterval(pollInterval);
                            throw new Error(statusData.error || 'Job processing failed');

                        } else if (pollCount >= maxPolls) {
                            clearInterval(pollInterval);
                            throw new Error('Job processing timeout - please try again');
                        }

                    } catch (pollError) {
                        clearInterval(pollInterval);
                        console.error('❌ Polling error:', pollError);

                        // Hide loading overlay
                        loadingOverlay.classList.add('hidden');
                        loadingOverlay.classList.remove('flex');

                        alert('Error checking job status. Please try again.');
                    }
                }, 2000); // Poll every 2 seconds
                
            } catch (error) {
                console.error('Error:', error);

                // Hide loading overlay
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('flex');

                // Better error messages based on error type
                let errorMessage = 'Sorry, there was an error processing your CV. Please try again or contact support if the problem persists.';

                if (error.name === 'AbortError') {
                    errorMessage = 'De analyse duurt langer dan verwacht. Dit kan gebeuren bij complexe CV\'s. Probeer het opnieuw of neem contact op met support.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'De analyse duurt langer dan verwacht (>60 sec). Probeer het opnieuw met een kortere CV of job description.';
                }

                // Track error in GA4
                if (window.trackEvent) {
                    window.trackEvent('cv_analysis_error', {
                        error_message: error.message,
                        error_type: error.name,
                        language: language
                    });
                }

                // Show user-friendly error message
                alert(errorMessage);
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

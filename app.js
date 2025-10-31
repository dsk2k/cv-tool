// AI CV Tailor - Main Application Logic

// Helper function to update loading step status (compact design)
function updateStep(stepNumber, status = 'active') {
    // Get current language
    const lang = document.getElementById('language')?.value || 'en';

    const stepLabels = {
        en: [
            'Optimize resume',
            'Cover letter',
            'Recruiter tips',
            'ATS analysis',
            'Impact analysis',
            'Professionalism',
            'Job match'
        ],
        nl: [
            'CV optimaliseren',
            'Motivatiebrief',
            'Recruiter tips',
            'ATS analyse',
            'Impact analyse',
            'Professionaliteit',
            'Job match'
        ]
    };

    const statusLabels = {
        en: {
            generating: 'Generating...',
            completed: 'All steps completed!',
            loading: 'Loading your results...'
        },
        nl: {
            generating: 'Bezig met genereren...',
            completed: 'Alle stappen voltooid!',
            loading: 'Je resultaten worden geladen...'
        }
    };

    const labels = stepLabels[lang];

    // Update mini step indicator
    const miniStep = document.querySelector(`.progress-step-mini[data-step="${stepNumber}"]`);
    if (miniStep) {
        const icon = miniStep.querySelector('.step-icon');
        const number = miniStep.querySelector('span:last-child');

        if (status === 'active') {
            miniStep.style.background = 'white';
            miniStep.style.borderColor = '#667eea';
            miniStep.style.opacity = '1';
            if (icon) icon.textContent = '⏳';
            if (number) number.style.color = '#667eea';
        } else if (status === 'completed') {
            miniStep.style.background = 'rgba(16,185,129,0.1)';
            miniStep.style.borderColor = '#10b981';
            miniStep.style.opacity = '1';
            if (icon) icon.textContent = '✅';
            if (number) number.style.color = '#10b981';
        }
    }

    // Update current step detail box
    if (status === 'active') {
        const detailBox = document.getElementById('currentStepDetail');
        if (detailBox) {
            detailBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 1.5rem;">⏳</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.875rem; color: #1f2937; margin-bottom: 2px;">Step ${stepNumber}: ${labels[stepNumber - 1]}</div>
                        <div style="font-size: 0.75rem; color: #667eea; font-weight: 600;">${statusLabels[lang].generating}</div>
                    </div>
                </div>
            `;
        }
    } else if (status === 'completed') {
        const detailBox = document.getElementById('currentStepDetail');
        if (detailBox && stepNumber === 7) {
            // Show completion message after last step
            detailBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 1.5rem;">✅</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.875rem; color: #10b981; margin-bottom: 2px;">${statusLabels[lang].completed}</div>
                        <div style="font-size: 0.75rem; color: #10b981; font-weight: 600;">${statusLabels[lang].loading}</div>
                    </div>
                </div>
            `;
        }
    }
}

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

            // Initialize quiz immediately
            if (typeof window.initQuiz === 'function') {
                console.log('🎮 Calling initQuiz() directly from app.js');
                setTimeout(() => window.initQuiz(), 100);
            } else {
                console.error('❌ initQuiz function not found on window');
            }

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
                formData.append('cvFile', cvFile);
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

                // Helper function to add delay between requests
                const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

                // Helper function to fetch with retry logic for rate limits
                async function fetchWithRetry(url, options, maxRetries = 3) {
                    for (let i = 0; i < maxRetries; i++) {
                        const response = await fetch(url, options);

                        if (response.ok) {
                            return response;
                        }

                        // If rate limited (429), wait and retry
                        if (response.status === 429 && i < maxRetries - 1) {
                            const waitTime = (i + 1) * 3000; // 3s, 6s, 9s
                            console.log(`⏳ Rate limited, waiting ${waitTime/1000}s before retry ${i + 1}/${maxRetries}...`);
                            await delay(waitTime);
                            continue;
                        }

                        return response;
                    }
                }

                // Sequential generation (4 requests with delays to avoid rate limits)
                const results = {};

                // Step 1: Generate improved CV (~15s)
                console.log('📄 Step 1: Generating improved CV...');
                const cvResponse = await fetchWithRetry('/.netlify/functions/generate-cv', {
                    method: 'POST',
                    body: formData
                });
                if (!cvResponse.ok) throw new Error('CV generation failed');
                const cvData = await cvResponse.json();
                results.improvedCV = cvData.improvedCV;
                const cvText = cvData.originalCVText; // Use backend-parsed text
                console.log('✅ Step 1 complete');
                console.log(`📋 Received cvText length: ${cvText?.length || 0}`);
                updateStep(1, 'completed');
                if (progressBar) progressBar.style.width = '14%';

                // Longer delay to avoid rate limits (we make 7 API calls total)
                await delay(4000);

                // Step 2: Generate cover letter (~10s)
                console.log('✉️ Step 2: Generating cover letter...');
                updateStep(2, 'active');
                console.log(`📤 Sending: cvText length=${cvText?.length || 0}, jobDesc length=${jobDescription?.length || 0}`);
                const letterResponse = await fetchWithRetry('/.netlify/functions/generate-letter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cvText, jobDescription, language })
                });
                if (!letterResponse.ok) {
                    const errorData = await letterResponse.json().catch(() => ({}));
                    console.error('❌ Letter generation failed:', errorData);
                    throw new Error(`Letter generation failed: ${errorData.error || letterResponse.statusText}`);
                }
                const letterData = await letterResponse.json();
                results.coverLetter = letterData.coverLetter;
                console.log('✅ Step 2 complete');
                updateStep(2, 'completed');
                if (progressBar) progressBar.style.width = '28%';

                // Delay before next request
                await delay(4000);

                // Step 3: Generate recruiter tips (~10s)
                console.log('💡 Step 3: Generating recruiter tips...');
                updateStep(3, 'active');
                const tipsResponse = await fetchWithRetry('/.netlify/functions/generate-tips', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jobDescription, language })
                });
                if (!tipsResponse.ok) throw new Error('Tips generation failed');
                const tipsData = await tipsResponse.json();
                results.recruiterTips = tipsData.recruiterTips;
                console.log('✅ Step 3 complete');
                updateStep(3, 'completed');
                if (progressBar) progressBar.style.width = '42%';

                // Step 4: Generate DETAILED changes overview (split into 4 focused analyses)
                console.log('📝 Step 4: Generating detailed changes analysis (4 categories for comprehensive feedback)...');

                // Delay before Step 4a
                await delay(4000);

                // Step 4a: ATS & Keywords analysis
                console.log('🎯 Step 4a: ATS & Keywords...');
                updateStep(4, 'active');
                const atsResponse = await fetchWithRetry('/.netlify/functions/generate-changes-ats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ originalCV: cvText, improvedCV: results.improvedCV, language })
                });
                if (!atsResponse.ok) throw new Error('ATS analysis failed');
                const atsData = await atsResponse.json();
                console.log('✅ Step 4a complete');
                updateStep(4, 'completed');
                if (progressBar) progressBar.style.width = '56%';

                await delay(3000);

                // Step 4b: Impact & Results analysis
                console.log('💥 Step 4b: Impact & Results...');
                updateStep(5, 'active');
                const impactResponse = await fetchWithRetry('/.netlify/functions/generate-changes-impact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ originalCV: cvText, improvedCV: results.improvedCV, language })
                });
                if (!impactResponse.ok) throw new Error('Impact analysis failed');
                const impactData = await impactResponse.json();
                console.log('✅ Step 4b complete');
                updateStep(5, 'completed');
                if (progressBar) progressBar.style.width = '70%';

                await delay(3000);

                // Step 4c: Professional Polish analysis
                console.log('✨ Step 4c: Professional Polish...');
                updateStep(6, 'active');
                const polishResponse = await fetchWithRetry('/.netlify/functions/generate-changes-polish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ originalCV: cvText, improvedCV: results.improvedCV, language })
                });
                if (!polishResponse.ok) throw new Error('Polish analysis failed');
                const polishData = await polishResponse.json();
                console.log('✅ Step 4c complete');
                updateStep(6, 'completed');
                if (progressBar) progressBar.style.width = '85%';

                await delay(3000);

                // Step 4d: Job Match & Targeting analysis
                console.log('🎯 Step 4d: Job Match & Targeting...');
                updateStep(7, 'active');
                const matchResponse = await fetchWithRetry('/.netlify/functions/generate-changes-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ originalCV: cvText, improvedCV: results.improvedCV, jobDescription, language })
                });
                if (!matchResponse.ok) throw new Error('Match analysis failed');
                const matchData = await matchResponse.json();
                console.log('✅ Step 4d complete');
                updateStep(7, 'completed');
                if (progressBar) progressBar.style.width = '100%';

                // Combine all changes into one overview
                results.changesOverview = `${atsData.atsChanges}\n\n${impactData.impactChanges}\n\n${polishData.polishChanges}\n\n${matchData.matchChanges}`;
                console.log('✅ All changes analysis complete!');

                // Store combined results
                results.metadata = { language, timestamp: new Date().toISOString() };
                sessionStorage.setItem('cvAnalysisResult', JSON.stringify(results));

                if (window.trackEvent) {
                    window.trackEvent('cv_analysis_success', {
                        language: language,
                        has_email: !!email
                    });
                }

                console.log('🚀 All steps complete! Redirecting...');
                window.location.href = 'improvements.html';
                
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

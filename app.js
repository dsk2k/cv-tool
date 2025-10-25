// ============================================
// AI CV TAILOR - MAIN APPLICATION
// Complete app.js with fixed form submission
// ============================================

console.log('🚀 AI CV Tailor - Initializing...');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  apiEndpoint: '/.netlify/functions/analyze-cv',
  minCVLength: 50,
  minJobLength: 30,
  defaultLanguage: 'en'
};

// ============================================
// UI LANGUAGE MANAGEMENT
// ============================================

let currentUILanguage = localStorage.getItem('uiLanguage') || 'en';

function setUILanguage(lang) {
  currentUILanguage = lang;
  localStorage.setItem('uiLanguage', lang);
  updateUIText();
  console.log('UI Language set to:', lang);
}

function updateUIText() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[currentUILanguage] && translations[currentUILanguage][key]) {
      element.textContent = translations[currentUILanguage][key];
    }
  });
}

// ============================================
// CLIPBOARD FUNCTIONALITY
// ============================================

function setupClipboardButtons() {
  const pasteButtons = document.querySelectorAll('[data-paste-target]');
  
  pasteButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const targetId = button.getAttribute('data-paste-target');
      const targetElement = document.getElementById(targetId);
      
      if (!targetElement) {
        console.error('Paste target not found:', targetId);
        return;
      }
      
      try {
        const text = await navigator.clipboard.readText();
        targetElement.value = text;
        
        // Show feedback
        const originalText = button.textContent;
        button.textContent = '✓ Pasted!';
        button.disabled = true;
        
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
        }, 2000);
        
        console.log('✅ Pasted', text.length, 'characters to', targetId);
        
      } catch (error) {
        console.error('Clipboard error:', error);
        alert('Could not access clipboard. Please paste manually (Ctrl+V / Cmd+V)');
      }
    });
  });
  
  console.log('✅ Clipboard buttons initialized');
}

// ============================================
// FORM VALIDATION
// ============================================

function validateFormData(currentCV, jobDescription) {
  const errors = [];
  
  if (!currentCV || currentCV.trim().length === 0) {
    errors.push('CV is required');
  } else if (currentCV.trim().length < CONFIG.minCVLength) {
    errors.push(`CV must be at least ${CONFIG.minCVLength} characters (currently ${currentCV.trim().length})`);
  }
  
  if (!jobDescription || jobDescription.trim().length === 0) {
    errors.push('Job description is required');
  } else if (jobDescription.trim().length < CONFIG.minJobLength) {
    errors.push(`Job description must be at least ${CONFIG.minJobLength} characters (currently ${jobDescription.trim().length})`);
  }
  
  return errors;
}

// ============================================
// MAIN FORM SUBMISSION HANDLER
// ============================================

function setupFormHandler() {
  const form = document.getElementById('cvForm') || 
               document.querySelector('form[data-cv-form]') || 
               document.querySelector('form');
  
  if (!form) {
    console.warn('⚠️ Form not found on this page');
    return;
  }
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    console.log('🔍 DEBUG: Form submitted');
    console.log('Form element:', form);
    
    // ============================================
    // STEP 1: GET VALUES FROM FORM FIELDS
    // ============================================
    
    const currentCV = document.getElementById('currentCV')?.value?.trim() || '';
    const jobDescription = document.getElementById('jobDescription')?.value?.trim() || '';
    
    // Try multiple possible language field IDs
    const language = document.getElementById('cvLanguage')?.value || 
                     document.getElementById('language')?.value || 
                     document.getElementById('outputLanguage')?.value ||
                     CONFIG.defaultLanguage;
    
    // ============================================
    // STEP 2: LOG FOR DEBUGGING
    // ============================================
    
    console.log('📝 Current CV:', currentCV ? `${currentCV.substring(0, 100)}... (${currentCV.length} chars)` : 'EMPTY');
    console.log('💼 Job Description:', jobDescription ? `${jobDescription.substring(0, 100)}... (${jobDescription.length} chars)` : 'EMPTY');
    console.log('🌍 Language:', language);
    console.log('📊 Data lengths:', {
      cv: currentCV.length,
      job: jobDescription.length
    });
    
    // ============================================
    // STEP 3: VALIDATE INPUT
    // ============================================
    
    const validationErrors = validateFormData(currentCV, jobDescription);
    
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('\n');
      console.error('❌ Validation failed:', validationErrors);
      alert('Please fix these issues:\n\n' + errorMessage);
      return;
    }
    
    console.log('✅ Validation passed');
    
    // ============================================
    // STEP 4: PREPARE REQUEST BODY
    // ============================================
    
    const requestBody = {
      currentCV: currentCV,
      jobDescription: jobDescription,
      language: language
    };
    
    console.log('📦 Request body prepared:', {
      cvLength: requestBody.currentCV.length,
      jobLength: requestBody.jobDescription.length,
      language: requestBody.language
    });
    
    // ============================================
    // STEP 5: SHOW LOADING STATE
    // ============================================
    
    const submitButton = form.querySelector('button[type="submit"]') || 
                        form.querySelector('button.submit-btn') ||
                        form.querySelector('button');
    
    const originalButtonText = submitButton?.textContent || 'Submit';
    const loadingText = currentUILanguage === 'nl' ? '⏳ Verwerken...' : '⏳ Processing...';
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = loadingText;
      submitButton.style.cursor = 'wait';
    }
    
    // Disable form inputs
    const formInputs = form.querySelectorAll('input, textarea, select, button');
    formInputs.forEach(input => input.disabled = true);
    
    // Show loading overlay if it exists
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    try {
      console.log('🚀 Sending request to:', CONFIG.apiEndpoint);
      
      // ============================================
      // STEP 6: CALL API
      // ============================================
      
      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // ============================================
      // STEP 7: HANDLE RESPONSE
      // ============================================
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}` 
          };
        }
        
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.error || errorData.message || `API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('✅ Success! Data received:', {
        hasCV: !!data.improvedCV,
        cvLength: data.improvedCV?.length || 0,
        hasCover: !!data.coverLetter,
        coverLength: data.coverLetter?.length || 0,
        hasTips: !!data.recruiterTips,
        tipsLength: data.recruiterTips?.length || 0,
        hasChanges: !!data.changesOverview,
        changesLength: data.changesOverview?.length || 0,
        metadata: data.metadata
      });
      
      // Validate response data
      if (!data.improvedCV || !data.coverLetter || !data.recruiterTips) {
        console.warn('⚠️ Some response fields are missing');
      }
      
      // ============================================
      // STEP 8: SAVE TO SESSION STORAGE
      // ============================================
      
      try {
        sessionStorage.setItem('cvResults', JSON.stringify(data));
        console.log('💾 Results saved to sessionStorage');
        
        // Verify it was saved
        const saved = sessionStorage.getItem('cvResults');
        if (!saved) {
          throw new Error('Data was not saved to sessionStorage');
        }
        console.log('✅ Verified: Data saved successfully');
        
      } catch (storageError) {
        console.error('⚠️ sessionStorage Error:', storageError);
        
        // Try localStorage as backup
        try {
          localStorage.setItem('cvResults', JSON.stringify(data));
          console.log('💾 Saved to localStorage as backup');
        } catch (e) {
          console.error('❌ Could not save to any storage');
        }
      }
      
      // ============================================
      // STEP 9: REDIRECT TO RESULTS PAGE
      // ============================================
      
      console.log('➡️ Redirecting to improvements.html');
      
      // Small delay to ensure storage is written
      setTimeout(() => {
        window.location.href = 'improvements.html';
      }, 100);
      
    } catch (error) {
      // ============================================
      // ERROR HANDLING
      // ============================================
      
      console.error('❌ Error during submission:', error);
      console.error('Error stack:', error.stack);
      
      // Show user-friendly error message
      const errorMessage = currentUILanguage === 'nl' 
        ? `Er is een fout opgetreden: ${error.message}\n\nProbeer het opnieuw of neem contact op met support als het probleem aanhoudt.`
        : `An error occurred: ${error.message}\n\nPlease try again or contact support if the problem persists.`;
      
      alert(errorMessage);
      
      // Reset button and form
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        submitButton.style.cursor = 'pointer';
      }
      
      // Re-enable form inputs
      formInputs.forEach(input => input.disabled = false);
      
      // Hide loading overlay
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }
  });
  
  console.log('✅ Form handler attached successfully');
}

// ============================================
// CHARACTER COUNTER
// ============================================

function setupCharacterCounters() {
  const textareas = document.querySelectorAll('textarea[data-counter]');
  
  textareas.forEach(textarea => {
    const counterId = textarea.getAttribute('data-counter');
    const counter = document.getElementById(counterId);
    
    if (!counter) return;
    
    const updateCounter = () => {
      const length = textarea.value.length;
      counter.textContent = length.toLocaleString();
      
      // Color coding
      const minLength = parseInt(textarea.getAttribute('data-min-length')) || 0;
      if (length < minLength) {
        counter.style.color = '#ff6b6b';
      } else {
        counter.style.color = '#28a745';
      }
    };
    
    textarea.addEventListener('input', updateCounter);
    updateCounter(); // Initial count
  });
  
  console.log('✅ Character counters initialized');
}

// ============================================
// LANGUAGE SWITCHER
// ============================================

function setupLanguageSwitcher() {
  const languageButtons = document.querySelectorAll('[data-language]');
  
  languageButtons.forEach(button => {
    button.addEventListener('click', () => {
      const lang = button.getAttribute('data-language');
      setUILanguage(lang);
      
      // Update active state
      languageButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });
  
  // Set initial active state
  const activeButton = document.querySelector(`[data-language="${currentUILanguage}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
  
  console.log('✅ Language switcher initialized');
}

// ============================================
// FORM FIELD CHECKS (DEBUGGING)
// ============================================

function checkFormFields() {
  console.log('🔍 Form Fields Check:');
  
  const cvField = document.getElementById('currentCV');
  const jobField = document.getElementById('jobDescription');
  const langField = document.getElementById('cvLanguage') || 
                    document.getElementById('language') ||
                    document.getElementById('outputLanguage');
  
  console.log('  CV field:', cvField ? '✅ Found' : '❌ Not found', cvField);
  console.log('  Job field:', jobField ? '✅ Found' : '❌ Not found', jobField);
  console.log('  Language field:', langField ? '✅ Found' : '❌ Not found', langField);
  
  if (cvField) {
    console.log('    CV field ID:', cvField.id);
    console.log('    CV field type:', cvField.tagName);
  }
  
  if (jobField) {
    console.log('    Job field ID:', jobField.id);
    console.log('    Job field type:', jobField.tagName);
  }
  
  const forms = document.querySelectorAll('form');
  console.log('  Forms found:', forms.length);
  forms.forEach((form, index) => {
    console.log(`    Form ${index + 1}:`, form.id || '(no ID)', form);
  });
}

// ============================================
// SMOOTH SCROLLING
// ============================================

function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ============================================
// AUTOSAVE TO LOCAL STORAGE (DRAFT)
// ============================================

function setupAutosave() {
  const cvField = document.getElementById('currentCV');
  const jobField = document.getElementById('jobDescription');
  
  if (!cvField || !jobField) return;
  
  // Load saved drafts
  const savedCV = localStorage.getItem('draft_cv');
  const savedJob = localStorage.getItem('draft_job');
  
  if (savedCV && cvField.value === '') {
    cvField.value = savedCV;
    console.log('📝 Loaded CV draft');
  }
  
  if (savedJob && jobField.value === '') {
    jobField.value = savedJob;
    console.log('📝 Loaded job description draft');
  }
  
  // Save on input (debounced)
  let saveTimeout;
  const saveDebounced = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      localStorage.setItem('draft_cv', cvField.value);
      localStorage.setItem('draft_job', jobField.value);
      console.log('💾 Draft auto-saved');
    }, 2000); // Save after 2 seconds of no typing
  };
  
  cvField.addEventListener('input', saveDebounced);
  jobField.addEventListener('input', saveDebounced);
  
  console.log('✅ Autosave initialized');
}

// ============================================
// CLEAR DRAFT BUTTON
// ============================================

function setupClearDraft() {
  const clearButtons = document.querySelectorAll('[data-clear-draft]');
  
  clearButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (confirm('Clear all saved drafts?')) {
        localStorage.removeItem('draft_cv');
        localStorage.removeItem('draft_job');
        
        const cvField = document.getElementById('currentCV');
        const jobField = document.getElementById('jobDescription');
        
        if (cvField) cvField.value = '';
        if (jobField) jobField.value = '';
        
        console.log('🗑️ Drafts cleared');
      }
    });
  });
}

// ============================================
// SAMPLE DATA LOADER (FOR TESTING)
// ============================================

function setupSampleDataLoader() {
  const sampleButton = document.querySelector('[data-load-sample]');
  
  if (sampleButton) {
    sampleButton.addEventListener('click', () => {
      const cvField = document.getElementById('currentCV');
      const jobField = document.getElementById('jobDescription');
      
      if (cvField) {
        cvField.value = `John Doe
Software Developer

Experience:
- Worked on various projects
- Used JavaScript and Python
- Team collaboration

Skills:
JavaScript, Python, HTML, CSS

Education:
Bachelor in Computer Science, 2020`;
      }
      
      if (jobField) {
        jobField.value = `We are looking for a Senior Full-Stack Developer with 5+ years of experience in React, Node.js, and TypeScript. Must have proven track record of building scalable applications.`;
      }
      
      console.log('📝 Sample data loaded');
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
  console.log('🎬 Initializing AI CV Tailor...');
  
  // Check if we're on the main page or results page
  const isMainPage = document.getElementById('currentCV') !== null;
  const isResultsPage = document.getElementById('cv-content') !== null;
  
  console.log('Page type:', {
    isMainPage,
    isResultsPage
  });
  
  if (isMainPage) {
    // Main page initialization
    setupFormHandler();
    setupClipboardButtons();
    setupCharacterCounters();
    setupLanguageSwitcher();
    setupSmoothScrolling();
    setupAutosave();
    setupClearDraft();
    setupSampleDataLoader();
    checkFormFields();
  }
  
  if (isResultsPage) {
    // Results page initialization
    console.log('Results page detected');
    updateUIText();
  }
  
  // Common initialization
  updateUIText();
  
  console.log('✅ AI CV Tailor initialized successfully');
}

// ============================================
// RUN ON PAGE LOAD
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================
// EXPORT FOR TESTING
// ============================================

window.CVTailor = {
  init,
  setUILanguage,
  validateFormData,
  config: CONFIG
};

console.log('📦 App.js loaded successfully');

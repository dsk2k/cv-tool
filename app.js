/**
 * Globale variabelen en initialisatie
 */
let currentStep = 1;
const totalSteps = 3;
const steps = document.querySelectorAll('.form-step');
const stepIndicators = document.querySelectorAll('.step-item');
const progressLine = document.getElementById('progress-line');
let currentLanguage = 'en'; // Default taal

// Element Referenties (om null checks te vermijden)
const cvForm = document.getElementById('cvForm');
const submitBtn = document.getElementById('submitBtn');
const loadingState = document.getElementById('loadingState');
const cvInput = document.getElementById('cvInput');
const jobInput = document.getElementById('jobInput');
const outputLanguageInput = document.getElementById('outputLanguage');
const cvFileInput = document.getElementById('cvFile');
const jobScreenshotInput = document.getElementById('jobScreenshot');
const ocrStatusElement = document.getElementById('ocrStatus');

/**
 * Functies voor Multi-Step Formulier Navigatie en Validatie
 */
function updateStepIndicator() {
    stepIndicators.forEach((indicator, index) => {
        const stepNum = index + 1;
        indicator.classList.remove('active', 'completed');
        if (stepNum < currentStep) {
            indicator.classList.add('completed');
        } else if (stepNum === currentStep) {
            indicator.classList.add('active');
        }
    });
    // Update voortgangsbalk
    if (progressLine) {
        // Bereken percentage: Start op 15%, 50% bij stap 2, 85% bij stap 3
        const progressPercentage = (currentStep - 1) * (100 / (totalSteps -1) * 0.70 / 2) * 2 + 15; // Geeft 15%, 50%, 85%
        progressLine.style.width = `${Math.min(100, progressPercentage)}%`;
    }
}


function showStep(stepNum) {
    if (stepNum < 1 || stepNum > totalSteps) return;
    currentStep = stepNum;
    steps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === currentStep);
    });
    updateStepIndicator();
    // Scroll naar bovenkant formulier
    const formElement = document.getElementById('form');
    if (formElement) {
        // Gebruik scrollIntoView voor betere compatibiliteit
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function validateStep(stepNum) {
    const currentStepElement = document.getElementById(`step-${stepNum}`);
    if (!currentStepElement) return false;

    let isValid = true;
    // Selecteer alleen 'required' inputs die niet 'disabled' zijn binnen de huidige stap
    const requiredInputs = currentStepElement.querySelectorAll('[required]:not(:disabled)');

    requiredInputs.forEach(input => {
        const parentPanel = input.closest('.tab-panel');
        // Controleer of de input zichtbaar is (niet in een verborgen tab)
        const isVisible = !parentPanel || !parentPanel.classList.contains('hidden');

        // Reset error state
        input.classList.remove('border-red-500');
        input.classList.add('border-gray-300');

        // Valideer alleen als zichtbaar
        if (isVisible && (!input.value || !input.value.trim())) {
            isValid = false;
            input.classList.add('border-red-500');
            input.classList.remove('border-gray-300');
            // Verwijder rode rand zodra gebruiker begint te typen
            input.addEventListener('input', () => {
                 input.classList.remove('border-red-500');
                 input.classList.add('border-gray-300');
                 // Re-valideer direct om 'Next' knop eventueel te enablen
                 validateStep(stepNum);
            }, { once: true });
        }
    });

    // Update de status van de 'Next' knop voor deze stap
    const nextButton = document.getElementById(`nextBtn-${stepNum}`);
    if (nextButton) {
        nextButton.disabled = !isValid;
    }
    return isValid;
}


function nextStep() {
    if (validateStep(currentStep)) {
        showStep(currentStep + 1);
        // Valideer de nieuwe stap direct (voor het geval deze al ingevuld was)
        validateStep(currentStep);
    } else {
         // Geef een melding als de huidige stap niet valide is
         alert(getTranslation('error.fillFields', currentLanguage) || 'Please fill in all required fields for this step.');
    }
}

function prevStep() {
    showStep(currentStep - 1);
    // Valideer de (nu vorige) stap opnieuw (belangrijk voor 'Next' knop status)
     validateStep(currentStep);
}

// Initial setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Toon de eerste stap en initialiseer validatie
    showStep(1);
    validateStep(1);
    validateStep(2); // Valideer ook stap 2 voor het geval de pagina herlaadt

    // Voeg listeners toe om stappen te valideren bij typen
    if (cvInput) cvInput.addEventListener('input', () => validateStep(1));
    if (jobInput) jobInput.addEventListener('input', () => validateStep(2));

     // Stel de taal in en vertaal de pagina
    currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
    if (typeof translations !== 'undefined') {
        translatePage();
        updateLanguageButtons();
    } else {
        console.error('translations.js not loaded or defined. Cannot translate page.');
        // Overweeg een fallback of foutmelding
    }
});


/**
 * Functies voor Tabs
 */
function switchTab(event, type) {
    const clickedTab = event.currentTarget;
    const tabId = clickedTab.dataset.tab;

    // Update tab knop stijlen
    document.querySelectorAll(`.${type}-tab`).forEach(tab => tab.classList.remove('active'));
    clickedTab.classList.add('active');

    // Toon/verberg panelen
    document.querySelectorAll(`.${type}-panel`).forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== tabId);
    });

    // Update 'required' status dynamisch
    // Alleen het tekstveld in de *zichtbare* tab moet vereist zijn
    if (type === 'cv' && cvInput) {
        cvInput.required = (tabId === 'cv-paste');
    } else if (type === 'job' && jobInput) {
        jobInput.required = (tabId === 'job-paste');
    }

    // Re-valideer de huidige stap na het wisselen van tab
    validateStep(currentStep);
}

/**
 * PDF Parser Logica
 */
if (cvFileInput && cvInput) {
    cvFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        const nextButton1 = document.getElementById('nextBtn-1');
        if (nextButton1) nextButton1.disabled = true; // Schakel 'Next' uit tijdens verwerking

        // Validatie: Type
        if (!file || file.type !== 'application/pdf') {
            alert(getTranslation('error.pdfOnly', currentLanguage) || 'Please select a PDF file.');
            event.target.value = null; // Reset input
            if (nextButton1) nextButton1.disabled = !validateStep(1); // Herstel knop status
            return;
        }

        // Validatie: Grootte
        const MAX_PDF_SIZE_MB = 5;
        const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
        if (file.size > MAX_PDF_SIZE_BYTES) {
            alert((getTranslation('error.fileTooLarge', currentLanguage) || `File is too large (Max ${MAX_PDF_SIZE_MB}MB).`).replace('${maxSize}', MAX_PDF_SIZE_MB));
            event.target.value = null;
            if (nextButton1) nextButton1.disabled = !validateStep(1);
            return;
        }

        // Lees bestand
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            cvInput.value = getTranslation('form.pdfReading', currentLanguage) || 'Reading PDF... one moment.';

            // Verwerk met pdf.js
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                let pagePromises = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    pagePromises.push(
                        pdf.getPage(i).then(page =>
                            page.getTextContent().then(textContent =>
                                textContent.items.map(item => item.str).join(' ') // Tekst per pagina
                            )
                        )
                    );
                }
                return Promise.all(pagePromises); // Wacht op alle pagina's
            }).then(pagesText => {
                cvInput.value = pagesText.join('\n\n'); // Voeg samen met witregel
                document.querySelector('.cv-tab[data-tab="cv-paste"]')?.click(); // Switch naar plak-tab
                validateStep(1); // Re-valideer
            }).catch(error => {
                console.error('Error reading PDF:', error);
                cvInput.value = getTranslation('form.pdfError', currentLanguage) || 'Error reading PDF. Please try pasting the text manually.';
                validateStep(1); // Re-valideer
            }).finally(() => {
                // Herstel 'Next' knop status gebaseerd op validatie
                if (nextButton1) nextButton1.disabled = !validateStep(1);
            });
        };
        fileReader.readAsArrayBuffer(file);
    });
} else {
    console.warn("CV file input ('cvFile') or textarea ('cvInput') not found in the DOM.");
}

/**
 * OCR Logica voor Screenshots
 */
if (jobScreenshotInput && jobInput && ocrStatusElement) {
    jobScreenshotInput.addEventListener('change', async function(event) {
        const file = event.target.files[0];
        const nextButton2 = document.getElementById('nextBtn-2');
        if (nextButton2) nextButton2.disabled = true; // Schakel 'Next' uit

        // Reset status
        ocrStatusElement.textContent = '';
        ocrStatusElement.style.opacity = '0';
        ocrStatusElement.classList.remove('text-red-600', 'text-green-600');

        // Validatie: Type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];
        if (!file || !allowedTypes.includes(file.type)) {
            ocrStatusElement.textContent = getTranslation('error.imageOnly', currentLanguage) || 'Please select an image file (PNG, JPG, WEBP, BMP).';
            ocrStatusElement.style.opacity = '1'; ocrStatusElement.classList.add('text-red-600');
            event.target.value = null;
            if (nextButton2) nextButton2.disabled = !validateStep(2); // Herstel knop status
            return;
        }

        // Validatie: Grootte
        const MAX_IMG_SIZE_MB = 5;
        const MAX_IMG_SIZE_BYTES = MAX_IMG_SIZE_MB * 1024 * 1024;
        if (file.size > MAX_IMG_SIZE_BYTES) {
            ocrStatusElement.textContent = (getTranslation('error.fileTooLarge', currentLanguage) || `File is too large (Max ${MAX_IMG_SIZE_MB}MB).`).replace('${maxSize}', MAX_IMG_SIZE_MB);
            ocrStatusElement.style.opacity = '1'; ocrStatusElement.classList.add('text-red-600');
            event.target.value = null;
            if (nextButton2) nextButton2.disabled = !validateStep(2);
            return;
        }

        if (typeof Tesseract === 'undefined') {
             ocrStatusElement.textContent = getTranslation('error.ocrLoad', currentLanguage) || 'OCR library could not be loaded. Please refresh the page.';
             ocrStatusElement.style.opacity = '1'; ocrStatusElement.classList.add('text-red-600');
             if (nextButton2) nextButton2.disabled = !validateStep(2);
             return;
        }

        ocrStatusElement.textContent = getTranslation('form.ocrProcessing', currentLanguage) || 'Reading screenshot with OCR... This may take a moment.';
        ocrStatusElement.style.opacity = '1';

        try {
            const { data: { text } } = await Tesseract.recognize(file, 'eng+nld', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        ocrStatusElement.textContent = `${getTranslation('form.ocrProgress', currentLanguage) || 'Recognizing text'}... (${Math.round(m.progress * 100)}%)`;
                    } else if (m.status === 'loading language traineddata') {
                        ocrStatusElement.textContent = getTranslation('form.ocrLoadingLang', currentLanguage) || 'Loading language data...';
                    } else if (m.progress === 0 && m.status !== 'initializing tesseract') { // Show other statuses before recognition starts
                        ocrStatusElement.textContent = `${m.status}...`;
                    }
                }
            });

            jobInput.value = text;
            ocrStatusElement.textContent = getTranslation('form.ocrSuccess', currentLanguage) || 'Text successfully extracted!';
            ocrStatusElement.classList.add('text-green-600');
            ocrStatusElement.style.opacity = '1';
            setTimeout(() => { ocrStatusElement.style.opacity = '0'; }, 5000);

            document.querySelector('.job-tab[data-tab="job-paste"]')?.click(); // Switch back
            event.target.value = null;
            validateStep(2); // Re-validate step 2

        } catch (error) {
            console.error('OCR Error:', error);
            ocrStatusElement.textContent = getTranslation('form.ocrError', currentLanguage) || 'Error reading image. Please paste manually.';
            ocrStatusElement.style.opacity = '1'; ocrStatusElement.classList.add('text-red-600');
            event.target.value = null;
            validateStep(2); // Re-validate step 2

        } finally {
            // Herstel 'Next' knop status gebaseerd op validatie
            if (nextButton2) nextButton2.disabled = !validateStep(2);
        }
    });
} else {
    console.warn("Job screenshot input ('jobScreenshot') or textarea ('jobInput') not found in the DOM.");
}


// ----------------------------------------------------
// OVERIGE FUNCTIES EN EVENT LISTENERS
// ----------------------------------------------------

function pasteFromClipboard(targetId) {
     const targetElement = document.getElementById(targetId);
     if (!targetElement) return;

    if (!navigator.clipboard || !navigator.clipboard.readText) {
        try {
            targetElement.focus();
            const successful = document.execCommand('paste');
            if (!successful) { throw new Error('execCommand failed'); }
             // Trigger validation after paste
            if (targetId === 'cvInput') validateStep(1); else if (targetId === 'jobInput') validateStep(2);
        } catch (fallbackErr) {
            console.error('Fallback paste failed:', fallbackErr);
            alert(getTranslation('error.pasteUnsupported', currentLanguage) || 'Pasting failed. Please paste manually.');
        }
        return;
    }
    navigator.clipboard.readText()
        .then(text => {
            targetElement.value = text;
            // Trigger validation after paste
            if (targetId === 'cvInput') validateStep(1); else if (targetId === 'jobInput') validateStep(2);
        })
        .catch(err => {
            console.error('Failed to read clipboard contents: ', err);
            alert(getTranslation('error.paste', currentLanguage) || 'Could not paste from clipboard. Please paste manually.');
        });
}

function selectOutputLanguage(lang) {
    document.querySelectorAll('.language-option').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.lang === lang) el.classList.add('active');
    });
    if (outputLanguageInput) outputLanguageInput.value = lang;
}

// Event listener voor het hoofdformulier SUBMIT (alleen op stap 3)
if (cvForm && submitBtn && loadingState && cvInput && jobInput && outputLanguageInput) {
    cvForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        if (currentStep !== totalSteps) { console.warn("Submit on wrong step"); return; }
        if (!validateStep(currentStep)) { alert(getTranslation('error.fillFields', currentLanguage) || 'Please complete step 3.'); return; }

        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) { alert(getTranslation('error.recaptcha', currentLanguage) || 'Please complete the reCAPTCHA'); return; }

        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if(currentStepElement) currentStepElement.style.display = 'none';
        loadingState.classList.remove('hidden');
        submitBtn.disabled = true;

        // --- Store original inputs for results page ---
        const originalCV = cvInput.value;
        const originalJobDesc = jobInput.value;
        try {
             localStorage.setItem('originalCV', originalCV);
             localStorage.setItem('originalJobDesc', originalJobDesc);
        } catch (e) {
             console.error('localStorage Error (Original Data):', e);
             alert(getTranslation('error.storage', currentLanguage) || 'Error saving data locally. Check browser settings.');
        }
        // --- End store original inputs ---

        const payload = {
            cv: originalCV,
            jobDescription: originalJobDesc,
            outputLanguage: outputLanguageInput.value,
            recaptchaToken: recaptchaResponse
            // userId: userId, // Add if needed
        };

        try {
            const response = await fetch('/.netlify/functions/analyze-cv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
                console.error('API Error Response:', errorData);
                throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                // Sla resultaten op
                try {
                    sessionStorage.setItem('cvResults', JSON.stringify(result.data));
                    window.location.href = '/improvements.html'; // Redirect to new page
                    return;
                } catch (e) {
                    // CRITICAL: Fail here if results cannot be stored
                    console.error('sessionStorage Error (Results): Could not save CV results.', e);
                    throw new Error(getTranslation('error.storageResults', currentLanguage) || 'Could not save results locally. Please try again.');
                }

            } else {
                 console.error('API Success Response but invalid data:', result);
                throw new Error(result.error || getTranslation('error.apiGeneric', currentLanguage) || 'Failed to get valid results from API');
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            alert(`${getTranslation('error.apiSubmit', currentLanguage) || 'An error occurred:'} ${error.message}`);
             if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }

        } finally {
             // Zorg ervoor dat de loading state altijd wordt verborgen en de knop weer wordt ingeschakeld
             loadingState.classList.add('hidden');
             submitBtn.disabled = false;
             if (currentStepElement) currentStepElement.style.display = 'block';
        }
    });
} else {
    console.error('One or more essential form elements missing or initialized incorrectly.');
}


// ----------------------------------------------------
// TAALWISSEL-LOGICA (Gekopieerd uit index.html)
// ----------------------------------------------------
// (Functies voor switchLanguage, updateLanguageButtons, translatePage, getTranslation)
// Deze functies zijn afhankelijk van translations.js en moeten compleet zijn in de app.js
// Zorg ervoor dat je alle bestaande code voor deze functies uit je oude app.js hieronder plakt.

function getTranslation(key, lang = currentLanguage) {
    if (typeof translations === 'undefined' || !translations[lang]) {
         lang = 'en';
         if (typeof translations === 'undefined' || !translations[lang]) { return key; }
    }
    const keys = key.split('.');
    let result = translations[lang];
    try {
        for (const k of keys) {
            if (result === undefined) return key;
            result = result[k];
        }
         if (result === undefined || result === null || result === '') {
             if (lang !== 'en' && translations['en']) {
                 let fallbackResult = translations['en'];
                  for (const k of keys) { if (fallbackResult === undefined) return key; fallbackResult = fallbackResult[k]; }
                  return fallbackResult || key;
             }
             return key;
         }
        return result;
    } catch (e) {
        return key;
    }
}

function switchLanguage(lang) {
    if (typeof translations !== 'undefined' && translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
        translatePage();
        updateLanguageButtons();
    } else {
        console.warn(`Language '${lang}' not found.`);
    }
}

function updateLanguageButtons() {
    document.querySelectorAll('.language-btn').forEach(btn => {
        const isActive = btn.dataset.lang === currentLanguage;
        btn.classList.toggle('bg-blue-100', isActive);
        btn.classList.toggle('text-blue-700', isActive);
        btn.classList.toggle('font-semibold', isActive);
        btn.classList.toggle('text-gray-600', !isActive);
    });
}

function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = getTranslation(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = getTranslation(el.dataset.i18nPlaceholder);
    });
    document.documentElement.lang = currentLanguage;
}


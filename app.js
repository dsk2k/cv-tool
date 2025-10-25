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

        // Controleer of Tesseract geladen is
        if (typeof Tesseract === 'undefined') {
            ocrStatusElement.textContent = getTranslation('error.ocrLoad', currentLanguage) || 'OCR library could not be loaded. Please refresh the page.';
            ocrStatusElement.style.opacity = '1'; ocrStatusElement.classList.add('text-red-600');
            if (nextButton2) nextButton2.disabled = !validateStep(2);
            return;
        }

        // Start OCR
        ocrStatusElement.textContent = getTranslation('form.ocrProcessing', currentLanguage) || 'Reading screenshot with OCR... This may take a moment.';
        ocrStatusElement.style.opacity = '1';

        try {
            // Voer OCR uit met Engels en Nederlands
            const { data: { text } } = await Tesseract.recognize(file, 'eng+nld', { // Added Dutch
                logger: m => { // Update de status voor de gebruiker
                    if (m.status === 'recognizing text') {
                        ocrStatusElement.textContent = `${getTranslation('form.ocrProgress', currentLanguage) || 'Recognizing text'}... (${Math.round(m.progress * 100)}%)`;
                    } else if (m.status === 'loading language traineddata') {
                        ocrStatusElement.textContent = getTranslation('form.ocrLoadingLang', currentLanguage) || 'Loading language data...';
                    } else if (m.progress === 0 && m.status !== 'initializing tesseract') {
                        // Show other statuses like 'initializing api', 'initialized api'
                        ocrStatusElement.textContent = `${m.status}...`;
                    }
                }
            });

            // Plaats resultaat in textarea
            jobInput.value = text;
            ocrStatusElement.textContent = getTranslation('form.ocrSuccess', currentLanguage) || 'Text successfully extracted!';
            ocrStatusElement.classList.add('text-green-600');
            ocrStatusElement.style.opacity = '1';
            // Fade out success message after 5 seconds
            setTimeout(() => { ocrStatusElement.style.opacity = '0'; }, 5000);

            document.querySelector('.job-tab[data-tab="job-paste"]')?.click(); // Switch terug naar plak-tab
            event.target.value = null; // Reset file input
            validateStep(2); // Re-valideer de stap

        } catch (error) {
            console.error('OCR Error:', error);
            ocrStatusElement.textContent = getTranslation('form.ocrError', currentLanguage) || 'Error reading image. Please paste manually.';
            ocrStatusElement.style.opacity = '1'; ocrStatusElement.classList.add('text-red-600');
            event.target.value = null;
            validateStep(2); // Re-valideer de stap zelfs bij een fout

        } finally {
            // Herstel 'Next' knop status
            if (nextButton2) nextButton2.disabled = !validateStep(2);
        }
    });
} else {
    console.warn("Job screenshot input ('jobScreenshot'), textarea ('jobInput'), or OCR status element ('ocrStatus') not found.");
}

/**
 * Hulpfunctie: Plakken van Klembord met Fallback
 */
function pasteFromClipboard(targetId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
        console.error("Target element for pasting not found:", targetId);
        return;
    }

    // Probeer moderne Clipboard API (vereist HTTPS of localhost)
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
            .then(text => {
                targetElement.value = text;
                // Trigger validatie na succesvol plakken
                if (targetId === 'cvInput') validateStep(1);
                else if (targetId === 'jobInput') validateStep(2);
            })
            .catch(err => {
                console.warn('navigator.clipboard.readText failed:', err);
                // Probeer fallback alleen als moderne API faalt (bv. geen permissie)
                fallbackPaste(targetElement, targetId);
            });
    } else {
        // Gebruik direct fallback als moderne API niet ondersteund wordt
        console.warn('navigator.clipboard.readText not supported, using fallback.');
        fallbackPaste(targetElement, targetId);
    }
}

// Fallback Plakfunctie (minder betrouwbaar, gebruikt verouderde methode)
function fallbackPaste(targetElement, targetId) {
    try {
        targetElement.focus(); // Element moet focus hebben
        // execCommand is verouderd, maar nodig voor fallback
        if (!document.execCommand('paste')) {
            throw new Error('document.execCommand("paste") returned false.');
        }
        // Wacht even tot de browser de plak-actie verwerkt heeft
        setTimeout(() => {
            if (targetId === 'cvInput') validateStep(1);
            else if (targetId === 'jobInput') validateStep(2);
        }, 10); // Kleine vertraging
    } catch (fallbackErr) {
        console.error('Fallback paste method failed:', fallbackErr);
        alert(getTranslation('error.pasteUnsupported', currentLanguage) || 'Automatic pasting failed. Please paste manually (Ctrl+V or Cmd+V).');
    }
}

/**
 * Hulpfunctie: Selecteer Output Taal
 */
function selectOutputLanguage(lang) {
    // Update knop stijlen
    document.querySelectorAll('.language-option').forEach(el => {
        el.classList.toggle('active', el.dataset.lang === lang);
    });
    // Update verborgen input waarde
    if (outputLanguageInput) outputLanguageInput.value = lang;
}

/**
 * Event Listener voor Formulier Submit (Stap 3)
 */
if (cvForm && submitBtn && loadingState && cvInput && jobInput && outputLanguageInput) {
    cvForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Voorkom standaard formulierinzending

        // Controleer of we op de laatste stap zijn
        if (currentStep !== totalSteps) {
            console.warn("Submit triggered on incorrect step:", currentStep);
            return; // Doe niets als niet op de laatste stap
        }
        // Valideer de laatste stap (taalkeuze is altijd geldig, check reCAPTCHA hieronder)
        // Optioneel: valideer GDPR checkbox als die toegevoegd is

        // Controleer reCAPTCHA response
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            alert(getTranslation('error.recaptcha', currentLanguage) || 'Please complete the reCAPTCHA challenge before submitting.');
            return;
        }

        // Toon laadstatus, verberg huidige stap
        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if (currentStepElement) currentStepElement.style.display = 'none';
        if (loadingState) loadingState.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;

        // Sla originele inputs op in localStorage voor de resultatenpagina
        const originalCV = cvInput.value;
        const originalJobDesc = jobInput.value;
        try {
            localStorage.setItem('originalCV', originalCV);
            localStorage.setItem('originalJobDesc', originalJobDesc);
        } catch (e) {
            console.warn("Could not save original data to localStorage:", e.message);
            // Ga door, maar originele data is mogelijk niet beschikbaar op de resultatenpagina
        }

        // Bereid de data (payload) voor om naar de backend te sturen
        const payload = {
            cv: originalCV,
            jobDescription: originalJobDesc,
            outputLanguage: outputLanguageInput.value,
            recaptchaToken: recaptchaResponse
            // userId: getUserID(), // Voeg eventueel een gebruikers-ID toe indien beschikbaar
        };

        try {
            // Roep de Netlify serverless functie aan
            const response = await fetch('/.netlify/functions/analyze-cv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // Reset reCAPTCHA widget na de request
            if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }

            // Handel de server response af
            if (!response.ok) {
                // Probeer de foutmelding uit de JSON body te halen
                const errorData = await response.json().catch(() => ({ // Fallback als JSON parsen mislukt
                    message: `Server error: ${response.status} ${response.statusText}`
                }));
                console.error('API Error Response:', response.status, errorData);
                // Gooi een error met de server boodschap of een generieke melding
                throw new Error(errorData.message || errorData.error || `Server responded with status ${response.status}`);
            }

            // Parse de succesvolle JSON response
            const result = await response.json();

            // Controleer of de operatie succesvol was en de data structuur klopt
            if (result.success && result.data && result.data.improvedCV) {
                // Sla de ontvangen resultaten (inclusief score) op in localStorage
                try {
                    localStorage.setItem('cvResults', JSON.stringify(result.data));
                } catch(e) {
                     console.error("Could not save results to localStorage:", e.message);
                     // Geef de gebruiker feedback dat opslaan mislukte, maar probeer wel door te sturen
                     alert("Warning: Could not save results locally. Proceeding to results page.");
                }
                // Stuur de gebruiker door naar de resultatenpagina
                window.location.href = '/improvements.html';
                return; // Belangrijk: stop verdere uitvoering hier na redirect

            } else {
                 // API gaf een 2xx status maar de response body is niet zoals verwacht
                 console.error('API Success Status but invalid/missing data in response:', result);
                throw new Error(result.error || getTranslation('error.apiGeneric', currentLanguage) || 'Received an unexpected response from the analysis. Please try again.');
            }

        } catch (error) {
            // Handel netwerkfouten, JSON parse errors, of gegooide errors af
            console.error('Error during form submission or API call:', error);
            alert(`${getTranslation('error.apiSubmit', currentLanguage) || 'An error occurred during submission:'} ${error.message}`);
             // Reset reCAPTCHA bij fout
             if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }
             // Toon de formulierstap weer aan de gebruiker
             if (currentStepElement) currentStepElement.style.display = 'block';

        } finally {
            // Verberg laadstatus en herstel knop ALLEEN als er NIET geredirect is (dus bij een fout)
             // Controleer of de redirect al heeft plaatsgevonden
            if (window.location.pathname.endsWith('/improvements.html') === false) {
                 if(loadingState) loadingState.classList.add('hidden');
                 if(submitBtn) submitBtn.disabled = false;
                 // Zorg ervoor dat de stap weer zichtbaar is als er een fout optrad
                 if (currentStepElement && currentStepElement.style.display === 'none') {
                    currentStepElement.style.display = 'block';
                 }
            }
        }
    });
} else {
    // Log een duidelijke fout als essentiële elementen niet gevonden zijn bij het laden
    console.error('Initialization failed: One or more crucial form elements (cvForm, submitBtn, loadingState, cvInput, jobInput, outputLanguageInput) were not found in the DOM.');
}


// ----------------------------------------------------
// TAALWISSEL-LOGICA
// ----------------------------------------------------

// Functie om vertaling op te halen (vereist geladen translations.js)
function getTranslation(key, lang = currentLanguage) {
    // Robuustere fallback logica
    try {
        let dictionary = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] :
                         (typeof translations !== 'undefined' && translations['en']) ? translations['en'] : null; // Fallback naar EN

        if (!dictionary) {
            // console.warn(`No translations available for lang '${lang}' or fallback 'en'.`);
            return key.includes('.') ? key.split('.').pop() : key;
        }

        const keys = key.split('.');
        let result = dictionary;
        for (const k of keys) {
            if (result === undefined || result === null || typeof result !== 'object') {
                // Probeer fallback naar Engels als primaire taal faalde en niet al Engels is
                if (lang !== 'en' && typeof translations !== 'undefined' && translations['en']) {
                    let fallbackDict = translations['en'];
                    let fallbackResult = fallbackDict;
                    for (const fk of keys) {
                        if (fallbackResult === undefined || fallbackResult === null || typeof fallbackResult !== 'object') {
                            // console.warn(`Fallback translation path broken at '${fk}' for key '${key}'`);
                            return key.includes('.') ? key.split('.').pop() : key;
                        }
                        fallbackResult = fallbackResult[fk];
                    }
                     // Gebruik fallback resultaat als het een string is
                     if (typeof fallbackResult === 'string' && fallbackResult !== '') return fallbackResult;
                }
                 // console.warn(`Translation path broken or not found at '${k}' for key '${key}' in lang '${lang}'.`);
                return key.includes('.') ? key.split('.').pop() : key; // Geef laatste deel terug
            }
            result = result[k];
        }

        // Controleer of het eindresultaat een string is
        if (typeof result === 'string' && result !== '') {
            return result;
        } else {
             // Probeer Engelse fallback als resultaat leeg/geen string is
             if (lang !== 'en' && typeof translations !== 'undefined' && translations['en']) {
                 let fallbackDict = translations['en'];
                 let fallbackResult = fallbackDict;
                 for (const k of keys) {
                     if (fallbackResult === undefined || fallbackResult === null || typeof fallbackResult !== 'object') return key.includes('.') ? key.split('.').pop() : key;
                     fallbackResult = fallbackResult[k];
                 }
                 if (typeof fallbackResult === 'string' && fallbackResult !== '') return fallbackResult;
             }
             // console.warn(`Final translation result for '${key}' in lang '${lang}' is not a valid string:`, result);
             return key.includes('.') ? key.split('.').pop() : key;
        }
    } catch (e) {
        console.error(`Unexpected error getting translation for key '${key}':`, e);
        return key.includes('.') ? key.split('.').pop() : key; // Fallback bij onverwachte fout
    }
}


// Functie om UI taal te wisselen
function switchLanguage(lang) {
    // Controleer of de taal data bestaat
    if (typeof translations !== 'undefined' && translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang); // Sla voorkeur op
        translatePage(); // Vertaal alle elementen
        updateLanguageButtons(); // Update knop stijlen
        // Optioneel: Update validatieberichten als die taalafhankelijk zijn
    } else {
        console.warn(`Attempted to switch to unavailable language: '${lang}'. Check translations.js.`);
    }
}

// Functie om taal knop stijlen bij te werken
function updateLanguageButtons() {
    document.querySelectorAll('.language-btn').forEach(btn => {
        const isActive = btn.dataset.lang === currentLanguage;
        btn.classList.toggle('bg-blue-100', isActive); // Achtergrond voor actieve knop
        btn.classList.toggle('text-blue-700', isActive); // Tekstkleur voor actieve knop
        btn.classList.toggle('font-semibold', isActive); // Dikkere tekst voor actieve knop
        btn.classList.toggle('text-gray-600', !isActive); // Standaard tekstkleur
        btn.classList.toggle('hover:bg-gray-100', !isActive); // Hover effect voor niet-actieve knop
    });
}

// Functie om de pagina te vertalen met data-i18n attributen
function translatePage() {
    // Vertaal tekst inhoud
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = getTranslation(el.dataset.i18n, currentLanguage);
    });
    // Vertaal placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = getTranslation(el.dataset.i18nPlaceholder, currentLanguage);
    });
    // Update HTML lang attribuut voor toegankelijkheid en SEO
    document.documentElement.lang = currentLanguage;
}

// Initial Language Load gebeurt nu in de DOMContentLoaded listener bovenaan.


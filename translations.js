// ============================================
// TRANSLATIONS
// English and Dutch translations for the UI
// ============================================

const translations = {
  en: {
    // Header
    subtitle: "Transform Your CV for Any Job",
    tagline: "AI-powered optimization • Cover letters • Interview tips",
    
    // Features
    feature1: "Job-Specific Tailoring",
    feature2: "See What Changed & Why",
    feature3: "Professional Cover Letter",
    feature4: "Interview Preparation",
    
    // Form
    formTitle: "Get Started in 3 Simple Steps",
    formDescription: "Paste your current CV and the job description, and let our AI create a perfectly tailored application package for you.",
    
    cvTitle: "Step 1: Your Current CV",
    cvLabel: "Paste your CV here (minimum 50 characters)",
    cvTip: "Include all your experience, skills, education, and achievements. The more complete, the better the AI can tailor it!",
    
    jobTitle: "Step 2: Job Description",
    jobLabel: "Paste the job description (minimum 30 characters)",
    jobTip: "Include the full job posting with requirements, responsibilities, and desired qualifications for best results.",
    
    languageTitle: "Step 3: Choose Output Language",
    languageLabel: "Select the language for your CV and cover letter",
    languageNote: "This only affects the output (CV, cover letter, tips). The UI language can be changed using the buttons above.",
    
    // Buttons
    submitBtn: "Generate My Tailored CV",
    sampleBtn: "Load Sample Data",
    clearBtn: "Clear All",
    pasteBtn: "Paste from Clipboard",
    
    // Misc
    characters: "Characters:",
    minimum: " (minimum ",
    tip: "Tip:",
    
    // How it works
    howItWorks: "🎯 How It Works",
    step1Title: "Paste Your CV",
    step1Desc: "Copy your current CV and paste it into the first field. Include all your experience, skills, and achievements.",
    step2Title: "Add Job Description",
    step2Desc: "Paste the complete job description for the position you're applying to. The more detail, the better!",
    step3Title: "Choose Language",
    step3Desc: "Select whether you want your tailored CV and cover letter in English or Dutch.",
    step4Title: "Get Results",
    step4Desc: "Receive your optimized CV, professional cover letter, detailed changes overview, and interview tips!",
    
    // Loading
    loadingTitle: "✨ AI is Working Its Magic...",
    loadingSubtext: "This usually takes 10-15 seconds. Please wait...",
    
    // Footer
    privacyNote: "Your data is processed securely and not stored"
  },
  
  nl: {
    // Header
    subtitle: "Transformeer Je CV voor Elke Baan",
    tagline: "AI-optimalisatie • Motivatiebrieven • Interview tips",
    
    // Features
    feature1: "Functie-Specifieke Aanpassing",
    feature2: "Zie Wat Er Veranderde & Waarom",
    feature3: "Professionele Motivatiebrief",
    feature4: "Interview Voorbereiding",
    
    // Form
    formTitle: "Begin in 3 Eenvoudige Stappen",
    formDescription: "Plak je huidige CV en de functiebeschrijving, en laat onze AI een perfect op maat gemaakt sollicitatiepakket voor je maken.",
    
    cvTitle: "Stap 1: Je Huidige CV",
    cvLabel: "Plak hier je CV (minimaal 50 tekens)",
    cvTip: "Voeg al je ervaring, vaardigheden, opleiding en prestaties toe. Hoe completer, hoe beter de AI het kan aanpassen!",
    
    jobTitle: "Stap 2: Functiebeschrijving",
    jobLabel: "Plak de functiebeschrijving (minimaal 30 tekens)",
    jobTip: "Voeg de volledige vacaturetekst toe met vereisten, verantwoordelijkheden en gewenste kwalificaties voor het beste resultaat.",
    
    languageTitle: "Stap 3: Kies Output Taal",
    languageLabel: "Selecteer de taal voor je CV en motivatiebrief",
    languageNote: "Dit heeft alleen invloed op de output (CV, motivatiebrief, tips). De UI-taal kan worden gewijzigd met de knoppen hierboven.",
    
    // Buttons
    submitBtn: "Genereer Mijn CV op Maat",
    sampleBtn: "Laad Voorbeeldgegevens",
    clearBtn: "Alles Wissen",
    pasteBtn: "Plak van Klembord",
    
    // Misc
    characters: "Tekens:",
    minimum: " (minimaal ",
    tip: "Tip:",
    
    // How it works
    howItWorks: "🎯 Hoe Het Werkt",
    step1Title: "Plak Je CV",
    step1Desc: "Kopieer je huidige CV en plak het in het eerste veld. Voeg al je ervaring, vaardigheden en prestaties toe.",
    step2Title: "Voeg Functiebeschrijving Toe",
    step2Desc: "Plak de volledige functiebeschrijving voor de functie waarvoor je solliciteert. Hoe meer detail, hoe beter!",
    step3Title: "Kies Taal",
    step3Desc: "Selecteer of je je op maat gemaakte CV en motivatiebrief in het Engels of Nederlands wilt.",
    step4Title: "Ontvang Resultaten",
    step4Desc: "Ontvang je geoptimaliseerde CV, professionele motivatiebrief, gedetailleerd overzicht van wijzigingen en interview tips!",
    
    // Loading
    loadingTitle: "✨ AI Doet Zijn Magie...",
    loadingSubtext: "Dit duurt meestal 10-15 seconden. Even geduld...",
    
    // Footer
    privacyNote: "Je gegevens worden veilig verwerkt en niet opgeslagen"
  }
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = translations;
}

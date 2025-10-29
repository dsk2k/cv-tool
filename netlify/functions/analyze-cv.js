const { GoogleGenerativeAI } = require('@google/generative-ai');
const multipart = require('parse-multipart-data');
const pdf = require('pdf-parse');
const { checkCache, saveToCache } = require('./cache-helper');
const { rateLimitMiddleware, rateLimitResponse } = require('./rate-limiter');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Prompt Text Markers
const ALL_START_MARKERS = [
  '---IMPROVED_CV_NL_START---',
  '---IMPROVED_CV_EN_START---',
  '---COVER_LETTER_NL_START---',
  '---COVER_LETTER_EN_START---',
  '---RECRUITER_TIPS_NL_START---',
  '---RECRUITER_TIPS_EN_START---',
  '---CHANGES_OVERVIEW_NL_START---',
  '---CHANGES_OVERVIEW_EN_START---'
];

exports.handler = async (event) => {
  // CORS headers - secure configuration
  const allowedOrigins = [
    process.env.URL, // Netlify deploy URL
    process.env.DEPLOY_PRIME_URL, // Netlify preview URL
    'http://localhost:8888', // Local development
    'http://localhost:3000'
  ].filter(Boolean);

  const origin = event.headers.origin || event.headers.Origin;
  const allowOrigin = allowedOrigins.some(allowed => origin?.startsWith(allowed)) ? origin : allowedOrigins[0];

  const headers = {
    'Access-Control-Allow-Origin': allowOrigin || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check rate limits
  const rateLimit = await rateLimitMiddleware(event);
  if (!rateLimit.allowed) {
    console.log(`⛔ Rate limit exceeded for IP: ${rateLimit.ip}`);
    return rateLimitResponse(rateLimit, headers);
  }
  console.log(`✅ Rate limit OK - ${rateLimit.remaining} requests remaining`);

  try {
    // === FIX VOOR FORMDATA PARSING ===
    // 1. Haal de 'boundary' uit de headers
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const boundary = multipart.getBoundary(contentType);
    
    // 2. Converteer de body van base64 naar een Buffer
    const bodyBuffer = Buffer.from(event.body, 'base64');

    // 3. Parse de multipart data
    const parts = multipart.parse(bodyBuffer, boundary);

    // 4. Haal de velden en het bestand eruit
    const cvFilePart = parts.find(part => part.name === 'cvFile');
    const jobDescriptionPart = parts.find(part => part.name === 'jobDescription');
    const languagePart = parts.find(part => part.name === 'language');

    if (!cvFilePart || !jobDescriptionPart) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing cvFile or jobDescription' }),
      };
    }

    const jobDescription = jobDescriptionPart.data.toString('utf-8');
    const language = languagePart ? languagePart.data.toString('utf-8') : 'en';
    
    // 5. Lees de tekst uit de PDF buffer (met dynamische import)
    const pdf = await import('pdf-parse');
    const pdfData = await pdf.default(cvFilePart.data);
    const currentCV = pdfData.text;

    // === ✨ CACHING CHECK - NIEUW! ✨ ===
    console.log('🔍 Checking cache...');
    const cachedResult = await checkCache(currentCV, jobDescription, language);
    
    if (cachedResult) {
      console.log('✅ Cache HIT - returning cached result!');
      console.log(`💰 Saved API cost! Hit count: ${cachedResult.metadata.hitCount}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cachedResult),
      };
    }
    
    console.log('❌ Cache miss - calling AI...');
    // === EINDE CACHING CHECK ===

    // Validate inputs
    if (!currentCV || !jobDescription) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: currentCV and jobDescription' 
        }),
      };
    }

    if (currentCV.length < 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'CV is too short. Please provide a complete CV.' 
        }),
      };
    }

    if (jobDescription.length < 30) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Job description is too short. Please provide more details.' 
        }),
      };
    }

    console.log('🚀 Starting CV analysis...');
    console.log(`📄 CV length: ${currentCV.length} chars`);
    console.log(`💼 Job description length: ${jobDescription.length} chars`);
    console.log(`🌍 Language: ${language}`);

    // Create the prompt
    const prompt = createPrompt(currentCV, jobDescription, language);

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    console.log('🤖 Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const fullText = response.text();
    
    console.log(`✅ Response received from Gemini: ${fullText.length} chars`);

    // Extract BOTH Dutch and English sections
    console.log('\n--- EXTRACTION PHASE (Both Languages) ---');

    // Dutch versions
    const improvedCV_NL = extractSection(fullText, '---IMPROVED_CV_NL_START---', '---IMPROVED_CV_NL_END---', 'Could not generate Dutch CV');
    const coverLetter_NL = extractSection(fullText, '---COVER_LETTER_NL_START---', '---COVER_LETTER_NL_END---', 'Could not generate Dutch cover letter');
    const recruiterTips_NL = extractSection(fullText, '---RECRUITER_TIPS_NL_START---', '---RECRUITER_TIPS_NL_END---', 'Could not generate Dutch tips');
    const changesOverview_NL = extractSection(fullText, '---CHANGES_OVERVIEW_NL_START---', '---CHANGES_OVERVIEW_NL_END---', 'Could not generate Dutch changes');

    console.log(`${improvedCV_NL.success ? '✅' : '❌'} CV (NL): ${improvedCV_NL.content.length} chars`);
    console.log(`${coverLetter_NL.success ? '✅' : '❌'} Cover Letter (NL): ${coverLetter_NL.content.length} chars`);
    console.log(`${recruiterTips_NL.success ? '✅' : '❌'} Tips (NL): ${recruiterTips_NL.content.length} chars`);
    console.log(`${changesOverview_NL.success ? '✅' : '❌'} Changes (NL): ${changesOverview_NL.content.length} chars`);

    // English versions
    const improvedCV_EN = extractSection(fullText, '---IMPROVED_CV_EN_START---', '---IMPROVED_CV_EN_END---', 'Could not generate English CV');
    const coverLetter_EN = extractSection(fullText, '---COVER_LETTER_EN_START---', '---COVER_LETTER_EN_END---', 'Could not generate English cover letter');
    const recruiterTips_EN = extractSection(fullText, '---RECRUITER_TIPS_EN_START---', '---RECRUITER_TIPS_EN_END---', 'Could not generate English tips');
    const changesOverview_EN = extractSection(fullText, '---CHANGES_OVERVIEW_EN_START---', '---CHANGES_OVERVIEW_EN_END---', 'Could not generate English changes');

    console.log(`${improvedCV_EN.success ? '✅' : '❌'} CV (EN): ${improvedCV_EN.content.length} chars`);
    console.log(`${coverLetter_EN.success ? '✅' : '❌'} Cover Letter (EN): ${coverLetter_EN.content.length} chars`);
    console.log(`${recruiterTips_EN.success ? '✅' : '❌'} Tips (EN): ${recruiterTips_EN.content.length} chars`);
    console.log(`${changesOverview_EN.success ? '✅' : '❌'} Changes (EN): ${changesOverview_EN.content.length} chars`);

    console.log('--- END EXTRACTION PHASE ---\n');

    // Prepare response with BOTH languages
    const responseData = {
      // Dutch versions (default)
      improvedCV: improvedCV_NL.content,
      coverLetter: coverLetter_NL.content,
      recruiterTips: recruiterTips_NL.content,
      changesOverview: changesOverview_NL.content,
      // English versions
      improvedCV_EN: improvedCV_EN.content,
      coverLetter_EN: coverLetter_EN.content,
      recruiterTips_EN: recruiterTips_EN.content,
      changesOverview_EN: changesOverview_EN.content,
      metadata: {
        originalCVLength: currentCV.length,
        jobDescriptionLength: jobDescription.length,
        language: language,
        timestamp: new Date().toISOString(),
      }
    };

    // === ✨ SAVE TO CACHE - NIEUW! ✨ ===
    console.log('💾 Saving result to cache...');
    const cacheSaved = await saveToCache(currentCV, jobDescription, language, responseData);
    
    if (cacheSaved) {
      console.log('✅ Successfully saved to cache');
    } else {
      console.log('⚠️ Cache save failed (non-critical)');
    }
    
    // Add cache metadata
    responseData.metadata.cached = false;
    responseData.metadata.hitCount = 1;
    // === EINDE SAVE TO CACHE ===

    console.log('\n--- FINAL DATA SUMMARY ---');
    console.log(`NL CV: ${improvedCV_NL.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${improvedCV_NL.content.length} chars)`);
    console.log(`EN CV: ${improvedCV_EN.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${improvedCV_EN.content.length} chars)`);
    console.log(`NL Cover Letter: ${coverLetter_NL.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${coverLetter_NL.content.length} chars)`);
    console.log(`EN Cover Letter: ${coverLetter_EN.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${coverLetter_EN.content.length} chars)`);
    console.log(`NL Tips: ${recruiterTips_NL.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${recruiterTips_NL.content.length} chars)`);
    console.log(`EN Tips: ${recruiterTips_EN.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${recruiterTips_EN.content.length} chars)`);
    console.log(`NL Changes: ${changesOverview_NL.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${changesOverview_NL.content.length} chars)`);
    console.log(`EN Changes: ${changesOverview_EN.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${changesOverview_EN.content.length} chars)`);
    console.log('--- END SUMMARY ---\n');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error('❌ Error processing CV:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error while processing CV',
        message: error.message 
      }),
    };
  }
};

/**
 * Extract a section from the full text using start and end markers
 * NIEUWE ROBUUSTE VERSIE
 */
function extractSection(fullText, startMarker, endMarker, fallbackMessage) {
  try {
    const startIndex = fullText.indexOf(startMarker);
    
    if (startIndex === -1) {
      console.log(`⚠️  Could not find ${startMarker}`);
      return { success: false, content: fallbackMessage };
    }

    const contentStart = startIndex + startMarker.length;
    
    // 1. Probeer eerst de correcte, verwachte eind-tag te vinden
    let endIndex = fullText.indexOf(endMarker, contentStart);
    
    // 2. ROBUUSTE FALLBACK: Als de eind-tag mist...
    if (endIndex === -1) {
      console.log(`⚠️  Could not find ${endMarker}. Using ROBUST FALLBACK (searching for next START marker).`);
      
      let nearestNextStartIndex = fullText.length; // Standaard tot het einde van de tekst

      // 3. Zoek de EERSTVOLGENDE *andere* START-tag
      for (const marker of ALL_START_MARKERS) {
        // Zoek niet naar zichzelf
        if (marker === startMarker) continue; 
        
        const nextMarkerIndex = fullText.indexOf(marker, contentStart);
        
        // Als we een tag vinden, en deze is dichterbij dan de vorige...
        if (nextMarkerIndex !== -1 && nextMarkerIndex < nearestNextStartIndex) {
          nearestNextStartIndex = nextMarkerIndex;
        }
      }
      
      endIndex = nearestNextStartIndex;
      console.log(`✅ Robust fallback found end at index ${endIndex}.`);
    }

    // 4. Extraheer de content
    let content = fullText.substring(contentStart, endIndex).trim();

    // 5. VALIDATIE & OPSCHONING (De 'extra' veiligheidsgordel)
    
    // Controleer op minimale lengte
    if (!content || content.length < 10) {
      console.log(`⚠️  Extracted content too short: ${content.length} chars`);
      return { success: false, content: fallbackMessage };
    }

    // Controleer op "vervuiling" (of de content per ongeluk een *andere* start-tag bevat)
    for (const marker of ALL_START_MARKERS) {
      if (marker === startMarker) continue;
      
      if (content.includes(marker)) {
        console.log(`❌ VALIDATION FAILED: Content for ${startMarker} is contaminated with ${marker}!`);
        // Probeer de content op te schonen door deze af te knippen
        const contaminationIndex = content.indexOf(marker);
        content = content.substring(0, contaminationIndex).trim();
        console.log(`✨ Content cleaned. New length: ${content.length}`);
      }
    }

    return { success: true, content };

  } catch (error) {
    console.error(`❌ Error extracting section ${startMarker}:`, error);
    return { success: false, content: fallbackMessage };
  }
}

/**
 * Create the prompt for Gemini AI
 */
function createPrompt(currentCV, jobDescription, language) {
  return `You are an expert CV consultant and career coach. Your task is to analyze the CV and generate BOTH Dutch AND English versions of all content.

**CRITICAL: Generate BOTH languages in a single response!**

**IMPORTANT OUTPUT FORMAT:**
You must wrap each section with the exact markers shown below. Do not skip any section.

---IMPROVED_CV_NL_START---
[Your improved CV in DUTCH - Use markdown formatting, keep structure but optimize content]
---IMPROVED_CV_NL_END---

---IMPROVED_CV_EN_START---
[Your improved CV in ENGLISH - Same improvements, translated]
---IMPROVED_CV_EN_END---

---COVER_LETTER_NL_START---
[Your professional cover letter in DUTCH]
---COVER_LETTER_NL_END---

---COVER_LETTER_EN_START---
[Your professional cover letter in ENGLISH]
---COVER_LETTER_EN_END---

---RECRUITER_TIPS_NL_START---
[Your recruiter conversation tips in DUTCH - Use markdown with headers and bullet points]
---RECRUITER_TIPS_NL_END---

---RECRUITER_TIPS_EN_START---
[Your recruiter conversation tips in ENGLISH - Use markdown with headers and bullet points]
---RECRUITER_TIPS_EN_END---

---CHANGES_OVERVIEW_NL_START---
[Your detailed changes overview in DUTCH]
---CHANGES_OVERVIEW_NL_END---

---CHANGES_OVERVIEW_EN_START---
[Your detailed changes overview in ENGLISH]
---CHANGES_OVERVIEW_EN_END---

## Instructions for CV Improvement:
- Keep the original structure and formatting
- Enhance bullet points to match job requirements
- Quantify achievements where possible
- Use action verbs and industry keywords from the job description
- Improve clarity and impact
- Keep it professional and honest
- Output language: ${language === 'nl' ? 'Dutch' : 'English'}

## Instructions for Cover Letter:
- Professional and personalized
- Reference specific job requirements
- Highlight relevant experience
- Show enthusiasm and cultural fit
- Keep it concise (300-400 words)
- Output language: ${language === 'nl' ? 'Dutch' : 'English'}

## Instructions for Recruiter Tips:
Create a section with these topics (use markdown headers and formatting):
1. **Key Points to Emphasize** - What to highlight in interviews
2. **Questions They'll Ask** - Common questions for this role
3. **Questions You Should Ask** - Smart questions to ask the recruiter
4. **Red Flags to Watch** - What to be careful about
5. **Salary Negotiation Tips** - How to approach compensation
6. **Cultural Fit Signals** - What the company values
7. **Next Steps** - What to do after the interview

Output language: ${language === 'nl' ? 'Dutch' : 'English'}

## **NEW: Instructions for Changes Overview**

Create a comprehensive, STRUCTURED list of ALL changes made to the CV, GROUPED BY CV SECTION.

**CRITICAL FORMAT REQUIREMENTS:**
- Group changes by CV section (## Summary Section, ## Experience Section, etc.)
- Under each section, list individual changes as numbered items (### 1., ### 2., etc.)
- This creates a hierarchical, collapsible structure

**LANGUAGE REQUIREMENTS:**
${language === 'nl' ? `
- ⚠️ WRITE EVERYTHING IN DUTCH (NEDERLANDS)
- All section names must be in Dutch
- All change titles must be in Dutch
- All explanations must be in Dutch
- The ONLY acceptable language is DUTCH
- NO English text allowed anywhere
` : `
- Write everything in English
- All section names must be in English
- All change titles must be in English
- All explanations must be in English
`}

Use this EXACT format:

${language === 'nl' ? `
**📝 Overzicht van Wijzigingen**

Hieronder zie je alle wijzigingen die zijn aangebracht in je CV, gegroepeerd per sectie.

## Summary Sectie

### 1. [Naam van de wijziging]
**Origineel:**
[Wat er stond]

**Verbeterd:**
[Wat het nu is]

**Waarom dit belangrijk is:**
[Duidelijke uitleg hoe dit je kandidatuur versterkt, refererend aan de functiebeschrijving]

**Impact:** ⭐⭐⭐⭐⭐ (1-5 sterren)

---

### 2. [Volgende wijziging in Summary]
**Origineel:**
...

**Verbeterd:**
...

**Waarom dit belangrijk is:**
...

**Impact:** ⭐⭐⭐⭐

---

## Werkervaring Sectie

### 1. [Wijziging in werkervaring]
**Origineel:**
...

**Verbeterd:**
...

**Waarom dit belangrijk is:**
...

**Impact:** ⭐⭐⭐⭐⭐

---

## Vaardigheden Sectie

### 1. [Wijziging in vaardigheden]
...

---

## Opleidingen Sectie

### 1. [Wijziging in opleidingen]
...

---

### 📊 Samenvatting
**Totaal aantal wijzigingen:** [nummer]
**Wijzigingen per sectie:**
- Summary: [aantal] wijzigingen
- Werkervaring: [aantal] wijzigingen
- Vaardigheden: [aantal] wijzigingen
- Opleidingen: [aantal] wijzigingen

**Belangrijkste verbeteringen:**
- [Key improvement 1]
- [Key improvement 2]
- [Key improvement 3]

**Afstemming op functie:** [Percentage, bijv. "87% match"]
` : `
**📝 Changes Overview**

Below you'll see all changes made to your CV, grouped by section for better overview.

## Summary Section

### 1. [Name of the change]
**Original:**
[What it said before]

**Improved:**
[What it says now]

**Why this matters:**
[Clear explanation of how this strengthens your candidacy, referencing the job description]

**Impact:** ⭐⭐⭐⭐⭐ (1-5 stars)

---

### 2. [Next change in Summary]
**Original:**
...

**Improved:**
...

**Why this matters:**
...

**Impact:** ⭐⭐⭐⭐

---

## Experience Section

### 1. [Change in experience]
**Original:**
...

**Improved:**
...

**Why this matters:**
...

**Impact:** ⭐⭐⭐⭐⭐

---

## Skills Section

### 1. [Change in skills]
...

---

## Education Section

### 1. [Change in education]
...

---

### 📊 Summary
**Total changes made:** [number]
**Changes per section:**
- Summary: [number] changes
- Experience: [number] changes
- Skills: [number] changes
- Education: [number] changes

**Key improvements:**
- [Key improvement 1]
- [Key improvement 2]
- [Key improvement 3]

**Job match score:** [Percentage, e.g., "87% match"]
`}

**CRITICAL RULES FOR CHANGES OVERVIEW:**
- List EVERY meaningful change (aim for 8-15 changes)
- Be specific about what changed
- Explain WHY using the job description
- Rate impact (1-5 stars)
- Include changes to: keywords, action verbs, quantifications, structure, emphasis, formatting
- If no change in a section, still explain why it's good as-is
- Focus on what makes the candidate more competitive
- Use markdown formatting for readability

---

## Original CV:
${currentCV}

## Job Description:
${jobDescription}

Remember: Use the exact markers shown above for each section. The system relies on these markers to parse your response correctly.`;
}
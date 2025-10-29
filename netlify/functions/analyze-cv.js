const { GoogleGenerativeAI } = require('@google/generative-ai');
const multipart = require('parse-multipart-data');
const pdf = require('pdf-parse');
const { checkCache, saveToCache } = require('./cache-helper');
const { rateLimitMiddleware, rateLimitResponse } = require('./rate-limiter');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Prompt Text Markers
const ALL_START_MARKERS = [
  '---IMPROVED_CV_START---',
  '---COVER_LETTER_START---',
  '---RECRUITER_TIPS_START---',
  '---CHANGES_OVERVIEW_START---'
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

    // Extract sections
    console.log('\n--- EXTRACTION PHASE ---');

    const improvedCV = extractSection(fullText, '---IMPROVED_CV_START---', '---IMPROVED_CV_END---', 'Could not generate CV');
    const coverLetter = extractSection(fullText, '---COVER_LETTER_START---', '---COVER_LETTER_END---', 'Could not generate cover letter');
    const recruiterTips = extractSection(fullText, '---RECRUITER_TIPS_START---', '---RECRUITER_TIPS_END---', 'Could not generate tips');
    const changesOverview = extractSection(fullText, '---CHANGES_OVERVIEW_START---', '---CHANGES_OVERVIEW_END---', 'Could not generate changes');

    console.log(`${improvedCV.success ? '✅' : '❌'} CV: ${improvedCV.content.length} chars`);
    console.log(`${coverLetter.success ? '✅' : '❌'} Cover Letter: ${coverLetter.content.length} chars`);
    console.log(`${recruiterTips.success ? '✅' : '❌'} Tips: ${recruiterTips.content.length} chars`);
    console.log(`${changesOverview.success ? '✅' : '❌'} Changes: ${changesOverview.content.length} chars`);

    console.log('--- END EXTRACTION PHASE ---\n');

    // Prepare response
    const responseData = {
      improvedCV: improvedCV.content,
      coverLetter: coverLetter.content,
      recruiterTips: recruiterTips.content,
      changesOverview: changesOverview.content,
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
    console.log(`CV: ${improvedCV.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${improvedCV.content.length} chars)`);
    console.log(`Cover Letter: ${coverLetter.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${coverLetter.content.length} chars)`);
    console.log(`Tips: ${recruiterTips.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${recruiterTips.content.length} chars)`);
    console.log(`Changes: ${changesOverview.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${changesOverview.content.length} chars)`);
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
 * VEREENVOUDIGDE VERSIE: Vraagt alleen de geselecteerde taal
 */
function createPrompt(currentCV, jobDescription, language) {
  // Bepaal de taal voor de instructies
  const isDutch = language === 'nl';
  const instructionLanguage = isDutch ? 'Dutch (Nederlands)' : 'English';
  const changesOverviewTitle = isDutch ? '📝 Overzicht van Wijzigingen' : '📝 Changes Overview';
  const changesSectionNames = isDutch ? 
    ['Summary Sectie', 'Werkervaring Sectie', 'Vaardigheden Sectie', 'Opleidingen Sectie'] :
    ['Summary Section', 'Experience Section', 'Skills Section', 'Education Section'];
  
  const originalLabel = isDutch ? 'Origineel' : 'Original';
  const improvedLabel = isDutch ? 'Verbeterd' : 'Improved';
  const whyLabel = isDutch ? 'Waarom dit belangrijk is' : 'Why this matters';
  const impactLabel = isDutch ? 'Impact' : 'Impact';
  
  const summaryBlock = isDutch ? `
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
`;

  return `You are an expert CV consultant and career coach. Your task is to analyze the CV and generate all content in ${instructionLanguage}.

**CRITICAL: Generate content ONLY in ${instructionLanguage}.**

**IMPORTANT OUTPUT FORMAT:**
You must wrap each section with the exact markers shown below. Do not skip any section.

---IMPROVED_CV_START---
[Your improved CV in ${instructionLanguage} - Use markdown formatting, keep structure but optimize content]
---IMPROVED_CV_END---

---COVER_LETTER_START---
[Your professional cover letter in ${instructionLanguage}]
---COVER_LETTER_END---

---RECRUITER_TIPS_START---
[Your recruiter conversation tips in ${instructionLanguage} - Use markdown with headers and bullet points]
---RECRUITER_TIPS_END---

---CHANGES_OVERVIEW_START---
[Your detailed changes overview in ${instructionLanguage}]
---CHANGES_OVERVIEW_END---

## Instructions for CV Improvement:
- Keep the original structure and formatting
- Enhance bullet points to match job requirements
- Quantify achievements where possible
- Use action verbs and industry keywords from the job description
- Improve clarity and impact
- Keep it professional and honest
- Output language: ${instructionLanguage}

## Instructions for Cover Letter:
- Professional and personalized
- Reference specific job requirements
- Highlight relevant experience
- Show enthusiasm and cultural fit
- Keep it concise (300-400 words)
- Output language: ${instructionLanguage}

## Instructions for Recruiter Tips:
Create a section with these topics (use markdown headers and formatting) in ${instructionLanguage}:
1. **Key Points to Emphasize** - What to highlight in interviews
2. **Questions They'll Ask** - Common questions for this role
3. **Questions You Should Ask** - Smart questions to ask the recruiter
4. **Red Flags to Watch** - What to be careful about
5. **Salary Negotiation Tips** - How to approach compensation
6. **Cultural Fit Signals** - What the company values
7. **Next Steps** - What to do after the interview

Output language: ${instructionLanguage}

## Instructions for Changes Overview
Create a comprehensive, STRUCTURED list of ALL changes made to the CV, GROUPED BY CV SECTION.
WRITE EVERYTHING IN ${instructionLanguage}.

Use this EXACT format:

**${changesOverviewTitle}**

Hieronder zie je alle wijzigingen die zijn aangebracht in je CV, gegroepeerd per sectie.

## ${changesSectionNames[0]}

### 1. [Naam van de wijziging]
**${originalLabel}:**
[Wat er stond]

**${improvedLabel}:**
[Wat het nu is]

**${whyLabel}:**
[Duidelijke uitleg hoe dit je kandidatuur versterkt, refererend aan de functiebeschrijving]

**${impactLabel}:** ⭐⭐⭐⭐⭐ (1-5 sterren)

---

### 2. [Volgende wijziging]
...

---

## ${changesSectionNames[1]}

### 1. [Wijziging in werkervaring]
...

---

## ${changesSectionNames[2]}

### 1. [Wijziging in vaardigheden]
...

---

## ${changesSectionNames[3]}

### 1. [Wijziging in opleidingen]
...

---

${summaryBlock}

**CRITICAL RULES FOR CHANGES OVERVIEW:**
- List EVERY meaningful change (aim for 8-15 changes)
- Be specific about what changed
- Explain WHY using the job description
- Rate impact (1-5 stars)
- Output language: ${instructionLanguage}

---

## Original CV:
${currentCV}

## Job Description:
${jobDescription}

Remember: Use the exact markers shown above for each section. The system relies on these markers to parse your response correctly.`;
}
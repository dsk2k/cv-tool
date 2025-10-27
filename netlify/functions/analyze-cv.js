const { GoogleGenerativeAI } = require('@google/generative-ai');
const multipart = require('parse-multipart-data');
const pdf = require('pdf-parse');
const { checkCache, saveToCache } = require('./cache-helper'); // ← CACHING TOEGEVOEGD

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
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

    // Extract sections using improved extraction
    console.log('\n--- EXTRACTION PHASE ---');
    
    const improvedCV = extractSection(
      fullText, 
      '---IMPROVED_CV_START---', 
      '---IMPROVED_CV_END---',
      'Could not generate improved CV. Please check input and try again.'
    );
    console.log(`${improvedCV.success ? '✅' : '❌'} CV extraction: ${improvedCV.content.length} chars`);
    if (improvedCV.success) console.log(`📝 CV Preview: ${improvedCV.content.substring(0, 100)}...`);

    const coverLetter = extractSection(
      fullText, 
      '---COVER_LETTER_START---', 
      '---COVER_LETTER_END---',
      'Could not generate cover letter. Please check input and try again.'
    );
    console.log(`${coverLetter.success ? '✅' : '❌'} Cover Letter extraction: ${coverLetter.content.length} chars`);
    if (coverLetter.success) console.log(`📝 CL Preview: ${coverLetter.content.substring(0, 100)}...`);

    const recruiterTips = extractSection(
      fullText, 
      '---RECRUITER_TIPS_START---', 
      '---RECRUITER_TIPS_END---',
      'Could not generate recruiter tips.'
    );
    console.log(`${recruiterTips.success ? '✅' : '❌'} Recruiter Tips extraction: ${recruiterTips.content.length} chars`);

    // Extract changes overview
    const changesOverview = extractSection(
      fullText, 
      '---CHANGES_OVERVIEW_START---', 
      '---CHANGES_OVERVIEW_END---',
      'Could not generate changes overview.'
    );
    console.log(`${changesOverview.success ? '✅' : '❌'} Changes Overview extraction: ${changesOverview.content.length} chars`);
    if (changesOverview.success) console.log(`📝 Changes Preview: ${changesOverview.content.substring(0, 100)}...`);

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
    console.log(`Using CV: ${improvedCV.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${improvedCV.content.length} chars)`);
    console.log(`Using CL: ${coverLetter.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${coverLetter.content.length} chars)`);
    console.log(`Using Tips: ${recruiterTips.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${recruiterTips.content.length} chars)`);
    console.log(`Using Changes: ${changesOverview.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${changesOverview.content.length} chars)`);
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
 * Now with robust fallback strategies
 */
function extractSection(fullText, startMarker, endMarker, fallbackMessage) {
  try {
    const startIndex = fullText.indexOf(startMarker);
    
    if (startIndex === -1) {
      console.log(`⚠️  Could not find ${startMarker}`);
      return { success: false, content: fallbackMessage };
    }

    const contentStart = startIndex + startMarker.length;
    let endIndex = fullText.indexOf(endMarker, contentStart);
    
    // If end marker not found, try to find the next section marker
    if (endIndex === -1) {
      console.log(`⚠️  Could not find ${endMarker}, using next section or end of text`);
      const nextMarkers = [
        '---IMPROVED_CV_START---',
        '---IMPROVED_CV_END---',
        '---COVER_LETTER_START---',
        '---COVER_LETTER_END---',
        '---RECRUITER_TIPS_START---',
        '---RECRUITER_TIPS_END---',
        '---CHANGES_OVERVIEW_START---',
        '---CHANGES_OVERVIEW_END---'
      ].filter(m => m !== startMarker && m !== endMarker);

      // Find the nearest next marker
      let nearestIndex = fullText.length;
      for (const marker of nextMarkers) {
        const idx = fullText.indexOf(marker, contentStart);
        if (idx !== -1 && idx < nearestIndex) {
          nearestIndex = idx;
        }
      }
      endIndex = nearestIndex;
    }

    const content = fullText.substring(contentStart, endIndex).trim();

    if (!content || content.length < 10) {
      console.log(`⚠️  Extracted content too short: ${content.length} chars`);
      return { success: false, content: fallbackMessage };
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
  const isNL = language === 'nl';
  
  return `You are an expert CV consultant and career coach. Your task is to:

1. Analyze the provided CV and job description
2. Improve the CV to better match the job requirements
3. Generate a professional cover letter
4. Provide recruiter conversation tips
5. **NEW: Create a detailed overview of all changes made and why**

**IMPORTANT OUTPUT FORMAT:**
You must wrap each section with the exact markers shown below. Do not skip any section.

---IMPROVED_CV_START---
[Your improved CV in ${isNL ? 'Dutch' : 'English'} - Use markdown formatting, keep the same structure but optimize content]
---IMPROVED_CV_END---

---COVER_LETTER_START---
[Your professional cover letter in ${isNL ? 'Dutch' : 'English'}]
---COVER_LETTER_END---

---RECRUITER_TIPS_START---
[Your recruiter conversation tips in ${isNL ? 'Dutch' : 'English'} - Use markdown with headers and bullet points]
---RECRUITER_TIPS_END---

---CHANGES_OVERVIEW_START---
[Your detailed changes overview - see instructions below]
---CHANGES_OVERVIEW_END---

## Instructions for CV Improvement:
- Keep the original structure and formatting
- Enhance bullet points to match job requirements
- Quantify achievements where possible
- Use action verbs and industry keywords from the job description
- Improve clarity and impact
- Keep it professional and honest
- Output language: ${isNL ? 'Dutch' : 'English'}

## Instructions for Cover Letter:
- Professional and personalized
- Reference specific job requirements
- Highlight relevant experience
- Show enthusiasm and cultural fit
- Keep it concise (300-400 words)
- Output language: ${isNL ? 'Dutch' : 'English'}

## Instructions for Recruiter Tips:
Create a section with these topics (use markdown headers and formatting):
1. **Key Points to Emphasize** - What to highlight in interviews
2. **Questions They'll Ask** - Common questions for this role
3. **Questions You Should Ask** - Smart questions to ask the recruiter
4. **Red Flags to Watch** - What to be careful about
5. **Salary Negotiation Tips** - How to approach compensation
6. **Cultural Fit Signals** - What the company values
7. **Next Steps** - What to do after the interview

Output language: ${isNL ? 'Dutch' : 'English'}

## **NEW: Instructions for Changes Overview**

Create a comprehensive list of ALL changes made to the CV with explanations. Use this exact format:

${isNL ? `
**📝 Overzicht van Wijzigingen**

Hieronder zie je alle wijzigingen die zijn aangebracht in je CV, met uitleg waarom elke wijziging belangrijk is voor deze functie.

### 1. [Sectienaam of Element]
**Origineel:**
[Wat er stond]

**Nieuw:**
[Wat het nu is]

**Waarom deze wijziging:**
[Duidelijke uitleg hoe dit je kandidatuur versterkt, refererend aan de functiebeschrijving]

**Impact:** ⭐⭐⭐⭐⭐ (1-5 sterren voor belang)

---

[Herhaal voor elke wijziging...]

### Samenvatting
**Totaal aantal wijzigingen:** [nummer]
**Belangrijkste verbeteringen:**
- [Key improvement 1]
- [Key improvement 2]
- [Key improvement 3]

**Afstemming op functie:** [Percentage, bijv. "85% match"]
` : `
**📝 Changes Overview**

Below you'll see all the changes made to your CV, with explanations of why each change matters for this specific role.

### 1. [Section Name or Element]
**Original:**
[What it said before]

**Improved:**
[What it says now]

**Why this change matters:**
[Clear explanation of how this strengthens your candidacy, referencing the job description]

**Impact Rating:** ⭐⭐⭐⭐⭐ (1-5 stars for importance)

---

[Repeat for each change...]

### Samenvatting
**Total changes made:** [number]
**Key improvements:**
- [Key improvement 1]
- [Key improvement 2]
- [Key improvement 3]

**Job match score:** [Percentage, e.g., "85% match"]
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
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multipart = require('parse-multipart-data');
// pdf-parse is imported dynamically later where needed
const { checkCache, saveToCache } = require('./cache-helper');
const { rateLimitMiddleware, rateLimitResponse } = require('./rate-limiter');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define all possible START markers for robust parsing
const ALL_START_MARKERS = [
  '---IMPROVED_CV_START---',
  '---COVER_LETTER_START---',
  '---RECRUITER_TIPS_START---',
  '---CHANGES_OVERVIEW_START---'
];

exports.handler = async (event) => {
  // CORS headers setup
  const allowedOrigins = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    'http://localhost:8888',
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

  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Ensure it's a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Apply rate limiting
  const rateLimit = await rateLimitMiddleware(event);
  if (!rateLimit.allowed) {
    console.log(`⛔ Rate limit exceeded for IP: ${rateLimit.ip}`);
    return rateLimitResponse(rateLimit, headers);
  }
  console.log(`✅ Rate limit OK - ${rateLimit.remaining} requests remaining`);

  // --- Outer Try-Catch for general errors (like parsing) ---
  try {
    // === Form Data Parsing ===
    console.log('📄 Parsing form data...');
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType) {
       throw new Error("Missing Content-Type header");
    }
    const boundary = multipart.getBoundary(contentType);
    if (!boundary) {
        throw new Error("Could not find boundary in Content-Type header");
    }
    const bodyBuffer = Buffer.from(event.body, 'base64');
    const parts = multipart.parse(bodyBuffer, boundary);
    console.log(`✅ Form data parsed into ${parts.length} parts.`);

    const cvFilePart = parts.find(part => part.name === 'cvFile');
    const jobDescriptionPart = parts.find(part => part.name === 'jobDescription');
    const languagePart = parts.find(part => part.name === 'language');

    if (!cvFilePart || !jobDescriptionPart) {
      console.log('❌ Missing cvFile or jobDescription in form data.');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing cvFile or jobDescription' }),
      };
    }
    console.log('✅ Found CV file and job description parts.');

    const jobDescription = jobDescriptionPart.data.toString('utf-8');
    const language = languagePart ? languagePart.data.toString('utf-8') : 'en';
    
    // Dynamically import and parse PDF
    console.log('📄 Parsing PDF content...');
    const pdfParser = await import('pdf-parse');
    const pdfData = await pdfParser.default(cvFilePart.data);
    const currentCV = pdfData.text;
    console.log(`✅ PDF parsed. CV length: ${currentCV ? currentCV.length : 0} chars.`);

    // === Caching Logic ===
    console.log('🔍 Checking cache...');
    const cachedResult = await checkCache(currentCV, jobDescription, language);
    if (cachedResult) {
      console.log('✅ Cache HIT - returning cached result!');
      console.log(`💰 Saved API cost! Hit count: ${cachedResult.metadata.hitCount}`);

      const cachedResponse = {
        ...cachedResult,
        rateLimit: {
          used: rateLimit?.used || 0,
          total: rateLimit?.total || 10,
          remaining: rateLimit?.remaining || 10,
          isDeveloperMode: rateLimit?.isDeveloperMode || false
        }
      };

      console.log('📊 Rate limit info (cached):', cachedResponse.rateLimit);
      console.log('📦 Cached response keys:', Object.keys(cachedResponse));

      return {
        statusCode: 200,
        headers: {
          ...headers,
          ...(rateLimit?.headers || {})
        },
        body: JSON.stringify(cachedResponse),
      };
    }
    console.log('❌ Cache miss - proceeding...');
    // === End Caching Logic ===

    // === Granular Input Validations ===
    console.log('🚦 BEFORE VALIDATIONS');
    console.log('🚦 Validating presence...');
    if (!currentCV || !jobDescription) {
      console.log('❌ Validation FAILED: Missing CV or Job Description content after parsing.');
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ error: 'Missing CV or Job Description content after parsing' }),
      };
    }
    console.log('✅ Presence OK');

    console.log('🚦 Validating CV length...');
    if (currentCV.length < 50) {
      console.log('❌ Validation FAILED: CV too short');
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ error: 'CV is too short. Please provide a complete CV.' }),
      };
    }
    console.log('✅ CV length OK');

    console.log('🚦 Validating Job Description length...');
    if (jobDescription.length < 30) {
      console.log('❌ Validation FAILED: Job Description too short');
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ error: 'Job description is too short. Please provide more details.' }),
      };
    }
    console.log('✅ Job Description length OK');
    console.log('🚦 AFTER VALIDATIONS');
    // === End Input Validations ===

    // === Inner Try-Catch for AI Prompt Generation, API Call, and Extraction ===
    console.log('🚦 BEFORE INNER TRY BLOCK');
    try {
        console.log('🚀 Starting CV analysis...');
        console.log(`📄 (Inner Try) CV length: ${currentCV.length} chars`);
        console.log(`💼 (Inner Try) Job description length: ${jobDescription.length} chars`);
        console.log(`🌍 (Inner Try) Language: ${language}`);

        console.log('🔧 Attempting to create prompt...');
        const prompt = createPrompt(currentCV, jobDescription, language);
        console.log(`✅ Prompt created successfully. Length: ${prompt.length} chars.`);

        // Call Gemini API
        const modelName = 'gemini-2.0-flash'; // Use the model you have access to
        console.log(`🤖 Attempting to get model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log('✅ Model obtained successfully.');

        console.log('🤖 Attempting to call Gemini API...');
        const result = await model.generateContent(prompt);
        console.log('🎉 Gemini API call successful!');

        const response = result.response;
        // Basic check if response or text() exists
        if (!response || typeof response.text !== 'function') {
            console.error('❌ Invalid response structure from Gemini API:', response);
            throw new Error('Invalid response structure received from AI.');
        }
        const fullText = response.text();
        console.log(`✅ Response received from Gemini: ${fullText ? fullText.length : 0} chars`);
        if (!fullText) {
             throw new Error('Empty text content received from AI.');
        }

        // --- Extraction Phase ---
        console.log('\n--- EXTRACTION PHASE ---');
        const improvedCV = extractSection(fullText, '---IMPROVED_CV_START---', '---IMPROVED_CV_END---', 'Could not generate CV');
        const coverLetter = extractSection(fullText, '---COVER_LETTER_START---', '---COVER_LETTER_END---', 'Could not generate cover letter');
        const recruiterTips = extractSection(fullText, '---RECRUITER_TIPS_START---', '---RECRUITER_TIPS_END---', 'Could not generate tips');
        const changesOverview = extractSection(fullText, '---CHANGES_OVERVIEW_START---', '---CHANGES_OVERVIEW_END---', 'Could not generate changes');

        console.log(`${improvedCV.success ? '✅' : '❌'} CV: ${improvedCV.content.length} chars`);
        console.log(`${coverLetter.success ? '✅' : '❌'} Cover Letter: ${coverLetter.content.length} chars`);
        console.log(`${recruiterTips.success ? '✅' : '❌'} Tips: ${recruiterTips.content.length} chars`);
        console.log(`${changesOverview.success ? '✅' : '❌'} Changes: ${changesOverview.content.length} chars`);

        // Check if ANY extraction failed - indicates AI didn't follow format
        if (!improvedCV.success || !coverLetter.success || !recruiterTips.success || !changesOverview.success) {
            console.error('❌ Extraction failed for one or more sections. AI response format might be incorrect.');
            console.error('Full AI Response (first 500 chars):', fullText.substring(0, 500));
            // Decide how to handle this - maybe return an error or use fallback messages?
            // For now, we'll proceed but the data might be incomplete/fallback text
        }
        console.log('--- END EXTRACTION PHASE ---\n');

        // Prepare response data
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

        // --- Save to Cache ---
        console.log('💾 Saving result to cache...');
        const cacheSaved = await saveToCache(currentCV, jobDescription, language, responseData);
        if (cacheSaved) {
          console.log('✅ Successfully saved to cache');
        } else {
          console.log('⚠️ Cache save failed (non-critical)');
        }
        responseData.metadata.cached = false; // Mark this response as not coming from cache
        responseData.metadata.hitCount = 1; // Initial hit count
        // --- End Save to Cache ---

        // --- Final Summary Logging ---
        try {
          console.log('\n--- FINAL DATA SUMMARY ---');
          console.log(`CV: ${improvedCV?.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${improvedCV?.content?.length || 0} chars)`);
          console.log(`Cover Letter: ${coverLetter?.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${coverLetter?.content?.length || 0} chars)`);
          console.log(`Tips: ${recruiterTips?.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${recruiterTips?.content?.length || 0} chars)`);
          console.log(`Changes: ${changesOverview?.success ? '✅ EXTRACTED' : '❌ FALLBACK'} (${changesOverview?.content?.length || 0} chars)`);
          console.log('--- END SUMMARY ---\n');
        } catch (logError) {
          console.error('❌ Error in summary logging (non-critical):', logError.message);
        }

        // --- Success Return ---
        console.log('✅ Processing complete. Returning successful response.');

        // Add rate limit info to response (with safe defaults)
        try {
          responseData.rateLimit = {
            used: rateLimit?.used || 0,
            total: rateLimit?.total || 10,
            remaining: rateLimit?.remaining || 10,
            isDeveloperMode: rateLimit?.isDeveloperMode || false
          };

          console.log('📊 Rate limit info added');
          console.log('📦 Response keys:', Object.keys(responseData).join(', '));

          const responseBody = JSON.stringify(responseData);
          console.log('📏 Response size:', responseBody.length, 'chars');

          return {
            statusCode: 200,
            headers: {
              ...headers,
              ...(rateLimit?.headers || {})
            },
            body: responseBody,
          };
        } catch (responseError) {
          console.error('❌ CRITICAL: Error building response:', responseError);
          console.error('Stack:', responseError.stack);
          throw responseError; // Re-throw to outer catch
        }

    } catch (apiError) { // Catch errors specifically from the inner try block (Prompt/API/Extraction)
        console.error('❌❌ CRITICAL ERROR during AI processing phase: ❌❌');
        console.error('Error name:', apiError.name);
        console.error('Error message:', apiError.message);
        console.error('Error stack:', apiError.stack); // Essential for debugging

        // Return a detailed error response
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed during AI prompt generation, API call, or response extraction',
            message: apiError.message,
            name: apiError.name,
          }),
        };
    }
    // === END Inner Try-Catch ===

  } catch (error) { // Catch errors from the outer try block (e.g., form parsing, general setup)
    console.error('❌ General Error processing CV:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error while processing CV (General Setup)',
        message: error.message
      }),
    };
  }
}; // End of exports.handler

// ==============================================================
// Helper Functions (extractSection and createPrompt)
// ==============================================================

/**
 * Extracts a section robustly, looking for the next start marker as a fallback.
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

    // Robust Fallback: If end marker is missing, find the next *different* start marker
    if (endIndex === -1) {
      console.log(`⚠️  Could not find ${endMarker}. Using ROBUST FALLBACK (searching for next START marker).`);
      let nearestNextStartIndex = fullText.length; // Default to end of text
      for (const marker of ALL_START_MARKERS) {
        if (marker === startMarker) continue; // Skip self
        const nextMarkerIndex = fullText.indexOf(marker, contentStart);
        if (nextMarkerIndex !== -1 && nextMarkerIndex < nearestNextStartIndex) {
          nearestNextStartIndex = nextMarkerIndex;
        }
      }
      endIndex = nearestNextStartIndex;
      console.log(`✅ Robust fallback found end at index ${endIndex}.`);
    }

    // Extract content
    let content = fullText.substring(contentStart, endIndex).trim();

    // Validation & Cleanup
    if (!content || content.length < 5) { // Adjusted min length slightly
      console.log(`⚠️  Extracted content too short or empty: ${content ? content.length : 0} chars for ${startMarker}`);
      // Returning fallback message but marking as potentially failed/short
      return { success: false, content: fallbackMessage + ` (Short content: ${content ? content.length : 0} chars)` };
    }

    // Check for contamination (includes another start tag)
    for (const marker of ALL_START_MARKERS) {
      if (marker === startMarker) continue;
      if (content.includes(marker)) {
        console.log(`❌ VALIDATION FAILED: Content for ${startMarker} is contaminated with ${marker}! Attempting cleanup.`);
        const contaminationIndex = content.indexOf(marker);
        content = content.substring(0, contaminationIndex).trim();
        console.log(`✨ Content cleaned. New length: ${content.length}`);
        // Re-validate length after cleanup
        if (!content || content.length < 5) {
             console.log(`⚠️ Content too short after cleanup for ${startMarker}`);
             return { success: false, content: fallbackMessage + ` (Short after cleanup)` };
        }
      }
    }

    return { success: true, content };

  } catch (error) {
    console.error(`❌ Error extracting section ${startMarker}:`, error);
    return { success: false, content: fallbackMessage };
  }
}

/**
 * Creates the simplified prompt asking only for the selected language.
 */
function createPrompt(currentCV, jobDescription, language) {
  const isDutch = language === 'nl';
  const instructionLanguage = isDutch ? 'Dutch (Nederlands)' : 'English';
  const changesOverviewTitle = isDutch ? '📝 Overzicht van Wijzigingen' : '📝 Changes Overview';
  const changesIntro = isDutch ? 'Hieronder zie je alle wijzigingen die zijn aangebracht in je CV, gegroepeerd per sectie.' : 'Below you\'ll see all changes made to your CV, grouped by section.';
  const changesSectionNames = isDutch ?
    ['Samenvatting Sectie', 'Werkervaring Sectie', 'Vaardigheden Sectie', 'Opleidingen Sectie'] :
    ['Summary Section', 'Experience Section', 'Skills Section', 'Education Section'];
  const originalLabel = isDutch ? 'Origineel' : 'Original';
  const improvedLabel = isDutch ? 'Verbeterd' : 'Improved';
  const whyLabel = isDutch ? 'Waarom dit belangrijk is' : 'Why this matters';
  const impactLabel = isDutch ? 'Impact' : 'Impact';
  const nextChangeLabel = isDutch ? 'Volgende wijziging' : 'Next change';
  const changeInSectionLabel = isDutch ? 'Wijziging in' : 'Change in';

  const summaryBlock = isDutch ? `
### 📊 Samenvatting
**Totaal aantal wijzigingen:** [nummer]
**Wijzigingen per sectie:**
- Samenvatting: [aantal] wijzigingen
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

**CRITICAL: Generate content ONLY in ${instructionLanguage}. Do NOT include explanations or text in other languages.**

**IMPORTANT OUTPUT FORMAT:**
You MUST wrap each section with the exact markers shown below. Do not skip any section. Ensure proper line breaks before and after each marker.

---IMPROVED_CV_START---
[Your improved CV in ${instructionLanguage} - Use standard markdown formatting. Focus on optimizing content based on the job description while trying to maintain the original structure.]
---IMPROVED_CV_END---

---COVER_LETTER_START---
[Your professional cover letter in ${instructionLanguage}. Keep it concise (around 300-400 words) and directly address the job requirements.]
---COVER_LETTER_END---

---RECRUITER_TIPS_START---
[Your recruiter conversation tips in ${instructionLanguage} - Use markdown with headers (##) for each topic and bullet points (*).]
---RECRUITER_TIPS_END---

---CHANGES_OVERVIEW_START---
[Your detailed changes overview in ${instructionLanguage}. Follow the specific structured format below.]
---CHANGES_OVERVIEW_END---

## Instructions for CV Improvement (Output language: ${instructionLanguage}):
- Enhance bullet points to showcase achievements relevant to the job requirements.
- Quantify accomplishments with numbers whenever possible.
- Integrate keywords from the job description naturally.
- Use strong action verbs.
- Ensure clarity, conciseness, and impact.
- Maintain a professional tone and honesty.

## Instructions for Cover Letter (Output language: ${instructionLanguage}):
- Personalize the letter to the company and role.
- Directly reference 2-3 specific requirements from the job description and link them to your experience.
- Briefly highlight your most relevant achievements.
- Convey enthusiasm for the role and alignment with company culture (if known).

## Instructions for Recruiter Tips (Output language: ${instructionLanguage}):
Create a section with these exact topics using markdown headers (##) and bullet points (*):
## Key Points to Emphasize
## Questions They Might Ask
## Questions You Should Ask
## Potential Red Flags
## Salary Negotiation Approach
## Cultural Fit Clues
## Next Steps After Interview

## Instructions for Changes Overview (Output language: ${instructionLanguage}):
Create a comprehensive, STRUCTURED list of ALL meaningful changes made to the CV, GROUPED BY CV SECTION. Use the exact format below.

**${changesOverviewTitle}**

${changesIntro}

## ${changesSectionNames[0]}

### 1. [Name of the change in ${instructionLanguage}]
**${originalLabel}:**
[Quote the original text snippet here]

**${improvedLabel}:**
[Quote the new, improved text snippet here]

**${whyLabel}:**
[Explain clearly in ${instructionLanguage} how this change strengthens the CV for THIS SPECIFIC JOB, referencing keywords or requirements from the job description.]

**${impactLabel}:** ⭐⭐⭐⭐⭐ (Rate 1-5 stars based on relevance to the job description)

---

### 2. [${nextChangeLabel} in ${changesSectionNames[0]}...]
**${originalLabel}:**
[...]
**${improvedLabel}:**
[...]
**${whyLabel}:**
[...]
**${impactLabel}:** ⭐⭐⭐⭐

--- (Use --- only BETWEEN changes, not after the last one in a section)

## ${changesSectionNames[1]}

### 1. [${changeInSectionLabel} ${changesSectionNames[1]}...]
**${originalLabel}:**
[...]
**${improvedLabel}:**
[...]
**${whyLabel}:**
[...]
**${impactLabel}:** ⭐⭐⭐⭐⭐

---

## ${changesSectionNames[2]}

### 1. [${changeInSectionLabel} ${changesSectionNames[2]}...]
...

---

## ${changesSectionNames[3]}

### 1. [${changeInSectionLabel} ${changesSectionNames[3]}...]
...

--- (End of changes list, followed by summary)

${summaryBlock}

**CRITICAL RULES FOR CHANGES OVERVIEW:**
- Provide 8-15 specific, meaningful changes.
- Group changes accurately under the correct CV section headers (##).
- Use the exact 'Original:', 'Improved:', 'Why this matters:', 'Impact:' labels (or Dutch equivalent).
- Explain the 'Why' by connecting the change directly to the job description.
- Use the --- separator strictly between changes.
- Ensure the final output is ONLY in ${instructionLanguage}.

---

## Input CV:
${currentCV}

## Input Job Description:
${jobDescription}

Remember to use the exact START and END markers around each of the four sections. Double-check your output for correctness and adherence to the format.`;
} // End of createPrompt function
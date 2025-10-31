// netlify/functions/translate.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Translation function using Gemini API
 * Endpoint: /.netlify/functions/translate
 * Method: POST
 *
 * Body: {
 *   content: { cv, cover, tips, changes },
 *   targetLanguage: 'en' | 'nl',
 *   sourceLanguage: 'nl' | 'en'
 * }
 */
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
    const body = JSON.parse(event.body);
    const { content, targetLanguage, sourceLanguage } = body;

    // Validate inputs
    if (!content || !targetLanguage) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: content, targetLanguage'
        }),
      };
    }

    // Validate languages
    if (!['en', 'nl'].includes(targetLanguage) || !['en', 'nl'].includes(sourceLanguage)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid language. Supported: en, nl'
        }),
      };
    }

    console.log(`🌐 Translating from ${sourceLanguage} to ${targetLanguage}`);
    console.log(`📝 Content pieces: ${Object.keys(content).join(', ')}`);

    // Create translation prompt
    const prompt = createTranslationPrompt(content, sourceLanguage, targetLanguage);

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('🤖 Calling Gemini for translation...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text();

    console.log(`✅ Translation received: ${translatedText.length} chars`);

    // Parse the translated sections
    const translated = {
      cv: extractSection(translatedText, '---CV_START---', '---CV_END---'),
      cover: extractSection(translatedText, '---COVER_START---', '---COVER_END---'),
      tips: extractSection(translatedText, '---TIPS_START---', '---TIPS_END---'),
      changes: extractSection(translatedText, '---CHANGES_START---', '---CHANGES_END---')
    };

    console.log('✅ All sections extracted successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        translated,
        sourceLanguage,
        targetLanguage,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('❌ Translation error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Translation failed',
        message: error.message
      }),
    };
  }
};

/**
 * Create translation prompt for Gemini
 */
function createTranslationPrompt(content, sourceLanguage, targetLanguage) {
  const sourceName = sourceLanguage === 'nl' ? 'Dutch' : 'English';
  const targetName = targetLanguage === 'nl' ? 'Dutch' : 'English';

  return `You are a professional translator specializing in CV and career documents.

Translate the following content from ${sourceName} to ${targetName}.

**IMPORTANT RULES:**
1. Maintain all markdown formatting (headers, bold, italic, lists, etc.)
2. Preserve professional tone and terminology
3. Keep technical terms and job titles accurate
4. Maintain the same structure and organization
5. Use natural, fluent ${targetName}
6. Do not add or remove any information
7. Wrap each section with the exact markers shown below

**OUTPUT FORMAT:**
You must wrap each translated section with these exact markers:

---CV_START---
[Translated CV content in ${targetName}]
---CV_END---

---COVER_START---
[Translated cover letter in ${targetName}]
---COVER_END---

---TIPS_START---
[Translated recruiter tips in ${targetName}]
---TIPS_END---

---CHANGES_START---
[Translated changes overview in ${targetName}]
---CHANGES_END---

---

**CONTENT TO TRANSLATE:**

## CV Content:
${content.cv || 'N/A'}

## Cover Letter:
${content.cover || 'N/A'}

## Recruiter Tips:
${content.tips || 'N/A'}

## Changes Overview:
${content.changes || 'N/A'}

---

**TRANSLATION NOTES:**
- For ${targetName === 'Dutch' ? 'Dutch' : 'English'} translations:
  ${targetName === 'Dutch' ?
    '- Use formal "u" form, not "jij"\n  - Keep English technical terms when commonly used in Dutch business\n  - Translate job titles appropriately (e.g., "Software Engineer" → "Software Engineer" or "Softwareontwikkelaar")' :
    '- Use professional business English\n  - Maintain American or British English consistency\n  - Translate Dutch-specific terms (e.g., "HBO" → "University of Applied Sciences")'
  }

Begin translation now. Remember to use the exact markers for each section!`;
}

/**
 * Extract a section from the full text using start and end markers
 */
function extractSection(fullText, startMarker, endMarker) {
  try {
    const startIndex = fullText.indexOf(startMarker);

    if (startIndex === -1) {
      console.warn(`⚠️ Could not find ${startMarker}`);
      return '';
    }

    const contentStart = startIndex + startMarker.length;
    let endIndex = fullText.indexOf(endMarker, contentStart);

    if (endIndex === -1) {
      // If end marker not found, try to find next section
      const nextMarkers = [
        '---CV_START---', '---CV_END---',
        '---COVER_START---', '---COVER_END---',
        '---TIPS_START---', '---TIPS_END---',
        '---CHANGES_START---', '---CHANGES_END---'
      ].filter(m => m !== startMarker && m !== endMarker);

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
    return content;

  } catch (error) {
    console.error(`❌ Error extracting section ${startMarker}:`, error);
    return '';
  }
}

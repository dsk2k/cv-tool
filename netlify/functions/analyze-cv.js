// analyze-cv.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parse } = require('parse-multipart-data');
const pdf = require('pdf-parse'); // FIX

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => { //  FIX
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
    // === DIT IS DE GROTE WIJZIGING ===
    // 1. Haal de 'boundary' uit de headers
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const boundary = contentType.split('boundary=')[1];
    
    // 2. Converteer de body van base64 naar een Buffer
    const bodyBuffer = Buffer.from(event.body, 'base64');

    // 3. Parse de multipart data
    const parts = parse(bodyBuffer, boundary);

    // 4. Haal de velden en het bestand eruit
    const cvFilePart = parts.find(part => part.name === 'cvFile');
    const jobDescriptionPart = parts.find(part => part.name === 'jobDescription');
    // const emailPart = parts.find(part => part.name === 'email'); // Optioneel

    if (!cvFilePart || !jobDescriptionPart) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing cvFile or jobDescription' }),
      };
    }

    const jobDescription = jobDescriptionPart.data.toString('utf-8');
    
    // 5. Lees de tekst uit de PDF buffer
    const pdfData = await pdf(cvFilePart.data);
    const currentCV = pdfData.text; // Dit is nu de CV-tekst!
    // === EINDE VAN DE WIJZIGING ===


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
    
    // ... de rest van je code (vanaf regel 55) blijft hetzelfde ...
    // ... want vanaf hier heb je `currentCV` en `jobDescription` als tekst ...
    
    console.log('🚀 Starting CV analysis...');
    console.log(`📄 CV length: ${currentCV.length} chars`);
    console.log(`💼 Job description length: ${jobDescription.length} chars`);

    // Create the prompt (DEZE FUNCTIE BESTAAT AL ONDERAAN JE BESTAND)
    const prompt = createPrompt(currentCV, jobDescription, 'en'); // Je kunt 'language' ook nog toevoegen aan de form data

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('🤖 Calling Gemini API...');
    const result = await model.generateContent(prompt);
    // ... de rest van je logica ...
    
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
    // ... etc.

    // (Zorg ervoor dat de functies createPrompt en extractSection nog steeds 
    // onderaan je bestand staan, net als voorheen)
    
    // === PLAATS HIER DE REST VAN JE CODE (vanaf regel 75) ===
    // ...
    // ...
    // ...
    // (De code voor het parsen van de Gemini-response en het terugsturen van de JSON)
    // ...
    // ...
    // === EINDIG MET JE CATCH BLOCK EN DE HELPER FUNCTIES ===
    
    // --- DIT IS EEN VOORBEELD ---
    // (Je moet de code vanaf regel 75 tot het einde plakken)
    
    console.log(`${improvedCV.success ? '✅' : '❌'} CV extraction: ${improvedCV.content.length} chars`);
    // ... (alle andere extracties) ...
    
    const responseData = {
      improvedCV: improvedCV.content,
      coverLetter: '...', // (vul hier je echte variabelen in)
      recruiterTips: '...',
      changesOverview: '...', 
      metadata: {
        originalCVLength: currentCV.length,
        jobDescriptionLength: jobDescription.length,
        language: 'en',
        timestamp: new Date().toISOString(),
      }
    };

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

// Zorg dat deze functies onderaan je bestand blijven staan
function extractSection(fullText, startMarker, endMarker, fallbackMessage) {
  // ... (deze functie is prima)
  try {
    const startIndex = fullText.indexOf(startMarker);
    
    if (startIndex === -1) {
      console.log(`⚠️  Could not find ${startMarker}`);
      return { success: false, content: fallbackMessage };
    }

    const contentStart = startIndex + startMarker.length;
    let endIndex = fullText.indexOf(endMarker, contentStart);
    
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

function createPrompt(currentCV, jobDescription, language) {
  // ... (deze functie is ook prima)
  const isNL = language === 'nl';
  
  return `You are an expert CV consultant and career coach. Your task is to:
  // ... (de rest van je prompt)
  ---

## Original CV:
${currentCV}

## Job Description:
${jobDescription}

Remember: Use the exact markers shown above for each section. The system relies on these markers to parse your response correctly.`;
}
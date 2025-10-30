const { GoogleGenerativeAI } = require('@google/generative-ai');
const multipart = require('parse-multipart-data');
const { checkCache, saveToCache } = require('./cache-helper');
const { rateLimitMiddleware } = require('./rate-limiter');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Parse form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const boundary = multipart.getBoundary(contentType);
    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);

    const cvFilePart = parts.find(part => part.name === 'cvFile');
    const jobDescriptionPart = parts.find(part => part.name === 'jobDescription');
    const languagePart = parts.find(part => part.name === 'language');

    if (!cvFilePart || !jobDescriptionPart) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const jobDescription = jobDescriptionPart.data.toString('utf-8');
    const language = languagePart ? languagePart.data.toString('utf-8') : 'nl';

    // Parse PDF
    const pdfParser = await import('pdf-parse');
    const pdfData = await pdfParser.default(cvFilePart.data);
    const cvText = pdfData.text;

    console.log(`📄 Generating improved CV (${cvText.length} chars)`);

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const prompt = `You are an expert CV optimizer. Improve this CV for the job description provided. Respond in ${lang}.

Job Description:
${jobDescription}

Current CV:
${cvText}

Provide ONLY the improved CV text, optimized for:
1. Keywords from the job description
2. ATS-friendly formatting
3. Clear structure
4. Relevant skills highlighted

Improved CV:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      }
    });

    const result = await model.generateContent(prompt);
    const improvedCV = result.response.text();

    console.log(`✅ Improved CV generated (${improvedCV.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ improvedCV })
    };

  } catch (error) {
    console.error('❌ Error generating CV:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

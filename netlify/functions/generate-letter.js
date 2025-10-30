const { GoogleGenerativeAI } = require('@google/generative-ai');

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

  try {
    const { cvText, jobDescription, language } = JSON.parse(event.body);

    console.log(`✉️ Generating cover letter`);
    console.log(`📋 cvText length: ${cvText?.length || 0}, jobDesc length: ${jobDescription?.length || 0}`);

    if (!cvText || !jobDescription || !language) {
      throw new Error(`Missing required fields: cvText=${!!cvText}, jobDescription=${!!jobDescription}, language=${!!language}`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';

    // Limit input to avoid timeouts
    const cvSummary = cvText.substring(0, 1000);
    const jobSummary = jobDescription.substring(0, 1500);

    const prompt = `Write cover letter in ${lang}.

Job: ${jobSummary}
CV: ${cvSummary}

Write professional letter (3-4 paragraphs): enthusiasm, relevant experience, good fit.

Letter:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 800, // Reduced from 1024
        temperature: 0.8,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const coverLetter = result.response.text();

    console.log(`✅ Cover letter generated (${coverLetter.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ coverLetter })
    };

  } catch (error) {
    console.error('❌ Error generating cover letter:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

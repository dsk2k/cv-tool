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

    // Aggressive limits for speed
    const cvSummary = cvText.substring(0, 800);
    const jobSummary = jobDescription.substring(0, 1000);

    const prompt = `Cover letter in ${lang}.

Job: ${jobSummary}
CV: ${cvSummary}

3 paragraphs: enthusiasm, fit, experience.

Letter:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        maxOutputTokens: 600, // Reduced: 800 → 600 for speed
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

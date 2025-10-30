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
    const { jobDescription, language } = JSON.parse(event.body);

    console.log(`💡 Generating recruiter tips`);
    console.log(`📋 jobDesc length: ${jobDescription?.length || 0}, language: ${language}`);

    if (!jobDescription || !language) {
      throw new Error(`Missing required fields: jobDescription=${!!jobDescription}, language=${!!language}`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const jobSummary = jobDescription.substring(0, 1000);

    const prompt = `Recruiter tips in ${lang}.

Job: ${jobSummary}

5-7 bullet points: stand out, interview prep, key skills.

Tips:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 500, // Reduced: 700 → 500 for speed
        temperature: 0.7,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const recruiterTips = result.response.text();

    console.log(`✅ Recruiter tips generated (${recruiterTips.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recruiterTips })
    };

  } catch (error) {
    console.error('❌ Error generating tips:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

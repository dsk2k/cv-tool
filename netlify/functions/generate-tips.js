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

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const prompt = `You are a professional recruiter. Provide insider tips for applying to this role in ${lang}.

Job Description:
${jobDescription}

Provide 8-10 specific, actionable tips in bullet point format about:
1. What recruiters look for
2. How to stand out
3. Interview preparation
4. Common mistakes to avoid
5. Skills to emphasize

Tips (as bullet points):`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1024,
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

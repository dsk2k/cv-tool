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

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const prompt = `You are a professional cover letter writer. Write a compelling cover letter in ${lang}.

Job Description:
${jobDescription}

Applicant's CV Summary:
${cvText.substring(0, 1000)}

Write a professional, engaging cover letter that:
1. Shows enthusiasm for the role
2. Highlights relevant experience from CV
3. Explains why they're a great fit
4. Is concise (3-4 paragraphs)

Cover Letter:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1024,
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

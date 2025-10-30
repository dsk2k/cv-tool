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
    const { originalCV, improvedCV, language } = JSON.parse(event.body);

    console.log(`📝 Generating changes overview`);

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const prompt = `Compare these two CV versions and summarize the key improvements in ${lang}.

Original CV (first 500 chars):
${originalCV.substring(0, 500)}

Improved CV (first 500 chars):
${improvedCV.substring(0, 500)}

Provide a concise summary of:
1. Main changes made
2. Why these changes improve the CV
3. Impact on applicant's presentation

Summary:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const changesOverview = result.response.text();

    console.log(`✅ Changes overview generated (${changesOverview.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ changesOverview })
    };

  } catch (error) {
    console.error('❌ Error generating changes:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

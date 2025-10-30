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
    const labels = language === 'nl'
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom beter' }
      : { original: 'Original', improved: 'Improved', why: 'Why better' };

    const prompt = `Compare these two CV versions and list the key improvements in ${lang}.

Original CV:
${originalCV.substring(0, 1000)}

Improved CV:
${improvedCV.substring(0, 1000)}

Format your response EXACTLY like this (using ${lang}):

### 1. [Change title]

**${labels.original}:** [Brief description of original version]
**${labels.improved}:** [Brief description of improved version]
**${labels.why}:** [Why this improvement matters]

### 2. [Second change title]

**${labels.original}:** [Brief description]
**${labels.improved}:** [Brief description]
**${labels.why}:** [Why this matters]

List 3-5 of the MOST IMPORTANT changes only.`;

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

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

    console.log(`🎯 Generating ATS & Keywords analysis`);

    if (!originalCV || !improvedCV || !language) {
      throw new Error(`Missing required fields`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const labels = language === 'nl'
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom beter' }
      : { original: 'Original', improved: 'Improved', why: 'Why better' };

    const prompt = `ATS & Keywords verbeteringen in ${lang}.

VOOR:
${originalCV.substring(0, 2500)}

NA:
${improvedCV.substring(0, 2500)}

Formaat:

### 1. [ATS verbetering]

**${labels.original}:** [Was]
**${labels.improved}:** [Nu]
**${labels.why}:** [Impact]

Geef 2-3 verbeteringen: keywords, ATS format, skills.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 500, // Reduced: 700 → 500 for speed
        temperature: 0.7,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const atsChanges = result.response.text();

    console.log(`✅ ATS analysis generated (${atsChanges.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ atsChanges })
    };

  } catch (error) {
    console.error('❌ Error generating ATS analysis:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

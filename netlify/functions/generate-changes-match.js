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
    const { originalCV, improvedCV, jobDescription, language } = JSON.parse(event.body);

    console.log(`🎯 Generating Job Match & Targeting analysis`);

    if (!originalCV || !improvedCV || !jobDescription || !language) {
      throw new Error(`Missing required fields`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const labels = language === 'nl'
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom beter' }
      : { original: 'Original', improved: 'Improved', why: 'Why better' };

    const prompt = `Job Match verbeteringen in ${lang}.

JOB:
${jobDescription.substring(0, 800)}

VOOR:
${originalCV.substring(0, 2000)}

NA:
${improvedCV.substring(0, 2000)}

Formaat:

### 1. [Match verbetering]

**${labels.original}:** [Was]
**${labels.improved}:** [Nu]
**${labels.why}:** [Impact]

Geef 2 verbeteringen: relevante ervaring, skills match.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 400, // Reduced: 600 → 400 for speed
        temperature: 0.7,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const matchChanges = result.response.text();

    console.log(`✅ Match analysis generated (${matchChanges.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ matchChanges })
    };

  } catch (error) {
    console.error('❌ Error generating Match analysis:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
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

    console.log(`💥 Generating Impact & Results analysis`);

    if (!originalCV || !improvedCV || !language) {
      throw new Error(`Missing required fields`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const labels = language === 'nl'
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom beter' }
      : { original: 'Original', improved: 'Improved', why: 'Why better' };

    const prompt = `Vergelijk deze CV's en geef Impact verbeteringen in ${lang}.

ORIGINEEL:
${originalCV.substring(0, 2500)}

VERBETERD:
${improvedCV.substring(0, 2500)}

BELANGRIJK: Gebruik EXACT dit formaat, vul ALLE velden in:

### 1. [Titel van verbetering]

**${labels.original}:** [Concrete beschrijving van originele CV]
**${labels.improved}:** [Concrete beschrijving van verbeterde CV]
**${labels.why}:** [Waarom dit belangrijk is]

Geef 2-3 Impact verbeteringen (cijfers, action verbs, resultaten). ALLE 3 velden zijn VERPLICHT!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 600, // Increased from 500 for complete responses
        temperature: 0.7,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const impactChanges = result.response.text();

    console.log(`✅ Impact analysis generated (${impactChanges.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ impactChanges })
    };

  } catch (error) {
    console.error('❌ Error generating Impact analysis:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

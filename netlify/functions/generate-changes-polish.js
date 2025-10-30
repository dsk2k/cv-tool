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

    console.log(`✨ Generating Professional Polish analysis`);

    if (!originalCV || !improvedCV || !language) {
      throw new Error(`Missing required fields`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const labels = language === 'nl'
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom beter' }
      : { original: 'Original', improved: 'Improved', why: 'Why better' };

    const prompt = `Vergelijk deze CV's en geef Polish verbeteringen in ${lang}.

ORIGINEEL:
${originalCV.substring(0, 2000)}

VERBETERD:
${improvedCV.substring(0, 2000)}

BELANGRIJK: Gebruik EXACT dit formaat, vul ALLE velden in:

### 1. [Titel van verbetering]

**${labels.original}:** [Concrete beschrijving van originele CV]
**${labels.improved}:** [Concrete beschrijving van verbeterde CV]
**${labels.why}:** [Waarom dit belangrijk is]

Geef 2 Polish verbeteringen (tone, formatting, structuur). ALLE 3 velden zijn VERPLICHT!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 500, // Increased from 400 for complete responses
        temperature: 0.7,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const polishChanges = result.response.text();

    console.log(`✅ Polish analysis generated (${polishChanges.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ polishChanges })
    };

  } catch (error) {
    console.error('❌ Error generating Polish analysis:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
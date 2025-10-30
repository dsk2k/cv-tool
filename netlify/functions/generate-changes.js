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
    console.log(`📋 originalCV length: ${originalCV?.length || 0}, improvedCV length: ${improvedCV?.length || 0}`);

    if (!originalCV || !improvedCV || !language) {
      throw new Error(`Missing required fields: originalCV=${!!originalCV}, improvedCV=${!!improvedCV}, language=${!!language}`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const labels = language === 'nl'
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom beter' }
      : { original: 'Original', improved: 'Improved', why: 'Why better' };

    // Limit input to most important parts
    const origSummary = originalCV.substring(0, 2000);
    const improvedSummary = improvedCV.substring(0, 2000);

    const prompt = `Vergelijk CV's en lijst belangrijkste verbeteringen in ${lang}.

ORIGINEEL:
${origSummary}

VERBETERD:
${improvedSummary}

Formaat:

### 1. [Titel]

**${labels.original}:** [Hoe was het]
**${labels.improved}:** [Hoe is het nu]
**${labels.why}:** [Waarom belangrijk voor recruiters]

Geef 6-8 verbeteringen over: ATS, keywords, professionaliteit, structuur, impact.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1500, // Reduced from 2048 but still detailed
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

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

    const prompt = `Vergelijk deze twee CV-versies in detail en lijst ALLE belangrijke verbeteringen op in ${lang}.

ORIGINELE CV:
${originalCV}

VERBETERDE CV:
${improvedCV}

Geef een UITGEBREIDE analyse van alle veranderingen. Gebruik dit EXACTE formaat (in ${lang}):

### 1. [Titel van verandering]

**${labels.original}:** [Gedetailleerde beschrijving van hoe het was]
**${labels.improved}:** [Gedetailleerde beschrijving van hoe het nu is]
**${labels.why}:** [Uitgebreide uitleg waarom dit belangrijk is voor recruiters en waarom dit de kans op een interview vergroot]

### 2. [Tweede verandering]

**${labels.original}:** [Gedetailleerde beschrijving]
**${labels.improved}:** [Gedetailleerde beschrijving]
**${labels.why}:** [Uitgebreide uitleg met concrete voordelen]

BELANGRIJK:
- Analyseer ALLE secties: persoonlijke info, samenvatting, werkervaring, opleidingen, vaardigheden
- Lijst 8-12 verbeteringen (niet slechts 3-5)
- Wees specifiek over wat er veranderd is
- Leg uit HOE elke verandering de kans op een interview vergroot
- Vermeld concrete voorbeelden uit de CV's
- Focus op: professionaliteit, ATS-optimalisatie, impact statements, kwantificeerbare resultaten`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 2048,
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

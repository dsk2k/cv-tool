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

    const prompt = `Vergelijk deze CV's en geef gedetailleerde ATS verbeteringen in ${lang}.

ORIGINEEL:
${originalCV.substring(0, 2500)}

VERBETERD:
${improvedCV.substring(0, 2500)}

BELANGRIJK: Gebruik EXACT dit formaat, vul ALLE velden UITGEBREID in:

### 1. [Precieze titel van de verbetering]

**${labels.original}:** [GEDETAILLEERDE beschrijving van wat er in het originele CV stond. Gebruik concrete voorbeelden en citaten uit het CV. Leg precies uit wat er ontbrak of niet optimaal was. Minimaal 2-3 zinnen.]

**${labels.improved}:** [GEDETAILLEERDE beschrijving van wat er in het verbeterde CV staat. Gebruik concrete voorbeelden en citaten. Leg precies uit wat er is toegevoegd, verbeterd of geoptimaliseerd. Laat zien HOE de verbetering is doorgevoerd. Minimaal 2-3 zinnen.]

**${labels.why}:** [UITGEBREIDE uitleg waarom deze verbetering belangrijk is voor ATS-systemen en recruiters. Leg uit welk probleem het oplost, waarom het de kans op selectie vergroot, en welke specifieke voordelen het biedt. Gebruik cijfers en feiten waar mogelijk. Minimaal 3-4 zinnen.]

Geef 2-3 ATS verbeteringen (keywords, formatting, skills). Focus op:
- Specifieke keywords die zijn toegevoegd
- Verbeteringen in formatting voor ATS-leesbaarheid
- Skills die beter zichtbaar zijn gemaakt
- Technische termen die zijn toegevoegd

Wees SPECIFIEK en GEDETAILLEERD. ALLE 3 velden zijn VERPLICHT en moeten UITGEBREID zijn!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1000, // Increased for detailed responses
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

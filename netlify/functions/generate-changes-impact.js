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

    const prompt = `Vergelijk deze CV's en geef gedetailleerde Impact & Resultaten verbeteringen in ${lang}.

ORIGINEEL:
${originalCV.substring(0, 2500)}

VERBETERD:
${improvedCV.substring(0, 2500)}

BELANGRIJK: Gebruik EXACT dit formaat, vul ALLE velden UITGEBREID in:

### 1. [Precieze titel van de impact-verbetering]

**${labels.original}:** [GEDETAILLEERDE beschrijving van hoe resultaten in het originele CV waren geformuleerd. Citeer exacte zinnen. Leg uit wat er ontbrak: waren er geen cijfers? Vaag geformuleerd? Geen kwantificeerbare resultaten? Minimaal 2-3 zinnen met concrete voorbeelden.]

**${labels.improved}:** [GEDETAILLEERDE beschrijving van hoe resultaten nu zijn verbeterd. Citeer exacte zinnen uit het verbeterde CV. Laat zien welke cijfers, percentages of metrics zijn toegevoegd. Beschrijf hoe action verbs zijn verbeterd. Leg uit HOE de impact nu meetbaar en overtuigend is gemaakt. Minimaal 2-3 zinnen met concrete voorbeelden.]

**${labels.why}:** [UITGEBREIDE uitleg waarom deze verbetering zo krachtig is. Leg uit waarom kwantificeerbare resultaten recruiters overtuigen. Beschrijf hoe dit je onderscheidt van andere kandidaten. Noem de psychologische impact van concrete cijfers. Gebruik onderzoek en best practices waar mogelijk (bijv. "CV's met cijfers zijn 60% effectiever"). Minimaal 3-4 zinnen.]

Geef 2-3 Impact verbeteringen. Focus op:
- Kwantificeerbare resultaten (cijfers, percentages, bedragen)
- Sterke action verbs (van "verantwoordelijk voor" naar "ontwikkeld", "gerealiseerd")
- Meetbare achievements en successen
- Voor/na vergelijkingen die impact tonen

Wees SPECIFIEK met exacte cijfers en voorbeelden. ALLE 3 velden zijn VERPLICHT en moeten UITGEBREID zijn!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1000, // Increased for detailed responses
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

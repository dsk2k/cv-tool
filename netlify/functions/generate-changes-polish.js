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

    const prompt = `Vergelijk deze CV's en geef gedetailleerde Professionele Polish verbeteringen in ${lang}.

ORIGINEEL:
${originalCV.substring(0, 2500)}

VERBETERD:
${improvedCV.substring(0, 2500)}

BELANGRIJK: Gebruik EXACT dit formaat, vul ALLE velden UITGEBREID in:

### 1. [Precieze titel van de polish-verbetering]

**${labels.original}:** [GEDETAILLEERDE beschrijving van de professionele uitstraling van het originele CV. Beschrijf de tone, taalgebruik, grammatica, consistentie, formatting. Citeer voorbeelden van onprofessionele of inconsistente elementen. Leg uit wat de visuele en tekstuele indruk was. Minimaal 2-3 zinnen met concrete voorbeelden.]

**${labels.improved}:** [GEDETAILLEERDE beschrijving van hoe de professionele uitstraling is verbeterd. Citeer voorbeelden uit het verbeterde CV. Beschrijf verbeteringen in tone (formeler, zelfverzekerder), grammatica correcties, consistentie in formatting (bullets, datums, headings), visuele hiërarchie. Leg uit HOE het nu professioneler overkomt. Minimaal 2-3 zinnen met concrete voorbeelden.]

**${labels.why}:** [UITGEBREIDE uitleg waarom professionele polish zo cruciaal is voor eerste indruk. Leg uit hoe recruiters binnen seconden oordelen op basis van professionaliteit. Beschrijf het verschil tussen een goed CV en een excellent CV. Gebruik inzichten over waarom formatting, consistentie en tone zo belangrijk zijn voor geloofwaardigheid. Minimaal 3-4 zinnen.]

Geef 2-3 Polish verbeteringen. Focus op:
- Professionele tone en taalgebruik
- Consistentie in formatting (bullets, datums, headings)
- Grammatica en spelling correcties
- Visuele hiërarchie en leesbaarheid
- Verwijdering van informele elementen

Wees SPECIFIEK met voor/na voorbeelden. ALLE 3 velden zijn VERPLICHT en moeten UITGEBREID zijn!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1000, // Increased for detailed responses
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
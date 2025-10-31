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

    const prompt = `Vergelijk deze CV's en geef gedetailleerde Job Match & Targeting verbeteringen in ${lang}.

JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

ORIGINEEL CV:
${originalCV.substring(0, 2500)}

VERBETERD CV:
${improvedCV.substring(0, 2500)}

BELANGRIJK: Gebruik EXACT dit formaat, vul ALLE velden UITGEBREID in:

### 1. [Precieze titel van de matching-verbetering]

**${labels.original}:** [GEDETAILLEERDE beschrijving van hoe het originele CV aansloot (of juist niet aansloot) bij de vacature. Citeer specifieke requirements uit de job description en vergelijk met wat er in het originele CV stond. Leg uit welke belangrijke skills, ervaring of keywords ontbraken. Beschrijf de mismatch tussen wat de werkgever zoekt en wat het CV liet zien. Minimaal 2-3 zinnen met concrete voorbeelden.]

**${labels.improved}:** [GEDETAILLEERDE beschrijving van hoe het verbeterde CV nu perfect aansluit bij de vacature. Citeer exacte matches tussen job requirements en CV content. Laat zien welke relevante ervaring nu prominent wordt getoond, welke gevraagde skills zijn toegevoegd/benadrukt, welke termen uit de vacature nu in het CV staan. Leg uit HOE het CV nu op maat is gemaakt voor deze specifieke functie. Minimaal 2-3 zinnen met concrete voorbeelden.]

**${labels.why}:** [UITGEBREIDE uitleg waarom deze targeted aanpak zo effectief is. Leg uit waarom recruiters CV's willen zien die perfect aansluiten bij hun vacature. Beschrijf hoe relevantie je kansen dramatisch verhoogt. Noem het belang van het "spiegelen" van de job description. Gebruik inzichten over ATS scoring en recruiter psychologie. Minimaal 3-4 zinnen.]

Geef 2-3 Match verbeteringen. Focus op:
- Alignment tussen gevraagde en getoonde skills
- Relevante ervaring die nu prominent staat
- Keywords uit de job description in het CV
- Herschrijven van ervaring om te matchen met functie-eisen
- Prioritering van meest relevante informatie

Wees SPECIFIEK met citaten uit zowel job description als CV. ALLE 3 velden zijn VERPLICHT en moeten UITGEBREID zijn!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1000, // Increased for detailed responses
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
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

    // Use FULL CVs for comprehensive comparison (this is the core value!)
    // Limit only if extremely long to avoid hitting API limits
    const maxLength = 12000; // ~3000 tokens - enough for most CVs
    const origCV = originalCV.length > maxLength ? originalCV.substring(0, maxLength) : originalCV;
    const improvedCV = improvedCV.length > maxLength ? improvedCV.substring(0, maxLength) : improvedCV;

    console.log(`📊 Comparing: original ${origCV.length} chars vs improved ${improvedCV.length} chars`);

    const prompt = `Analyseer ALLE wijzigingen tussen deze CV's in ${lang}. Dit is de kernwaarde van de tool!

ORIGINEEL:
${origCV}

VERBETERD:
${improvedCV}

Geef UITGEBREIDE analyse. Formaat:

### 1. [Categorie: bijv. "ATS Optimalisatie"]

**${labels.original}:** [Specifieke beschrijving van origineel]
**${labels.improved}:** [Specifieke beschrijving van verbetering]
**${labels.why}:** [Concrete impact op interview kans]

Analyseer 8-12 belangrijke wijzigingen in categorieën:
- ATS & Keywords
- Impact & Kwantificeerbare Resultaten
- Professionele Tone & Polish
- Structuur & Leesbaarheid
- Job Match & Targeting

Wees specifiek met voorbeelden uit de CV's!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 2500, // INCREASED for detailed feedback (this is the core value!)
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

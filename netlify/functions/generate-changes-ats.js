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
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom' }
      : { original: 'Original', improved: 'Improved', why: 'Why' };

    const prompt = `Je bent een professional CV expert. Vergelijk deze CV's en geef gedetailleerde ATS verbeteringen in ${lang}.

ORIGINEEL CV:
${originalCV.substring(0, 2500)}

VERBETERD CV:
${improvedCV.substring(0, 2500)}

KRITIEKE INSTRUCTIES - LEES DIT ZORGVULDIG:
1. Je MOET EXACT 3 velden invullen per verbetering: ${labels.original}, ${labels.improved}, en ${labels.why}
2. ALLE velden zijn VERPLICHT - laat NOOIT een veld leeg of met alleen "[...]"
3. Elk veld moet MINIMAAL 2-3 complete zinnen bevatten met concrete voorbeelden
4. Citeer ALTIJD specifieke tekst uit de CV's tussen aanhalingstekens
5. Vergelijk de EXACTE verschillen tussen origineel en verbeterd

EXACT VOORBEELD - Je MOET dit formaat volgen met dezelfde uitgebreidheid:

### 1. Toevoeging van Specifieke Technische Keywords en Tools

**${labels.original}:** Het originele CV gebruikte algemene termen zoals "ervaring met programmeren" en "IT vaardigheden" zonder concrete technologieën te noemen. In de werkervaring stond "ontwikkeld software oplossingen" zonder specifieke programmeertalen of frameworks. De skills sectie vermeldde enkel "computervaardigheden" en "technische achtergrond", wat te vaag is voor ATS-systemen.

**${labels.improved}:** Het geoptimaliseerde CV bevat nu expliciete technische keywords: "Python, JavaScript, React, Node.js" in de skills sectie. Bij werkervaring staat nu "Ontwikkeld microservices met Node.js en Express framework" en "Gebouwd frontend applicaties met React en TypeScript". Ook toegevoegd: "Git version control, Docker containers, AWS cloud deployment, MongoDB databases". Elke technologie wordt met naam genoemd met concrete toepassingen.

**${labels.why}:** ATS-systemen scannen op exacte keyword matches tussen vacature en CV. Zonder specifieke technologienamen wordt je CV niet gevonden bij zoekopdrachten naar "Python developer" of "React specialist", zelfs als je deze skills bezit. Recruiters zoeken gemiddeld naar 10-15 specifieke keywords per vacature. Door deze concrete keywords toe te voegen verhoog je de ATS-match score met 60-80% en kom je automatisch bovenaan de candidate ranking. Generieke termen zoals "IT vaardigheden" worden door ATS volledig genegeerd, terwijl "Python, AWS, Docker" directe matches opleveren.

### 2. [Tweede verbetering met EXACTE ZELFDE uitgebreidheid...]

**${labels.original}:** [Weer 2-3 VOLLEDIGE zinnen met citaten...]

**${labels.improved}:** [Weer 2-3 VOLLEDIGE zinnen met citaten...]

**${labels.why}:** [Weer 3-4 VOLLEDIGE zinnen met uitleg...]

### 2. [Tweede ATS-verbetering - wederom met volledige titel]

**${labels.original}:** [Weer 2-3 complete zinnen met citaten uit origineel CV...]

**${labels.improved}:** [Weer 2-3 complete zinnen met citaten uit verbeterd CV...]

**${labels.why}:** [Weer 3-4 complete zinnen met specifieke uitleg...]

LET OP: Geef 2-3 ATS verbeteringen. Focus specifiek op:
- Concrete keywords die zijn toegevoegd (noem ze met naam!)
- Formatting verbeteringen (bullets, headings, secties)
- Skills die nu expliciet worden genoemd
- Technische termen en jargon uit de industrie

VALIDATIE CHECKLIST - controleer dit voor je antwoord geeft:
✓ Heeft elke verbetering ALLE 3 velden volledig ingevuld?
✓ Bevat elk veld minimaal 2-3 (of 3-4 voor ${labels.why}) complete zinnen?
✓ Heb je specifieke tekst uit beide CV's geciteerd?
✓ Zijn er concrete voorbeelden en geen vage beschrijvingen?
✓ Is elk veld uniek en inhoudelijk verschillend van de andere velden?

BELANGRIJK: Deze content is waar klanten voor betalen. Lege of incomplete velden zijn NIET acceptabel!`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1500, // Increased further for complete detailed responses
        temperature: 0.8, // Slightly higher for more complete/creative responses
        topP: 0.95
      }
    });

    let atsChanges = '';
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`📝 Attempt ${attempt}/${maxAttempts} to generate ATS analysis`);

      const result = await model.generateContent(prompt);
      atsChanges = result.response.text();

      // VALIDATION: Check if all required fields are present (support both NL and EN)
      const hasOriginal = (atsChanges.match(/\*\*(Origineel|Original)\*\*:/gi) || []).length;
      const hasVerbeterd = (atsChanges.match(/\*\*(Verbeterd|Improved)\*\*:/gi) || []).length;
      const hasWaarom = (atsChanges.match(/\*\*(Waarom|Why)\*\*:/gi) || []).length;

      console.log(`🔍 Validation: Original=${hasOriginal}, Verbeterd=${hasVerbeterd}, Waarom=${hasWaarom}`);

      // Check if we have at least 2 complete sets
      if (hasOriginal >= 2 && hasVerbeterd >= 2 && hasWaarom >= 2) {
        console.log(`✅ ATS analysis validated (${atsChanges.length} chars)`);
        break;
      }

      console.warn(`⚠️ Incomplete output on attempt ${attempt}. Retrying with stricter prompt...`);

      if (attempt === maxAttempts) {
        console.error(`❌ Failed to generate complete output after ${maxAttempts} attempts`);
        // Use what we have, but log the issue
      }
    }

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

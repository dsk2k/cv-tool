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
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom' }
      : { original: 'Original', improved: 'Improved', why: 'Why' };

    const prompt = `Je bent een professional CV expert. Vergelijk deze CV's en geef gedetailleerde Job Match & Targeting verbeteringen in ${lang}.

JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

ORIGINEEL CV:
${originalCV.substring(0, 2500)}

VERBETERD CV:
${improvedCV.substring(0, 2500)}

KRITIEKE INSTRUCTIES - LEES DIT ZORGVULDIG:
1. Je MOET EXACT 3 velden invullen per verbetering: ${labels.original}, ${labels.improved}, en ${labels.why}
2. ALLE velden zijn VERPLICHT - laat NOOIT een veld leeg of met alleen "[...]"
3. Elk veld moet MINIMAAL 2-3 complete zinnen bevatten met concrete voorbeelden
4. Citeer ALTIJD specifieke tekst uit job description EN CV's tussen aanhalingstekens
5. Vergelijk de EXACTE verschillen tussen origineel en verbeterd

VERPLICHT FORMAAT - kopieer dit EXACT en vul ALLE placeholders volledig in:

### 1. [Precieze titel van de match-verbetering - bijvoorbeeld: "Afstemming van leiderschapservaring op vereiste 'team management skills'"]

**${labels.original}:** [Beschrijf in 2-3 complete zinnen de mismatch. Citeer uit job description EN CV. Bijvoorbeeld: "De vacature vraagt 'minimum 3 jaar leidinggevende ervaring aan teams van 5+ personen'. Het originele CV vermeldde alleen 'werkervaring in teamverband' zonder leiderschapsrol. De job description benadrukt 'stakeholder management' en 'cross-functional collaboration', maar het CV toonde geen voorbeelden hiervan."]

**${labels.improved}:** [Beschrijf in 2-3 complete zinnen de perfecte match. Citeer specifieke toevoegingen. Bijvoorbeeld: "Het verbeterde CV toont nu 'Leidinggevend aan team van 8 developers gedurende 4 jaar'. Er staat expliciet 'Stakeholder management met C-level executives en product owners'. De ervaring is herschreven naar 'Led cross-functional initiatives tussen Engineering, Product en Sales teams', exact spiegelend aan de vacature-eisen."]

**${labels.why}:** [Leg in 3-4 complete zinnen uit waarom dit werkt. Bijvoorbeeld: "Recruiters scannen op directe matches tussen hun requirements en jouw ervaring. Wanneer je exact hun terminologie gebruikt ('stakeholder management', 'cross-functional') herkennen ze onmiddellijk de fit. Een targeted CV verhoogt je kans met 3-5x omdat recruiters gemiddeld 50+ CV's bekijken - alleen perfecte matches krijgen een gesprek. Het 'spiegelen' van job description taal zorgt ervoor dat jouw CV resoneert en blijft hangen."]

### 2. [Tweede match-verbetering - wederom met volledige titel]

**${labels.original}:** [Weer 2-3 complete zinnen met citaten uit job description EN origineel CV...]

**${labels.improved}:** [Weer 2-3 complete zinnen met citaten uit verbeterd CV...]

**${labels.why}:** [Weer 3-4 complete zinnen met specifieke uitleg...]

LET OP: Geef 2-3 Match verbeteringen. Focus specifiek op:
- Directe alignment tussen job requirements en CV content (citeer beide!)
- Keywords uit vacature die nu in CV staan
- Relevante ervaring die nu prominent/eerst wordt getoond
- Herschrijven met exact dezelfde terminologie als job description

VALIDATIE CHECKLIST - controleer dit voor je antwoord geeft:
✓ Heeft elke verbetering ALLE 3 velden volledig ingevuld?
✓ Bevat elk veld minimaal 2-3 (of 3-4 voor ${labels.why}) complete zinnen?
✓ Heb je ZOWEL job description ALS CV citaten gebruikt?
✓ Zijn de matches tussen vacature en CV expliciet gemaakt?
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

    let matchChanges = '';
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`📝 Attempt ${attempt}/${maxAttempts} to generate Match analysis`);

      const result = await model.generateContent(prompt);
      matchChanges = result.response.text();

      // VALIDATION: Check if all required fields are present (support both NL and EN)
      const hasOriginal = (matchChanges.match(/\*\*(Origineel|Original)\*\*:/gi) || []).length;
      const hasVerbeterd = (matchChanges.match(/\*\*(Verbeterd|Improved)\*\*:/gi) || []).length;
      const hasWaarom = (matchChanges.match(/\*\*(Waarom|Why)\*\*:/gi) || []).length;

      console.log(`🔍 Validation: Original=${hasOriginal}, Verbeterd=${hasVerbeterd}, Waarom=${hasWaarom}`);

      if (hasOriginal >= 2 && hasVerbeterd >= 2 && hasWaarom >= 2) {
        console.log(`✅ Match analysis validated (${matchChanges.length} chars)`);
        break;
      }

      console.warn(`⚠️ Incomplete output on attempt ${attempt}. Retrying...`);

      if (attempt === maxAttempts) {
        console.error(`❌ Failed to generate complete output after ${maxAttempts} attempts`);
      }
    }

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
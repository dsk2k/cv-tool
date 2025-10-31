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
      ? { original: 'Origineel', improved: 'Verbeterd', why: 'Waarom' }
      : { original: 'Original', improved: 'Improved', why: 'Why' };

    const prompt = `Je bent een professional CV expert. Vergelijk deze CV's en geef gedetailleerde Impact & Resultaten verbeteringen in ${lang}.

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

VERPLICHT FORMAAT - kopieer dit EXACT en vul ALLE placeholders volledig in:

### 1. [Precieze titel van de impact-verbetering - bijvoorbeeld: "Kwantificering van sales resultaten met concrete percentages"]

**${labels.original}:** [Beschrijf in 2-3 complete zinnen hoe het origineel was geformuleerd. Citeer specifieke tekst. Bijvoorbeeld: "Het originele CV vermeldde 'verantwoordelijk voor sales' zonder cijfers. Er stond 'goede resultaten behaald' zonder kwantificering. De achievements waren vaag geformuleerd zoals 'bijgedragen aan teamdoelen' zonder meetbare metrics."]

**${labels.improved}:** [Beschrijf in 2-3 complete zinnen wat er nu staat. Citeer specifieke nieuwe tekst. Bijvoorbeeld: "Het verbeterde CV toont nu 'Sales verhoogd met 45% in 6 maanden (van €200k naar €290k)'. Er staat 'Nieuwe klantenwerving: 23 enterprise accounts met gemiddelde deal size van €15k'. Action verbs zijn veranderd van 'verantwoordelijk voor' naar 'Gerealiseerd', 'Behaald', 'Overtroffen met 30%'."]

**${labels.why}:** [Leg in 3-4 complete zinnen uit waarom dit cruciaal is. Bijvoorbeeld: "Recruiters onthouden kwantificeerbare prestaties 70% beter dan vage claims. Concrete cijfers maken je impact tastbaar en geloofwaardig - '45% groei' is veel overtuigender dan 'goede resultaten'. Volgens onderzoek verhogen CV's met metrics de kans op uitnodiging met 60%. Cijfers onderscheiden jou van de 90% kandidaten die alleen verantwoordelijkheden opsommen zonder resultaten te tonen."]

### 2. [Tweede impact-verbetering - wederom met volledige titel]

**${labels.original}:** [Weer 2-3 complete zinnen met citaten uit origineel CV...]

**${labels.improved}:** [Weer 2-3 complete zinnen met citaten uit verbeterd CV...]

**${labels.why}:** [Weer 3-4 complete zinnen met specifieke uitleg...]

LET OP: Geef 2-3 Impact verbeteringen. Focus specifiek op:
- Concrete cijfers, percentages, bedragen (noem ze exact!)
- Sterke action verbs ("Gerealiseerd", "Verhoogd", "Ontwikkeld" ipv "verantwoordelijk voor")
- Meetbare achievements met voor/na vergelijking
- Tijdsperiodes waarin resultaten zijn behaald

VALIDATIE CHECKLIST - controleer dit voor je antwoord geeft:
✓ Heeft elke verbetering ALLE 3 velden volledig ingevuld?
✓ Bevat elk veld minimaal 2-3 (of 3-4 voor ${labels.why}) complete zinnen?
✓ Heb je specifieke tekst uit beide CV's geciteerd?
✓ Zijn er concrete cijfers en metrics genoemd?
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

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

    const prompt = `Je bent een professional CV expert. Vergelijk deze CV's en geef gedetailleerde Professionele Polish verbeteringen in ${lang}.

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

### 1. [Precieze titel van de polish-verbetering - bijvoorbeeld: "Professionalisering van taalgebruik en verwijdering van informele uitdrukkingen"]

**${labels.original}:** [Beschrijf in 2-3 complete zinnen wat er niet professioneel was. Citeer specifieke tekst. Bijvoorbeeld: "Het originele CV gebruikte informele taal zoals 'ik ben super enthousiast' en 'geweldige resultaten behaald'. De tone was inconsistent met afwisselend 'ik' en derde persoon. Er stonden emoji's (👍) en incomplete zinnen zonder werkwoorden."]

**${labels.improved}:** [Beschrijf in 2-3 complete zinnen de verbeteringen. Citeer specifieke nieuwe tekst. Bijvoorbeeld: "Het verbeterde CV heeft nu consistente professionele tone: 'Proven track record of exceeding targets' en 'Demonstrated expertise in...'. Alle emoji's zijn verwijderd. Zinnen zijn volledig en formeel gestructureerd met sterke action verbs. De tone is consequent assertief en objectief zonder persoonlijke voornaamwoorden."]

**${labels.why}:** [Leg in 3-4 complete zinnen uit waarom dit cruciaal is. Bijvoorbeeld: "Recruiters vormen hun eerste indruk in 7 seconden - informele taal schreeuwt 'onprofessioneel' en diskwalificeert je onmiddellijk. Een gepolijst CV signaleert aandacht voor detail, wat recruiters associëren met kwaliteit van je werk. Volgens studies hebben professioneel geformatteerde CV's 40% hogere response rate. Inconsistenties in tone of formatting suggereren gebrek aan zorgvuldigheid, terwijl perfecte polish jouw geloofwaardigheid en autoriteit versterkt."]

### 2. [Tweede polish-verbetering - wederom met volledige titel]

**${labels.original}:** [Weer 2-3 complete zinnen met citaten uit origineel CV...]

**${labels.improved}:** [Weer 2-3 complete zinnen met citaten uit verbeterd CV...]

**${labels.why}:** [Weer 3-4 complete zinnen met specifieke uitleg...]

LET OP: Geef 2-3 Polish verbeteringen. Focus specifiek op:
- Tone (van informeel naar professioneel, van passief naar assertief)
- Consistentie (bullets, datums, headings allemaal hetzelfde format)
- Grammatica correcties (voor/na voorbeelden!)
- Visuele hiërarchie (spacing, sections, boldness)

VALIDATIE CHECKLIST - controleer dit voor je antwoord geeft:
✓ Heeft elke verbetering ALLE 3 velden volledig ingevuld?
✓ Bevat elk veld minimaal 2-3 (of 3-4 voor ${labels.why}) complete zinnen?
✓ Heb je specifieke voor/na citaten uit beide CV's gebruikt?
✓ Zijn de polish-verbeteringen concreet en specifiek?
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
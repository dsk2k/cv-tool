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
    const { jobDescription, language } = JSON.parse(event.body);

    console.log(`💡 Generating recruiter tips`);
    console.log(`📋 jobDesc length: ${jobDescription?.length || 0}, language: ${language}`);

    if (!jobDescription || !language) {
      throw new Error(`Missing required fields: jobDescription=${!!jobDescription}, language=${!!language}`);
    }

    const lang = language === 'nl' ? 'Nederlands' : 'English';
    const jobSummary = jobDescription.substring(0, 1500);

    const prompt = language === 'nl'
      ? `Je bent een ervaren recruiter en interview coach. Maak een comprehensive interview voorbereiding checklist in Nederlands voor de volgende functie.

FUNCTIE:
${jobSummary}

Maak een gedetailleerde interview voorbereiding checklist met MINIMAAL 25-30 items verdeeld over de volgende categorieën:

## Onderscheidend Vermogen (Stand Out)
- 4-5 specifieke tips hoe de kandidaat zich kan onderscheiden van andere kandidaten
- Focus op unieke selling points en waardevolle inzichten

## Interview Voorbereiding (Interview Prep)
- 5-6 concrete voorbereidingsstappen
- Research tips over het bedrijf
- Voorbereiding op specifieke interviewformats

## STAR Method Vragen
- 5-6 specifieke STAR-vragen die waarschijnlijk gesteld worden voor deze functie
- Elke vraag moet relevant zijn voor de functie-eisen

## Competentie-gebaseerde Vragen
- 4-5 competentie vragen specifiek voor deze rol
- Focus op technische en soft skills uit de job description

## Vragen aan de Werkgever
- 3-4 slimme vragen die de kandidaat kan stellen
- Toon interesse en strategisch denken

## Do's and Don'ts
- 3-4 specifieke do's
- 3-4 specifieke don'ts

Gebruik markdown formatting met ## voor headers en - voor bullet points.
Wees specifiek en actionable, geen algemene adviezen.
Elke tip moet kort en direct zijn (max 2 zinnen per bullet point).

BELANGRIJK: Elk bullet point moet volledige actionable content bevatten, niet alleen een titel.
Voorbeeld: "- Bestudeer de bedrijfswebsite grondig en let op hun waardepropositie. Noteer 2-3 concrete vragen over hun business model."

Checklist:`
      : `You are an experienced recruiter and interview coach. Create a comprehensive interview preparation checklist in English for the following job role.

JOB DESCRIPTION:
${jobSummary}

Create a detailed interview preparation checklist with AT LEAST 25-30 items divided into the following categories:

## Stand Out Strategies
- 4-5 specific tips on how the candidate can stand out from other applicants
- Focus on unique selling points and valuable insights

## Interview Preparation
- 5-6 concrete preparation steps
- Research tips about the company
- Preparation for specific interview formats

## STAR Method Questions
- 5-6 specific STAR questions likely to be asked for this role
- Each question must be relevant to the job requirements

## Competency-Based Questions
- 4-5 competency questions specific to this role
- Focus on technical and soft skills from the job description

## Questions to Ask the Employer
- 3-4 smart questions the candidate can ask
- Show interest and strategic thinking

## Do's and Don'ts
- 3-4 specific do's
- 3-4 specific don'ts

Use markdown formatting with ## for headers and - for bullet points.
Be specific and actionable, no generic advice.
Each tip should be brief and direct (max 2 sentences per bullet point).

IMPORTANT: Each bullet point must contain full actionable content, not just a title.
Example: "- Study the company website thoroughly and note their value proposition. Prepare 2-3 specific questions about their business model."

Checklist:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        maxOutputTokens: 2500,
        temperature: 0.8,
        topP: 0.95
      }
    });

    const result = await model.generateContent(prompt);
    const recruiterTips = result.response.text();

    console.log(`✅ Recruiter tips generated (${recruiterTips.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recruiterTips })
    };

  } catch (error) {
    console.error('❌ Error generating tips:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

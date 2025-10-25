import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Main function handler for Netlify
export const handler = async (event) => {
    // Standard CORS headers for allowing cross-origin requests
    const headers = {
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS methods
        'Content-Type': 'application/json' // Response content type
    };

    // Handle CORS preflight requests (OPTIONS method)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' }; // Respond OK to preflight
    }

    // Only allow POST requests for the actual function execution
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the incoming request body
        const { cv, jobDescription, outputLanguage = 'en', userId = 'free-user', recaptchaToken } = JSON.parse(event.body);

        // --- Optional: Server-side reCAPTCHA Verification (niet nodig voor deze fix) ---

        // Validate essential inputs
        if (!cv || !jobDescription) {
            return {
                statusCode: 400, // Bad Request
                headers,
                body: JSON.stringify({ error: 'Missing required fields: cv or jobDescription' })
            };
        }

        console.log(`Processing request for user: ${userId}, output language: ${outputLanguage}`);

        // --- Placeholder for Subscription & Usage Check ---
        const subscriptionTier = 'free'; // Default/placeholder
        // --- End Placeholder ---

        // Determine language instructions for the AI model
        const languageInstructions = outputLanguage === 'nl'
            ? 'Genereer ALLE output in het Nederlands.' // Dutch instruction
            : 'Generate ALL output in English.'; // English instruction

        // Construct the prompt for the Google Gemini model
        const prompt = `
You are an expert CV and cover letter writer and career coach.

${languageInstructions}
Output Language MUST BE: ${outputLanguage === 'nl' ? 'NEDERLANDS (Dutch)' : 'ENGLISH'}

Analyze the provided ORIGINAL_CV against the JOB_DESCRIPTION. Your tasks are:
1.  **Evaluate the ORIGINAL_CV:** Provide a concise match score (0-100) and a 1-2 sentence explanation focusing on its strengths and weaknesses relative to the job requirements.
2.  **Create an Improved CV:** Rewrite the CV to perfectly match the job, highlighting relevant skills and using action verbs/quantifiable results. Format professionally.
3.  **Write a Cover Letter:** Create a compelling, personalized cover letter (250-350 words) showing enthusiasm for this specific role.
4.  **Provide Recruiter Tips:** Offer 5-7 specific conversation tips and potential questions related to this job and CV.

---ORIGINAL_CV---
${cv}
---END_ORIGINAL_CV---

---JOB_DESCRIPTION---
${jobDescription}
---END_JOB_DESCRIPTION---

Provide your response in this EXACT format with these markers (ALL content MUST be in ${outputLanguage === 'nl' ? 'DUTCH' : 'ENGLISH'}):

---CV_SCORE_START---
SCORE: [Your score, e.g., 65]/100
EXPLANATION: [Your 1-2 sentence explanation]
---CV_SCORE_END---

---IMPROVED_CV_START---
[Your improved, tailored CV here - professionally formatted]
---IMPROVED_CV_END---

---COVER_LETTER_START---
[Your personalized cover letter here]
---COVER_LETTER_END---

---RECRUITER_TIPS_START---
[Your 5-7 specific tips and questions here]
---RECRUITER_TIPS_END---
`; 

        // Select the Gemini model and configure generation parameters
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite', // GEBRUIK HET SNELSTE MODEL
            generationConfig: {
                temperature: 0.7, // Controls randomness (creativity)
                maxOutputTokens: 4000 // HOGE LIMIET VOOR VOLLEDIGHEID
            }
        });

        console.log('Calling Google Gemini API with model gemini-2.5-flash-lite...');
        // Generate content based on the prompt
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // Get the generated text
        console.log(`Response received from Gemini. Length: ${text.length} characters.`);
        // Log de ruwe response om te helpen bij het debuggen van parsing
        console.log("----- RAW GEMINI RESPONSE START -----\n", text, "\n----- RAW GEMINI RESPONSE END -----");


        // --- Helper function to extract content between markers (ROBUUSTE REGEX PARSING) ---
        // Gebruikt een reguliere expressie om flexibeler te zijn met witruimte/nieuwe regels rond markers
        const extractSection = (startMarker, endMarker, content) => {
             // Maak een RegEx object: zoekt naar start marker, pakt alles ([\s\S]*?), non-greedy (?), tot eind marker
             const regex = new RegExp(startMarker.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '([\\s\\S]*?)' + endMarker.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
             const match = content.match(regex);
             
             if (match && match[1]) {
                 return match[1].trim();
             }
             console.warn(`Could not find or parse markers using Regex: ${startMarker} / ${endMarker}`);
             return null;
         };

        // --- Helper function to parse the score and explanation ---
        const parseScore = (scoreContent) => {
             if (!scoreContent) return { score: null, explanation: null };
             // Gebruik regex om SCORE: getal/100 te vinden (case-insensitive)
             const scoreMatch = scoreContent.match(/SCORE:\s*(\d+)\s*\/100/i);
             // Gebruik regex om EXPLANATION: gevolgd door tekst te vinden (case-insensitive)
             const explanationMatch = scoreContent.match(/EXPLANATION:\s*([\s\S]+)/i);
             return {
                 score: scoreMatch ? parseInt(scoreMatch[1], 10) : null, // Converteer score naar integer
                 explanation: explanationMatch ? explanationMatch[1].trim() : null // Haal de uitleg tekst op
             };
         };
        // --- End Helper Functions ---

        // Extraheer elke sectie met de helper functie
        const scoreSection = extractSection('---CV_SCORE_START---', '---CV_SCORE_END---', text);
        const { score, explanation } = parseScore(scoreSection);
        const improvedCV = extractSection('---IMPROVED_CV_START---', '---IMPROVED_CV_END---', text);
        const coverLetter = extractSection('---COVER_LETTER_START---', '---COVER_LETTER_END---', text);
        const recruiterTips = extractSection('---RECRUITER_TIPS_START---', '---RECRUITER_TIPS_END---', text);

        // --- Define Fallbacks for robust error handling ---
        const defaultLang = outputLanguage === 'nl'; // Boolean voor Nederlands
        const fallbackCV = defaultLang ? "Kon CV niet genereren. Controleer de input en probeer het opnieuw." : "Could not generate CV. Please check input and try again.";
        const fallbackCL = defaultLang ? "Kon sollicitatiebrief niet genereren." : "Could not generate cover letter.";
        const fallbackTips = defaultLang ? "- Bereid vragen voor over de functie\n- Onderzoek het bedrijf grondig\n- Vraag naar de volgende stappen" : "- Prepare questions about the role\n- Research the company thoroughly\n- Ask about next steps";
        const fallbackExplanation = defaultLang ? "Score-evaluatie kon niet worden geëxtraheerd." : "Score evaluation could not be extracted.";

        // Controleer of het parsen succesvol was
        if (!improvedCV || !coverLetter || !recruiterTips) {
            console.error('CRITICAL PARSING FAILURE: One or more sections were null. Using fallbacks.');
        }

        console.log(`Successfully parsed (or used fallback) - Score: ${score ?? 'N/A'}, CV: ${improvedCV?.length ?? 0} chars, CL: ${coverLetter?.length ?? 0} chars, Tips: ${recruiterTips?.length ?? 0} chars`);

        // --- Placeholder for Incrementing Usage Count ---
        // ... (usage count logic remains the same) ...

        // Stuur de gestructureerde data succesvol terug
        return {
            statusCode: 200, // OK
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    // Gebruik geëxtraheerde data of fallbacks als extractie mislukte
                    cvScore: score,
                    scoreExplanation: explanation || fallbackExplanation,
                    improvedCV: improvedCV || fallbackCV,
                    coverLetter: coverLetter || fallbackCL,
                    recruiterTips: recruiterTips || fallbackTips,
                    language: outputLanguage,
                    subscriptionTier
                }
            })
        };

    } catch (error) {
        // Log de fout voor debuggen
        console.error('Error in analyze-cv function:', error);
        let errorMessage = 'Internal server error occurred.';
        if (error.name === 'GoogleGenerativeAIFetchError') {
             errorMessage = `Gemini API Error: ${error.message} (Status: ${error.status})`;
             if(error.errorDetails) console.error('Gemini API Error Details:', error.errorDetails);
        } else {
            errorMessage = error.message || errorMessage;
        }
        return {
            statusCode: 500, // Internal Server Error
            headers,
            body: JSON.stringify({
                error: 'Internal server error occurred.',
                message: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error happened while processing your request.'
            })
        };
    }
};

// --- Placeholder Helper Functions ---
// ... (helper functions blijven hetzelfde) ...

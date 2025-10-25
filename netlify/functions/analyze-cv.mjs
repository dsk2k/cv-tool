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

        // --- Optional: Server-side reCAPTCHA Verification ---
        // Uncomment this section and set RECAPTCHA_SECRET_KEY in Netlify environment variables
        // to add server-side validation against bots.
        /*
        if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
            const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;
            try {
                const recaptchaRes = await fetch(verificationUrl, { method: 'POST' });
                const recaptchaData = await recaptchaRes.json();
                // Check if reCAPTCHA was successful and score is acceptable (adjust score for v3)
                if (!recaptchaData.success || (recaptchaData.score && recaptchaData.score < 0.5)) {
                    console.warn('reCAPTCHA verification failed:', recaptchaData);
                    return {
                        statusCode: 403, // Forbidden
                        headers,
                        body: JSON.stringify({ error: 'reCAPTCHA verification failed. Please try again.' })
                    };
                }
                console.log('reCAPTCHA verified successfully.');
            } catch (recaptchaError) {
                console.error('Error verifying reCAPTCHA:', recaptchaError);
                // Fail closed: return an error if verification service can't be reached
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not verify reCAPTCHA' }) };
            }
        } else if (!recaptchaToken && process.env.RECAPTCHA_SECRET_KEY) {
             console.warn('reCAPTCHA token missing, but secret key is set.');
             return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing reCAPTCHA token.' }) };
        } else {
             console.log('Skipping reCAPTCHA verification (no secret key set or no token provided).');
        }
        */
        // --- End reCAPTCHA ---


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
        // Replace with your actual database/Stripe logic
        // const subscriptionTier = await checkSubscriptionTier(userId);
        // if (subscriptionTier === 'free') {
        //     const usageCount = await getUsageCount(userId);
        //     if (usageCount >= FREE_TIER_LIMIT) {
        //         return { statusCode: 403, headers, body: JSON.stringify({ error: 'Free limit reached' })};
        //     }
        // }
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
        // --- MODEL NAME UPDATED ---
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash', // Use the specified flash model
            generationConfig: {
                temperature: 0.7, // Controls randomness (creativity)
                maxOutputTokens: 4000 // Limit the response size
            }
        });
        // --- END MODEL NAME UPDATE ---

        console.log('Calling Google Gemini API with model gemini-2.0-flash...');
        // Generate content based on the prompt
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // Get the generated text
        console.log(`Response received from Gemini. Length: ${text.length} characters.`);

        // --- Helper function to extract content between markers ---
        const extractSection = (startMarker, endMarker, content) => {
            const startIndex = content.indexOf(startMarker);
            const endIndex = content.indexOf(endMarker);
            // Ensure both markers are found and in the correct order
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                // Extract text and trim whitespace
                return content.substring(startIndex + startMarker.length, endIndex).trim();
            }
            console.warn(`Could not find or parse markers: ${startMarker} / ${endMarker}`);
            return null; // Return null if section is not found or malformed
        };

        // --- Helper function to parse the score and explanation ---
        const parseScore = (scoreContent) => {
            if (!scoreContent) return { score: null, explanation: null };
            // Use regex to find SCORE: number/100
            const scoreMatch = scoreContent.match(/SCORE:\s*(\d+)\s*\/100/i);
            // Use regex to find EXPLANATION: followed by any text
            const explanationMatch = scoreContent.match(/EXPLANATION:\s*([\s\S]+)/i);
            return {
                score: scoreMatch ? parseInt(scoreMatch[1], 10) : null, // Convert score to integer
                explanation: explanationMatch ? explanationMatch[1].trim() : null // Get the explanation text
            };
        };
        // --- End Helper Functions ---

        // Extract each section using the helper function
        const scoreSection = extractSection('---CV_SCORE_START---', '---CV_SCORE_END---', text);
        const { score, explanation } = parseScore(scoreSection);
        const improvedCV = extractSection('---IMPROVED_CV_START---', '---IMPROVED_CV_END---', text);
        const coverLetter = extractSection('---COVER_LETTER_START---', '---COVER_LETTER_END---', text);
        const recruiterTips = extractSection('---RECRUITER_TIPS_START---', '---RECRUITER_TIPS_END---', text);

        // --- Define Fallbacks for robust error handling ---
        const defaultLang = outputLanguage === 'nl'; // Boolean for Dutch
        const fallbackCV = defaultLang ? "Kon CV niet genereren. Controleer de input en probeer het opnieuw." : "Could not generate CV. Please check input and try again.";
        const fallbackCL = defaultLang ? "Kon sollicitatiebrief niet genereren." : "Could not generate cover letter.";
        const fallbackTips = defaultLang ? "- Bereid vragen voor over de functie\n- Onderzoek het bedrijf grondig\n- Vraag naar de volgende stappen" : "- Prepare questions about the role\n- Research the company thoroughly\n- Ask about next steps";
        const fallbackExplanation = defaultLang ? "Score-evaluatie kon niet worden geëxtraheerd." : "Score evaluation could not be extracted.";

        // Basic validation of extracted content length
        if (!improvedCV || improvedCV.length < 50) {
            console.error('Failed to extract valid Improved CV. Extracted:', improvedCV?.substring(0,100));
        }
         if (!coverLetter || coverLetter.length < 50) {
            console.error('Failed to extract valid Cover Letter. Extracted:', coverLetter?.substring(0,100));
        }
         if (!recruiterTips || recruiterTips.length < 20) {
            console.error('Failed to extract valid Recruiter Tips. Extracted:', recruiterTips?.substring(0,100));
        }
        if (score === null || !explanation) {
             console.error('Failed to extract valid Score/Explanation. Extracted:', scoreSection);
        }
        // --- End Fallbacks ---

        console.log(`Successfully parsed - Score: ${score ?? 'N/A'}, CV: ${improvedCV?.length ?? 0} chars, CL: ${coverLetter?.length ?? 0} chars, Tips: ${recruiterTips?.length ?? 0} chars`);

        // --- Placeholder for Incrementing Usage Count ---
        // if (subscriptionTier === 'free') {
        //     await incrementUsageCount(userId);
        // }
        // --- End Placeholder ---

        // Return the structured data successfully
        return {
            statusCode: 200, // OK
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    // Use extracted data or fallbacks if extraction failed
                    cvScore: score, // Can be null if parsing failed
                    scoreExplanation: explanation || fallbackExplanation,
                    improvedCV: improvedCV || fallbackCV,
                    coverLetter: coverLetter || fallbackCL,
                    recruiterTips: recruiterTips || fallbackTips,
                    language: outputLanguage, // Include the requested output language
                    subscriptionTier // Include the user's subscription tier
                }
            })
        };

    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error in analyze-cv function:', error);
        // Return a generic server error response
        return {
            statusCode: 500, // Internal Server Error
            headers,
            body: JSON.stringify({
                error: 'Internal server error occurred.',
                // Optionally include error message in dev environment, but not production
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};

// --- Placeholder Helper Functions ---
// Replace these with your actual database/Stripe logic

// async function checkSubscriptionTier(userId) {
//   // Example: Check database or Stripe API
//   // const user = await db.findUser(userId);
//   // return user ? user.tier : 'free';
//   return 'free';
// }

// async function getUsageCount(userId) {
//   // Example: Get usage count from database
//   // const usage = await db.getUsage(userId);
//   // return usage ? usage.count : 0;
//   return 0;
// }

// async function incrementUsageCount(userId) {
//   // Example: Increment usage count in database
//   // await db.incrementUsage(userId);
//   console.log(`Placeholder: Incremented usage count for user ${userId}`);
// }

// --- End Placeholder Helper Functions ---


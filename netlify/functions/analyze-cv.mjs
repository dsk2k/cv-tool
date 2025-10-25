import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Main function handler for Netlify
export const handler = async (event) => {
    // Standard CORS headers for allowing cross-origin requests
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight requests (OPTIONS method)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST requests for the actual function execution
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the incoming request body
        const { cv, jobDescription, outputLanguage = 'en', userId = 'free-user', recaptchaToken } = JSON.parse(event.body);

        // Validate essential inputs
        if (!cv || !jobDescription) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: cv or jobDescription' })
            };
        }

        console.log(`Processing request for user: ${userId}, output language: ${outputLanguage}`);

        // Determine language instructions for the AI model
        const languageInstructions = outputLanguage === 'nl'
            ? 'Genereer ALLE output in het Nederlands.'
            : 'Generate ALL output in English.';

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
            model: 'gemini-2.0-flash-lite',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192  // Increased for completeness
            }
        });

        console.log('Calling Google Gemini API with model gemini-2.0-flash-lite...');
        
        // Generate content based on the prompt
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`Response received from Gemini. Length: ${text.length} characters.`);
        console.log("----- RAW GEMINI RESPONSE START -----\n", text, "\n----- RAW GEMINI RESPONSE END -----");

        // ============================================
        // ROBUST EXTRACTION FUNCTION
        // ============================================
        const extractSection = (startMarker, endMarker, content) => {
            try {
                const startIndex = content.indexOf(startMarker);
                
                if (startIndex === -1) {
                    console.warn(`❌ Start marker not found: ${startMarker}`);
                    return null;
                }
                
                // Start extracting after the start marker
                const afterStart = startIndex + startMarker.length;
                let remainingContent = content.substring(afterStart);
                
                // Find end marker in remaining content
                const endIndex = remainingContent.indexOf(endMarker);
                
                if (endIndex === -1) {
                    console.warn(`❌ End marker not found: ${endMarker}`);
                    console.warn(`   Start marker was at position ${startIndex}`);
                    console.warn(`   Content after start marker (first 200 chars): ${remainingContent.substring(0, 200)}`);
                    
                    // FALLBACK: If no end marker, find next major section marker
                    const nextMarkers = [
                        '---CV_SCORE_START---',
                        '---CV_SCORE_END---',
                        '---IMPROVED_CV_START---',
                        '---IMPROVED_CV_END---',
                        '---COVER_LETTER_START---',
                        '---COVER_LETTER_END---',
                        '---RECRUITER_TIPS_START---',
                        '---RECRUITER_TIPS_END---'
                    ].filter(m => m !== startMarker && m !== endMarker);
                    
                    let nearestNextMarker = remainingContent.length;
                    for (const marker of nextMarkers) {
                        const idx = remainingContent.indexOf(marker);
                        if (idx !== -1 && idx < nearestNextMarker) {
                            nearestNextMarker = idx;
                        }
                    }
                    
                    const extracted = remainingContent.substring(0, nearestNextMarker).trim();
                    console.log(`⚠️  Using fallback extraction, got ${extracted.length} chars`);
                    return extracted.length > 20 ? extracted : null;
                }
                
                // Extract content between markers
                const extracted = remainingContent.substring(0, endIndex).trim();
                console.log(`✅ Successfully extracted ${startMarker}: ${extracted.length} chars`);
                return extracted;
                
            } catch (error) {
                console.error(`❌ Error in extractSection for ${startMarker}:`, error);
                return null;
            }
        };

        // Parse score helper
        const parseScore = (scoreContent) => {
            if (!scoreContent) return { score: null, explanation: null };
            const scoreMatch = scoreContent.match(/SCORE:\s*(\d+)\s*\/100/i);
            const explanationMatch = scoreContent.match(/EXPLANATION:\s*([\s\S]+)/i);
            return {
                score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
                explanation: explanationMatch ? explanationMatch[1].trim() : null
            };
        };

        // Extract each section with improved error handling
        console.log('\n--- EXTRACTION PHASE ---');
        
        const scoreSection = extractSection('---CV_SCORE_START---', '---CV_SCORE_END---', text);
        const { score, explanation } = parseScore(scoreSection);
        console.log(`Score: ${score ?? 'N/A'}, Explanation: ${explanation ? explanation.substring(0, 50) + '...' : 'N/A'}`);
        
        const improvedCV = extractSection('---IMPROVED_CV_START---', '---IMPROVED_CV_END---', text);
        console.log(`Improved CV: ${improvedCV ? `${improvedCV.length} chars` : 'NULL'}`);
        if (improvedCV) {
            console.log(`CV Preview: ${improvedCV.substring(0, 100)}...`);
        }
        
        const coverLetter = extractSection('---COVER_LETTER_START---', '---COVER_LETTER_END---', text);
        console.log(`Cover Letter: ${coverLetter ? `${coverLetter.length} chars` : 'NULL'}`);
        if (coverLetter) {
            console.log(`CL Preview: ${coverLetter.substring(0, 100)}...`);
        }
        
        const recruiterTips = extractSection('---RECRUITER_TIPS_START---', '---RECRUITER_TIPS_END---', text);
        console.log(`Recruiter Tips: ${recruiterTips ? `${recruiterTips.length} chars` : 'NULL'}`);
        
        console.log('--- END EXTRACTION PHASE ---\n');

        // Fallbacks
        const defaultLang = outputLanguage === 'nl';
        const fallbackCV = defaultLang 
            ? "Kon CV niet genereren. Controleer de input en probeer het opnieuw." 
            : "Could not generate CV. Please check input and try again.";
        const fallbackCL = defaultLang 
            ? "Kon sollicitatiebrief niet genereren." 
            : "Could not generate cover letter.";
        const fallbackTips = defaultLang 
            ? "- Bereid vragen voor over de functie\n- Onderzoek het bedrijf grondig\n- Vraag naar de volgende stappen" 
            : "- Prepare questions about the role\n- Research the company thoroughly\n- Ask about next steps";
        const fallbackExplanation = defaultLang 
            ? "Score-evaluatie kon niet worden geëxtraheerd." 
            : "Score evaluation could not be extracted.";

        // Critical validation
        if (!improvedCV || improvedCV.length < 50) {
            console.error('❌ CRITICAL: Failed to extract valid CV!');
            console.error('   CV is null or too short:', improvedCV?.length ?? 0, 'chars');
        }
        if (!coverLetter || coverLetter.length < 50) {
            console.error('❌ WARNING: Failed to extract valid cover letter!');
            console.error('   Cover letter is null or too short:', coverLetter?.length ?? 0, 'chars');
        }

        // Prepare final data with explicit checks
        const finalCV = (improvedCV && improvedCV.length >= 50) ? improvedCV : fallbackCV;
        const finalCL = (coverLetter && coverLetter.length >= 50) ? coverLetter : fallbackCL;
        const finalTips = (recruiterTips && recruiterTips.length >= 20) ? recruiterTips : fallbackTips;

        console.log('\n--- FINAL DATA SUMMARY ---');
        console.log(`Using CV: ${finalCV === fallbackCV ? '❌ FALLBACK' : `✅ EXTRACTED (${finalCV.length} chars)`}`);
        console.log(`Using CL: ${finalCL === fallbackCL ? '❌ FALLBACK' : `✅ EXTRACTED (${finalCL.length} chars)`}`);
        console.log(`Using Tips: ${finalTips === fallbackTips ? '❌ FALLBACK' : `✅ EXTRACTED (${finalTips.length} chars)`}`);
        console.log('--- END FINAL DATA SUMMARY ---\n');

        // Return success response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    cvScore: score,
                    scoreExplanation: explanation || fallbackExplanation,
                    improvedCV: finalCV,
                    coverLetter: finalCL,
                    recruiterTips: finalTips,
                    language: outputLanguage,
                    subscriptionTier: 'free'
                }
            })
        };

    } catch (error) {
        console.error('❌ Error in analyze-cv function:', error);
        let errorMessage = 'Internal server error occurred.';
        
        if (error.name === 'GoogleGenerativeAIFetchError') {
            errorMessage = `Gemini API Error: ${error.message} (Status: ${error.status})`;
            if (error.errorDetails) console.error('Gemini API Error Details:', error.errorDetails);
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error occurred.',
                message: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error happened while processing your request.'
            })
        };
    }
};

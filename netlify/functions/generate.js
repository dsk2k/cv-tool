const { GoogleGenerativeAI } = require('@google/generative-ai');

// NOTE: If your serverless environment (e.g., Netlify) runs on Node.js < 18,
// 'fetch' is not built-in. You must install 'node-fetch@2'
// (npm install node-fetch@2) and uncomment the line below:
// const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        // Parse request body
        const { cv, jobDesc, coverLetter, recaptchaToken, userId } = JSON.parse(event.body);
        
        // Check subscription status (verify they can use the service)
        const subscriptionCheck = await fetch(`${process.env.URL}/.netlify/functions/check-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const subscriptionData = await subscriptionCheck.json();
        
        if (!subscriptionData.canUse) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Free trial limit reached. Please subscribe to continue.' })
            };
        }
        
        // Verify reCAPTCHA
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        const recaptchaVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        
        const recaptchaResponse = await fetch(recaptchaVerifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `secret=${recaptchaSecret}&response=${recaptchaToken}`
        });
        
        const recaptchaData = await recaptchaResponse.json();
        
        if (!recaptchaData.success) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'reCAPTCHA verification failed. Please try again.' })
            };
        }
        
        // Create system instruction
        const systemInstruction = `You are an expert career coach and professional resume writer. You will be given a user's CV, a job description, and (optionally) a base cover letter. Your task is to:

1. Generate a brand new, tailored cover letter
2. Create an IMPROVED VERSION of their CV with changes already applied
3. List what changes you made

CRITICAL ETHICAL GUIDELINES:
- NEVER add false information, fabricated experiences, or skills they don't have
- ONLY improve existing content - reword, reorder, emphasize relevant parts
- Keep all factual information accurate
- Only enhance presentation, not create fictional content

MANDATORY OUTPUT FORMAT: You MUST follow this exact structure:

[Cover Letter - tailored to the job]

### Improved CV

[The user's COMPLETE CV but with improvements applied - reworded descriptions, better formatting, keywords added, sections reordered, etc. Output the FULL improved CV here]

### Changes Made

- [List each specific change you made to the CV]
- [Be specific: "Changed X to Y", "Moved Z section to top", "Added keyword A to B"]

IMPORTANT: 
- The "Improved CV" section must be a COMPLETE, ready-to-use CV
- Include ALL sections from the original (contact info, experience, education, skills, etc.)
- Apply all improvements directly in the CV text
- Then list what you changed in the "Changes Made" section`;

        // *** The large, conflicting, duplicated block of text was removed from here. ***

        // Initialize Gemini client
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Pass systemInstruction in the model config
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash',
            systemInstruction: systemInstruction
        });
        
        // Create user message (now clean)
        const userPrompt = `Here is my CV:
${cv}

Here is the Job Description:
${jobDesc}

Here is my base cover letter (Note: if the text is '[USER_REQUESTS_NEW_COVER_LETTER]', please generate a new one from scratch):
${coverLetter}`;
        
        // Make Gemini API call
        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const generatedText = response.text();
        
        // Return successful response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ generatedText: generatedText })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'An error occurred while processing your request. Please try again.',
                details: error.message 
            })
        };
    }
};

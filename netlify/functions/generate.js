const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body
        const { cv, jobDescription, recaptchaToken, generateCoverLetter, baseCoverLetter } = JSON.parse(event.body);

        // Validate inputs
        if (!cv || !jobDescription) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Missing required fields: cv or jobDescription' })
            };
        }

        // Verify reCAPTCHA
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`;
        
        const recaptchaResponse = await fetch(recaptchaVerifyUrl, { method: 'POST' });
        const recaptchaResult = await recaptchaResponse.json();

        if (!recaptchaResult.success) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'reCAPTCHA verification failed. Please try again.' })
            };
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-pro',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            }
        });

        // Build the prompt with JSON output format
        let prompt = `You are an expert CV and cover letter writer. Your task is to improve a CV and optionally create a cover letter based on a job description.

IMPORTANT ETHICAL RULES:
- Never fabricate experience, skills, or achievements
- Only improve how existing information is presented
- If a required skill is missing, suggest honest ways to address it
- Reframe real experiences to match job requirements
- Do not add technologies or tools not mentioned in the original CV

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S CURRENT CV:
${cv}
`;

        if (generateCoverLetter) {
            if (baseCoverLetter && baseCoverLetter.trim()) {
                prompt += `\nBASE COVER LETTER TO IMPROVE:
${baseCoverLetter}
`;
            }
        }

        prompt += `\n\nYour response MUST be in this exact format (including the markers):

---COVER_LETTER_START---
`;

        if (generateCoverLetter) {
            if (baseCoverLetter && baseCoverLetter.trim()) {
                prompt += `[Improved and tailored version of the cover letter]`;
            } else {
                prompt += `[Professional tailored cover letter for this job application]`;
            }
        } else {
            prompt += `[Leave this section empty if no cover letter requested]`;
        }

        prompt += `
---COVER_LETTER_END---

---IMPROVED_CV_START---
[Complete improved CV with all sections: contact info, professional summary, experience, education, skills. Make it ready to copy and use. Keep the same structure as the original but improve the wording, add relevant keywords from the job description, and emphasize relevant experience.]
---IMPROVED_CV_END---

---CHANGES_START---
[Bullet list of specific changes made to the CV and why each change helps match the job requirements]
---CHANGES_END---

CRITICAL: You must include ALL the markers exactly as shown above, even if a section is empty. Start your response with ---COVER_LETTER_START--- and end with ---CHANGES_END---`;

        // Generate content
        console.log('Sending request to Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('Received response from Gemini');
        console.log('Response length:', text.length);
        console.log('First 200 chars:', text.substring(0, 200));

        // More flexible parsing with multiple attempts
        let coverLetter = '';
        let improvedCV = '';
        let changesMade = '';

        // Try to extract cover letter
        if (generateCoverLetter) {
            const clMatch = text.match(/---COVER_LETTER_START---([\s\S]*?)---COVER_LETTER_END---/);
            if (clMatch) {
                coverLetter = clMatch[1].trim();
                console.log('Cover letter extracted, length:', coverLetter.length);
            } else {
                console.log('Warning: Cover letter markers not found');
            }
        }

        // Try to extract improved CV
        const cvMatch = text.match(/---IMPROVED_CV_START---([\s\S]*?)---IMPROVED_CV_END---/);
        if (cvMatch) {
            improvedCV = cvMatch[1].trim();
            console.log('Improved CV extracted, length:', improvedCV.length);
        } else {
            console.log('Warning: Improved CV markers not found');
            // Fallback: Look for any substantial content between cover letter and changes
            const afterCoverLetter = text.split('---COVER_LETTER_END---')[1] || text;
            const beforeChanges = afterCoverLetter.split('---CHANGES_START---')[0] || afterCoverLetter;
            improvedCV = beforeChanges.trim();
            console.log('Using fallback CV extraction, length:', improvedCV.length);
        }

        // Try to extract changes
        const changesMatch = text.match(/---CHANGES_START---([\s\S]*?)---CHANGES_END---/);
        if (changesMatch) {
            changesMade = changesMatch[1].trim();
            console.log('Changes extracted, length:', changesMade.length);
        } else {
            console.log('Warning: Changes markers not found');
            // Fallback: Get everything after CHANGES_START
            const afterChangesStart = text.split('---CHANGES_START---')[1];
            if (afterChangesStart) {
                changesMade = afterChangesStart.replace('---CHANGES_END---', '').trim();
            }
        }

        // Validate that we got the essential content (improved CV at minimum)
        if (!improvedCV || improvedCV.length < 50) {
            console.error('Failed to extract valid improved CV');
            console.error('Full response:', text);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Invalid response format from the AI. Please try again.',
                    debug: text.substring(0, 1000)
                })
            };
        }

        // If cover letter was requested but not found, provide a message
        if (generateCoverLetter && !coverLetter) {
            coverLetter = 'Cover letter generation failed. Please try again.';
        }

        // If changes weren't found, provide a default message
        if (!changesMade) {
            changesMade = 'Changes list not available. Please review the improved CV above.';
        }

        console.log('Successfully parsed all sections');

        // Return success response
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coverLetter: coverLetter,
                improvedCV: improvedCV,
                changesMade: changesMade
            })
        };

    } catch (error) {
        console.error('Error in generate function:', error);
        console.error('Error stack:', error.stack);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Internal server error. Please try again later.',
                details: error.message 
            })
        };
    }
};

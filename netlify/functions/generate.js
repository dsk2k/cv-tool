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
        
        // Try models in order: 2.5 flash -> 2.0 variants -> 1.5 flash
        const modelsToTry = [
            { name: 'gemini-2.5-flash', tokens: 8192 },
            { name: 'gemini-2.0-flash', tokens: 8192 },
            { name: 'gemini-2.0-flash-exp', tokens: 8192 },
            { name: 'gemini-1.5-flash', tokens: 8192 }
        ];
        
        let lastError = null;
        let result = null;
        let usedModel = null;
        
        for (const modelConfig of modelsToTry) {
            try {
                console.log(`Trying model: ${modelConfig.name}`);
                
                const model = genAI.getGenerativeModel({ 
                    model: modelConfig.name,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: modelConfig.tokens,
                    }
                });

                // Build the prompt with VERY EXPLICIT instructions
                let prompt = `You are an expert CV and cover letter writer. Your task is to improve a CV and optionally create a cover letter based on a job description.

IMPORTANT ETHICAL RULES:
- Never fabricate experience, skills, or achievements
- Only improve how existing information is presented
- If a required skill is missing, suggest honest ways to address it
- Reframe real experiences to match job requirements
- Do not add technologies or tools not mentioned in the original CV

COVER LETTER RULES:
- ALWAYS create a professional cover letter when requested, using the information available
- If country/location is not specified, write a general professional cover letter that works for any location
- Use the candidate's location from their CV if provided, otherwise keep it location-neutral
- Focus on matching skills and experience to job requirements
- DO NOT refuse to write a cover letter due to missing information - work with what you have
- If company name is not mentioned in job description, use "Hiring Team" or "Hiring Manager"

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

                prompt += `\n\n===================
CRITICAL OUTPUT FORMAT INSTRUCTIONS:
===================

You MUST provide your response in EXACTLY this format. Use these EXACT marker strings:

---COVER_LETTER_START---
`;

                if (generateCoverLetter) {
                    if (baseCoverLetter && baseCoverLetter.trim()) {
                        prompt += `[Improved and tailored version of the cover letter - write the actual cover letter here]`;
                    } else {
                        prompt += `[Professional tailored cover letter for this job application - write the actual cover letter here]`;
                    }
                } else {
                    prompt += `Not requested`;
                }

                prompt += `
---COVER_LETTER_END---

---IMPROVED_CV_START---
[Write the COMPLETE improved CV here. Include:
- Contact information
- Professional summary/objective
- Work experience (with improved descriptions)
- Education
- Skills
- Any other relevant sections

Make it ready to copy and paste. Improve wording, add relevant keywords from job description, emphasize relevant experience. Keep the same general structure as the original.]
---IMPROVED_CV_END---

---CHANGES_START---
[List the specific changes you made to the CV. For each change:
1. Section changed (e.g., "Professional Summary", "Work Experience - Company X")
2. What you changed
3. Why it helps match the job requirements

Format as bullet points.]
---CHANGES_END---

CRITICAL RULES:
1. You MUST include ALL four marker pairs exactly as shown above
2. You MUST include the END markers (---COVER_LETTER_END---, ---IMPROVED_CV_END---, ---CHANGES_END---)
3. DO NOT add any other markers (like CV_SCORE, RECRUITER_TIPS, etc.)
4. DO NOT change the marker names
5. Start your response with ---COVER_LETTER_START---
6. End your response with ---CHANGES_END---
7. Put actual content between the markers, not placeholders

BEGIN YOUR RESPONSE NOW:`;

                // Generate content
                console.log(`Sending request to Gemini with model: ${modelConfig.name}`);
                result = await model.generateContent(prompt);
                usedModel = modelConfig.name;
                console.log(`Successfully used model: ${usedModel}`);
                break; // Success! Exit the loop
                
            } catch (error) {
                console.log(`Model ${modelConfig.name} failed:`, error.message);
                lastError = error;
                
                // If it's a 503 (overloaded) or 404 (not found), try next model
                if (error.status === 503 || error.status === 404) {
                    continue;
                }
                
                // For other errors, throw immediately
                throw error;
            }
        }
        
        // If all models failed
        if (!result) {
            console.error('All models failed. Last error:', lastError);
            throw lastError || new Error('All AI models failed');
        }
        
        const response = await result.response;
        const text = response.text();
        
        console.log(`Response received from Gemini (model: ${usedModel}). Length: ${text.length} characters.`);
        console.log('----- RAW GEMINI RESPONSE START -----');
        console.log(text);
        console.log('----- RAW GEMINI RESPONSE END -----');

        // ROBUST PARSING LOGIC
        let coverLetter = '';
        let improvedCV = '';
        let changesMade = '';

        // Helper function to extract content between markers
        function extractBetweenMarkers(text, startMarker, endMarker, fallbackMarkers = []) {
            // Try exact match first
            const regex = new RegExp(`${startMarker}([\\s\\S]*?)${endMarker}`, 'i');
            const match = text.match(regex);
            if (match) {
                return match[1].trim();
            }
            
            // Try without end marker (find until next major marker)
            const startIdx = text.indexOf(startMarker);
            if (startIdx !== -1) {
                let content = text.substring(startIdx + startMarker.length);
                
                // Find where content ends
                const possibleEndMarkers = [endMarker, ...fallbackMarkers];
                let endIdx = content.length;
                
                for (const marker of possibleEndMarkers) {
                    const idx = content.indexOf(marker);
                    if (idx !== -1 && idx < endIdx) {
                        endIdx = idx;
                    }
                }
                
                return content.substring(0, endIdx).trim();
            }
            
            return '';
        }

        // Extract improved CV (highest priority)
        improvedCV = extractBetweenMarkers(
            text,
            '---IMPROVED_CV_START---',
            '---IMPROVED_CV_END---',
            ['---COVER_LETTER_START---', '---CHANGES_START---', '---RECRUITER_TIPS_START---', '---CV_SCORE_START---']
        );

        if (improvedCV) {
            console.log(`✅ Improved CV extracted successfully. Length: ${improvedCV.length} chars`);
        } else {
            console.error('❌ Failed to extract improved CV');
        }

        // Extract cover letter (if requested)
        if (generateCoverLetter) {
            coverLetter = extractBetweenMarkers(
                text,
                '---COVER_LETTER_START---',
                '---COVER_LETTER_END---',
                ['---IMPROVED_CV_START---', '---CHANGES_START---', '---RECRUITER_TIPS_START---']
            );

            if (coverLetter && coverLetter !== 'Not requested') {
                console.log(`✅ Cover letter extracted successfully. Length: ${coverLetter.length} chars`);
            } else {
                console.log('⚠️ Cover letter not found or was "Not requested"');
                coverLetter = '';
            }
        }

        // Extract changes/tips
        changesMade = extractBetweenMarkers(
            text,
            '---CHANGES_START---',
            '---CHANGES_END---',
            []
        );

        // If CHANGES not found, try RECRUITER_TIPS as alternative
        if (!changesMade || changesMade.length < 20) {
            const tips = extractBetweenMarkers(
                text,
                '---RECRUITER_TIPS_START---',
                '---RECRUITER_TIPS_END---',
                []
            );
            if (tips) {
                changesMade = `**Interview Preparation Tips:**\n\n${tips}`;
                console.log(`✅ Extracted recruiter tips instead of changes. Length: ${tips.length} chars`);
            }
        }

        if (changesMade) {
            console.log(`✅ Changes/tips extracted successfully. Length: ${changesMade.length} chars`);
        }

        // Validate that we got the essential content
        if (!improvedCV || improvedCV.length < 100) {
            console.error('❌ CRITICAL: Failed to extract valid improved CV');
            console.error('CV length:', improvedCV.length);
            console.error('Response preview:', text.substring(0, 500));
            
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'The AI returned an invalid response format. Please try again.',
                    details: 'The improved CV could not be extracted from the AI response.',
                    debug: text.substring(0, 1000)
                })
            };
        }

        // Provide defaults for missing sections
        if (generateCoverLetter && (!coverLetter || coverLetter.length < 50)) {
            coverLetter = 'The AI did not generate a cover letter. Please try generating again or contact support if the issue persists.';
            console.log('⚠️ Using default cover letter message');
        }

        if (!changesMade || changesMade.length < 20) {
            changesMade = 'The CV has been improved and optimized to better match the job requirements. Key improvements include enhanced descriptions, added relevant keywords, and better alignment with the job posting.';
            console.log('⚠️ Using default changes message');
        }

        console.log('✅ Successfully parsed all sections');
        console.log(`Final lengths - CV: ${improvedCV.length}, CL: ${coverLetter.length}, Changes: ${changesMade.length}`);

        // Return success response
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coverLetter: coverLetter || '',
                improvedCV: improvedCV,
                changesMade: changesMade,
                modelUsed: usedModel
            })
        };

    } catch (error) {
        console.error('❌ Error in generate function:', error);
        console.error('Error stack:', error.stack);
        
        // Check for specific error types
        if (error.status === 503) {
            return {
                statusCode: 503,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'AI service is currently overloaded. Please try again in a few moments.',
                    details: 'The AI model is experiencing high demand. Please wait 30 seconds and try again.'
                })
            };
        }
        
        // Check if it's a Gemini API error
        if (error.message && error.message.includes('models/gemini')) {
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'AI model not available. Please verify your Gemini API key.',
                    details: 'Visit https://aistudio.google.com/ and check your API key has model access.'
                })
            };
        }
        
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

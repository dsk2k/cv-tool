const { GoogleGenerativeAI } = require('@google/generative-ai');

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
        
        // Initialize Gemini client
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // Create system instruction and prompt
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
CRITICAL ETHICAL GUIDELINES:
- NEVER suggest adding false information, fabricated experiences, or skills the candidate doesn't have
- NEVER suggest inventing projects, job titles, responsibilities, or achievements
- ONLY suggest reframing, re-emphasizing, or better articulating EXISTING experiences
- Focus on highlighting relevant aspects of what they've actually done
- Suggest adding context or metrics to existing experiences, not creating new ones
- If the CV lacks experience for a requirement, suggest honest ways to address the gap (e.g., "Consider mentioning relevant coursework" or "Highlight transferable skills from X experience")

MANDATORY OUTPUT FORMAT: You MUST generate the cover letter first. Then, you MUST include the literal, exact string marker "### Suggested CV Edits" on its own line. After this marker, you will provide the CV edit suggestions as a Markdown bulleted list.

Example:
[Your newly generated cover letter text...]

### Suggested CV Edits
- In your 'Project X' description, emphasize the collaborative aspects you mentioned to align with the team-oriented requirements
- Reframe your 'Data Analysis' experience to highlight the problem-solving methodology you used
- Add specific metrics to your 'Marketing Campaign' achievement (e.g., engagement rates, if you tracked them)

The cover letter should be professional, enthusiastic, and specifically tailored to the job description. It should highlight how the candidate's ACTUAL experience matches the role requirements. Be honest about fit.

The CV edit suggestions should be specific, actionable, truthful, and prioritized by impact. Focus on:
- Keywords from the job description to add WHERE RELEVANT to existing experience
- Existing experience or skills to emphasize, reorder, or reframe
- Specific phrases or metrics to include (only if they reflect actual experience)
- Sections to expand or condense based on relevance
- Honest ways to address any gaps (courses, transferable skills, willingness to learn)

Remember: The goal is to present the candidate's TRUE experience in the best light, not to fabricate qualifications.`;
        
        // Create user message
        const userPrompt = `${systemInstruction}

Here is my CV:
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




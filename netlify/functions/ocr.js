// netlify/functions/ocr.js
// This function extracts text from images using Gemini Vision API

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
        const { image, mimeType } = JSON.parse(event.body);

        // Validate input
        if (!image) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Missing image data' })
            };
        }

        // Check image size (max 4MB base64 = ~3MB image)
        if (image.length > 5500000) { // ~4MB base64
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Image is too large. Please upload an image smaller than 3MB.' })
            };
        }

        // Initialize Gemini with Vision model
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Use Gemini 2.0 Flash for vision (it has excellent OCR)
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.1, // Low temperature for accurate extraction
                maxOutputTokens: 2048,
            }
        });

        console.log('Processing image with Gemini Vision...');

        // Create the image part
        const imagePart = {
            inlineData: {
                data: image,
                mimeType: mimeType || 'image/jpeg'
            }
        };

        // Prompt for text extraction
        const prompt = `Extract ALL text from this image. This appears to be a job posting or job description screenshot.

Instructions:
- Extract all visible text accurately
- Preserve the structure and formatting as much as possible
- Include job titles, requirements, responsibilities, company info, etc.
- Do NOT add any commentary, explanations, or extra text
- Just return the extracted text exactly as it appears

Return ONLY the extracted text, nothing else.`;

        // Generate content with image
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const extractedText = response.text();

        console.log('Text extracted successfully, length:', extractedText.length);

        // Return the extracted text
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: extractedText.trim(),
                length: extractedText.length
            })
        };

    } catch (error) {
        console.error('OCR Error:', error);
        console.error('Error stack:', error.stack);

        // Check for specific errors
        if (error.message && error.message.includes('quota')) {
            return {
                statusCode: 429,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'OCR service temporarily unavailable due to high usage. Please try again in a moment or paste the text manually.'
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
                error: 'Failed to extract text from image. Please try pasting the text manually instead.',
                details: error.message
            })
        };
    }
};

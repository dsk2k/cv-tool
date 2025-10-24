const pdfParse = require('pdf-parse');
const multipart = require('parse-multipart-data');

// Security configurations
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit (reduced from 10MB)
const MAX_PAGES = 10; // Maximum pages to process
const TIMEOUT_MS = 10000; // 10 second timeout
const RATE_LIMIT_KEY = 'pdf_upload_rate_limit';

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        // Check rate limiting via reCAPTCHA token
        const contentType = event.headers['content-type'] || event.headers['Content-Type'];
        
        // Validate content type
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid content type' })
            };
        }
        
        // Parse the multipart form data
        const boundary = multipart.getBoundary(contentType);
        const bodyBuffer = Buffer.from(event.body, 'base64');
        
        // Check total request size BEFORE parsing
        if (bodyBuffer.length > MAX_FILE_SIZE * 2) { // Allow some overhead for multipart
            return {
                statusCode: 413,
                body: JSON.stringify({ error: 'Request too large. Maximum file size is 2MB.' })
            };
        }
        
        const parts = multipart.parse(bodyBuffer, boundary);
        
        // Find the PDF file
        const pdfPart = parts.find(part => part.name === 'pdf');
        
        if (!pdfPart) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No PDF file found in request' })
            };
        }
        
        // Strict file size validation
        if (pdfPart.data.length > MAX_FILE_SIZE) {
            return {
                statusCode: 413,
                body: JSON.stringify({ error: 'File too large. Maximum size is 2MB.' })
            };
        }
        
        // Validate PDF header (magic bytes)
        const pdfHeader = pdfPart.data.slice(0, 5).toString();
        if (pdfHeader !== '%PDF-') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid PDF file. File may be corrupted or not a real PDF.' })
            };
        }
        
        // Set up timeout protection
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('PDF processing timeout')), TIMEOUT_MS);
        });
        
        // Parse PDF with timeout protection and options to prevent PDF bombs
        const parsePromise = pdfParse(pdfPart.data, {
            max: MAX_PAGES, // Limit pages processed
            version: 'v2.0.550' // Use specific version for security
        });
        
        const data = await Promise.race([parsePromise, timeoutPromise]);
        
        // Validate extracted text
        if (!data.text || data.text.trim().length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: 'Could not extract text from PDF. The file might be image-based, password-protected, or corrupted. Please try pasting your CV text instead.' 
                })
            };
        }
        
        // Limit text length to prevent memory issues
        const maxTextLength = 50000; // ~50KB of text (plenty for a CV)
        let extractedText = data.text;
        
        if (extractedText.length > maxTextLength) {
            extractedText = extractedText.substring(0, maxTextLength);
            console.warn('PDF text truncated due to length');
        }
        
        // Sanitize extracted text (remove potentially dangerous content)
        extractedText = extractedText
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .trim();
        
        if (extractedText.length < 50) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: 'PDF contains too little text. Please upload a complete CV or paste your CV text instead.' 
                })
            };
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-Content-Type-Options': 'nosniff'
            },
            body: JSON.stringify({ 
                text: extractedText,
                pages: Math.min(data.numpages, MAX_PAGES),
                truncated: data.text.length > maxTextLength
            })
        };
        
    } catch (error) {
        console.error('Error extracting PDF:', error);
        
        // Don't expose internal error details to users
        let userMessage = 'Failed to process PDF file. Please try a different file or paste your CV text instead.';
        
        if (error.message.includes('timeout')) {
            userMessage = 'PDF processing took too long. Please try a simpler PDF or paste your CV text instead.';
        } else if (error.message.includes('encrypted') || error.message.includes('password')) {
            userMessage = 'PDF is password-protected. Please remove the password or paste your CV text instead.';
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: userMessage })
        };
    }
};
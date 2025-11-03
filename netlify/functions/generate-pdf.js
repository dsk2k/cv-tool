/**
 * Professional CV PDF Generation
 * Generates a ready-to-use CV document for job applications
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Professional color palette
const colors = {
    primary: rgb(0, 0, 0),              // Black for text
    secondary: rgb(0.3, 0.3, 0.3),      // Dark gray
    accent: rgb(0.2, 0.2, 0.2),         // Medium gray
    light: rgb(0.5, 0.5, 0.5),          // Light gray
    line: rgb(0.7, 0.7, 0.7),           // Lines
    white: rgb(1, 1, 1)
};

// Page margins
const MARGIN = {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50
};

exports.handler = async (event) => {
    // Handle OPTIONS for CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Parse request data
        const data = JSON.parse(event.body);
        const {
            improvedCV,
            language = 'nl'
        } = data;

        console.log('📄 Generating CV PDF');

        if (!improvedCV) {
            throw new Error('No CV content provided');
        }

        // Create PDF document
        const pdfDoc = await PDFDocument.create();

        // Embed fonts
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        // Create CV pages
        let page = pdfDoc.addPage([595, 842]); // A4 size
        const { width, height } = page.getSize();
        let y = height - MARGIN.top;

        // Clean the CV content
        const cleanedCV = cleanMarkdown(improvedCV);

        // Auto-detect language from content (override parameter if needed)
        const detectedLanguage = detectLanguage(cleanedCV);
        const finalLanguage = detectedLanguage || language;

        console.log(`📝 Language: parameter=${language}, detected=${detectedLanguage}, final=${finalLanguage}`);

        // Parse CV structure from the content
        const cvData = parseCV(cleanedCV);

        // ===== CV HEADER (Name, Contact) =====
        if (cvData.name) {
            page.drawText(cvData.name, {
                x: MARGIN.left,
                y: y,
                size: 28,
                font: fontBold,
                color: colors.primary
            });
            y -= 45;
        }

        // Contact info line with clickable LinkedIn link
        if (cvData.contact.length > 0) {
            let currentX = MARGIN.left;
            const contactY = y;
            const contactSize = 10;

            cvData.contact.forEach((contactItem, index) => {
                // Add separator between items
                if (index > 0) {
                    const separator = '    ';
                    page.drawText(separator, {
                        x: currentX,
                        y: contactY,
                        size: contactSize,
                        font: fontRegular,
                        color: colors.secondary
                    });
                    currentX += fontRegular.widthOfTextAtSize(separator, contactSize);
                }

                // Check if this is a LinkedIn URL
                const linkedInMatch = contactItem.match(/(https?:\/\/)?(www\.)?linkedin\.com\/[^\s]+/i);

                if (linkedInMatch) {
                    const linkedInUrl = linkedInMatch[0].startsWith('http')
                        ? linkedInMatch[0]
                        : 'https://' + linkedInMatch[0];

                    // Display just "LinkedIn" instead of full URL
                    const displayText = 'LinkedIn';

                    // Draw the text in blue to indicate it's a link
                    page.drawText(displayText, {
                        x: currentX,
                        y: contactY,
                        size: contactSize,
                        font: fontRegular,
                        color: rgb(0, 0, 0.8) // Blue color for link
                    });

                    // Add link annotation
                    const textWidth = fontRegular.widthOfTextAtSize(displayText, contactSize);

                    try {
                        // Create link annotation using pdf-lib's context API
                        const { PDFName, PDFArray, PDFDict, PDFString } = require('pdf-lib');

                        const linkAnnot = pdfDoc.context.register(
                            pdfDoc.context.obj({
                                Type: 'Annot',
                                Subtype: 'Link',
                                Rect: [currentX, contactY - 2, currentX + textWidth, contactY + contactSize + 2],
                                Border: [0, 0, 0],
                                A: {
                                    Type: 'Action',
                                    S: 'URI',
                                    URI: linkedInUrl
                                }
                            })
                        );

                        // Get existing annotations or create new array
                        const annotsRef = page.node.get(PDFName.of('Annots'));
                        let annots;

                        if (annotsRef instanceof PDFArray) {
                            annots = annotsRef;
                        } else {
                            annots = pdfDoc.context.obj([]);
                            page.node.set(PDFName.of('Annots'), annots);
                        }

                        annots.push(linkAnnot);
                    } catch (e) {
                        console.warn('Could not create LinkedIn link annotation:', e);
                        // Link will still be visible as blue text, just not clickable
                    }

                    currentX += textWidth;
                } else {
                    // Regular text
                    page.drawText(contactItem, {
                        x: currentX,
                        y: contactY,
                        size: contactSize,
                        font: fontRegular,
                        color: colors.secondary
                    });
                    currentX += fontRegular.widthOfTextAtSize(contactItem, contactSize);
                }
            });

            y -= 40;
        }

        // Language-aware section headers
        const sectionHeaders = {
            nl: {
                profile: 'PROFIEL',
                competencies: 'KERNCOMPETENTIES',
                experience: 'WERKERVARING',
                education: 'OPLEIDING',
                skills: 'VAARDIGHEDEN'
            },
            en: {
                profile: 'PROFILE',
                competencies: 'CORE COMPETENCIES',
                experience: 'WORK EXPERIENCE',
                education: 'EDUCATION',
                skills: 'SKILLS'
            }
        };

        const headers = sectionHeaders[finalLanguage] || sectionHeaders.en;

        // ===== PROFILE / SAMENVATTING =====
        if (cvData.profile) {
            y = addSectionHeader(page, fontBold, y, headers.profile, colors.primary);
            y -= 5;
            page.drawLine({
                start: { x: MARGIN.left, y: y },
                end: { x: width - MARGIN.right, y: y },
                thickness: 1,
                color: colors.primary
            });
            y -= 15;

            y = addParagraph(page, fontRegular, cvData.profile, MARGIN.left, y,
                           width - MARGIN.left - MARGIN.right, 11, colors.primary, 1.4);
            y -= 20;
        }

        // ===== CORE COMPETENCIES =====
        if (cvData.competencies && cvData.competencies.length > 0) {
            if (y < 200) {
                page = pdfDoc.addPage([595, 842]);
                y = height - MARGIN.top;
            }

            y = addSectionHeader(page, fontBold, y, headers.competencies, colors.primary);
            y -= 5;
            page.drawLine({
                start: { x: MARGIN.left, y: y },
                end: { x: width - MARGIN.right, y: y },
                thickness: 1,
                color: colors.primary
            });
            y -= 20;

            cvData.competencies.forEach(comp => {
                page.drawText('•', {
                    x: MARGIN.left,
                    y: y,
                    size: 11,
                    font: fontBold,
                    color: colors.primary
                });

                y = addParagraph(page, fontRegular, comp, MARGIN.left + 15, y,
                               width - MARGIN.left - MARGIN.right - 15, 11, colors.primary, 1.3);
                y -= 8;
            });
            y -= 15;
        }

        // ===== WORK EXPERIENCE =====
        if (cvData.experience && cvData.experience.length > 0) {
            if (y < 200) {
                page = pdfDoc.addPage([595, 842]);
                y = height - MARGIN.top;
            }

            y = addSectionHeader(page, fontBold, y, headers.experience, colors.primary);
            y -= 5;
            page.drawLine({
                start: { x: MARGIN.left, y: y },
                end: { x: width - MARGIN.right, y: y },
                thickness: 1,
                color: colors.primary
            });
            y -= 20;

            cvData.experience.forEach((job, index) => {
                if (y < 150) {
                    page = pdfDoc.addPage([595, 842]);
                    y = height - MARGIN.top;
                }

                // Job title and company
                if (job.title) {
                    page.drawText(job.title, {
                        x: MARGIN.left,
                        y: y,
                        size: 12,
                        font: fontBold,
                        color: colors.primary
                    });
                    y -= 18;
                }

                // Company, period
                if (job.company || job.period) {
                    const details = [job.company, job.period].filter(d => d).join('  •  ');
                    page.drawText(details, {
                        x: MARGIN.left,
                        y: y,
                        size: 10,
                        font: fontItalic,
                        color: colors.secondary
                    });
                    y -= 18;
                }

                // Description
                if (job.description) {
                    y = addParagraph(page, fontRegular, job.description, MARGIN.left, y,
                                   width - MARGIN.left - MARGIN.right, 10, colors.primary, 1.4);
                    y -= 15;
                }

                // Responsibilities
                if (job.responsibilities && job.responsibilities.length > 0) {
                    job.responsibilities.forEach(resp => {
                        if (y < 100) {
                            page = pdfDoc.addPage([595, 842]);
                            y = height - MARGIN.top;
                        }

                        page.drawText('•', {
                            x: MARGIN.left + 10,
                            y: y,
                            size: 10,
                            font: fontRegular,
                            color: colors.primary
                        });

                        y = addParagraph(page, fontRegular, resp, MARGIN.left + 25, y,
                                       width - MARGIN.left - MARGIN.right - 25, 10, colors.primary, 1.3);
                        y -= 6;
                    });
                }

                if (index < cvData.experience.length - 1) {
                    y -= 15;
                }
            });
        }

        // ===== EDUCATION =====
        if (cvData.education && cvData.education.length > 0) {
            if (y < 150) {
                page = pdfDoc.addPage([595, 842]);
                y = height - MARGIN.top;
            }

            y -= 15;
            y = addSectionHeader(page, fontBold, y, headers.education, colors.primary);
            y -= 5;
            page.drawLine({
                start: { x: MARGIN.left, y: y },
                end: { x: width - MARGIN.right, y: y },
                thickness: 1,
                color: colors.primary
            });
            y -= 20;

            cvData.education.forEach(edu => {
                if (edu.degree) {
                    page.drawText(edu.degree, {
                        x: MARGIN.left,
                        y: y,
                        size: 11,
                        font: fontBold,
                        color: colors.primary
                    });
                    y -= 16;
                }

                if (edu.school || edu.period) {
                    const details = [edu.school, edu.period].filter(d => d).join('  •  ');
                    page.drawText(details, {
                        x: MARGIN.left,
                        y: y,
                        size: 10,
                        font: fontItalic,
                        color: colors.secondary
                    });
                    y -= 20;
                }
            });
        }

        // ===== SKILLS =====
        if (cvData.skills && cvData.skills.length > 0) {
            if (y < 100) {
                page = pdfDoc.addPage([595, 842]);
                y = height - MARGIN.top;
            }

            y -= 10;
            y = addSectionHeader(page, fontBold, y, headers.skills, colors.primary);
            y -= 5;
            page.drawLine({
                start: { x: MARGIN.left, y: y },
                end: { x: width - MARGIN.right, y: y },
                thickness: 1,
                color: colors.primary
            });
            y -= 15;

            const skillsText = cvData.skills.join(', ');
            y = addParagraph(page, fontRegular, skillsText, MARGIN.left, y,
                           width - MARGIN.left - MARGIN.right, 10, colors.primary, 1.3);
        }

        // Add watermark on last page
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const lastPageHeight = lastPage.getSize().height;

        lastPage.drawText('Geoptimaliseerd door ApplyJobMatch.nl', {
            x: MARGIN.left,
            y: 30,
            size: 7,
            font: fontItalic,
            color: colors.light
        });

        // Serialize PDF
        const pdfBytes = await pdfDoc.save();

        console.log(`✅ CV PDF generated: ${pdfBytes.length} bytes`);

        // Return PDF
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="CV-${Date.now()}.pdf"`,
                'Content-Length': pdfBytes.length
            },
            body: Buffer.from(pdfBytes).toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('❌ PDF generation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to generate PDF',
                message: error.message,
                stack: error.stack
            })
        };
    }
};

// ===== HELPER FUNCTIONS =====

function addSectionHeader(page, font, y, text, color) {
    page.drawText(text, {
        x: MARGIN.left,
        y: y,
        size: 14,
        font: font,
        color: color
    });
    return y - 20;
}

function addParagraph(page, font, text, x, y, maxWidth, fontSize, color, lineHeight = 1.4) {
    const lines = wrapText(text, font, fontSize, maxWidth);
    const lineSpacing = fontSize * lineHeight;

    lines.forEach(line => {
        if (line.trim() === '') {
            y -= lineSpacing * 0.5;
            return;
        }

        page.drawText(line, {
            x: x,
            y: y,
            size: fontSize,
            font: font,
            color: color
        });
        y -= lineSpacing;
    });

    return y;
}

function wrapText(text, font, fontSize, maxWidth) {
    const lines = [];
    const paragraphs = text.split('\n');

    paragraphs.forEach(paragraph => {
        if (paragraph.trim() === '') {
            lines.push('');
            return;
        }

        const words = paragraph.split(' ');
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }
    });

    return lines;
}

function parseCV(text) {
    // Initialize CV structure
    const cv = {
        name: '',
        contact: [],
        profile: '',
        competencies: [],
        experience: [],
        education: [],
        skills: []
    };

    const lines = text.split('\n');
    let currentSection = 'header';
    let currentJob = null;
    let currentEdu = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) continue;

        // Detect sections (case insensitive)
        const lowerLine = line.toLowerCase();

        if (lowerLine.match(/^(profiel|profile|samenvatting|summary)/i)) {
            currentSection = 'profile';
            continue;
        }
        if (lowerLine.match(/^(core competencies|kerncompetenties|competenties)/i)) {
            currentSection = 'competencies';
            continue;
        }
        if (lowerLine.match(/^(work experience|werkervaring|ervaring)/i)) {
            currentSection = 'experience';
            continue;
        }
        if (lowerLine.match(/^(education|opleiding)/i)) {
            currentSection = 'education';
            continue;
        }
        if (lowerLine.match(/^(skills|vaardigheden)/i)) {
            currentSection = 'skills';
            continue;
        }

        // Parse based on current section
        switch (currentSection) {
            case 'header':
                // Skip AI commentary patterns (more comprehensive)
                const isAICommentary = line.match(/^(key|hier|absoluut|natuurlijk|verbeterd|improvement|optimization|strategy|strategies|used|following|improved)/i)
                    || line.toLowerCase().includes('strategies')
                    || line.toLowerCase().includes('optimization')
                    || line.toLowerCase().includes('improvement');

                if (!cv.name && line.length < 50 && !line.includes('@') && !isAICommentary) {
                    // Only use as name if it looks like a name (starts with capital, not too many special chars)
                    const looksLikeName = /^[A-Z]/.test(line) && !line.includes('|') && line.split(' ').length <= 5 && !line.includes(':');
                    if (looksLikeName) {
                        cv.name = line;
                    }
                } else {
                    // Detect contact information patterns
                    const isContactInfo =
                        line.includes('@') ||                           // Email
                        line.includes('+') ||                           // Phone with country code
                        line.match(/\d{3}[-\s]?\d{3}[-\s]?\d{4}/) ||   // Phone number patterns
                        line.match(/\d{2,}/) && line.length < 30 ||     // Contains numbers (likely phone)
                        line.toLowerCase().includes('linkedin') ||      // LinkedIn
                        line.includes(',') && !cv.name ||               // Likely location (City, Country)
                        line.match(/^[A-Z][a-z]+,?\s+[A-Z][a-z]+/) ||   // City Country pattern
                        line.match(/^\d{4}\s?[A-Z]{2}/) ||              // Postal code pattern
                        line.toLowerCase().includes('netherlands') ||
                        line.toLowerCase().includes('nederland') ||
                        line.toLowerCase().includes('amsterdam') ||
                        line.toLowerCase().includes('rotterdam') ||
                        line.toLowerCase().includes('utrecht');

                    if (isContactInfo && !isAICommentary) {
                        cv.contact.push(line);
                    }
                }
                break;

            case 'profile':
                if (!line.match(/^(profiel|profile)/i)) {
                    cv.profile += (cv.profile ? ' ' : '') + line;
                }
                break;

            case 'competencies':
                if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
                    // Remove all leading bullet markers and asterisks
                    const cleaned = line.replace(/^[\-\•\*\s]+/, '').trim();
                    if (cleaned) {
                        cv.competencies.push(cleaned);
                    }
                } else if (!line.match(/^(core|competencies)/i)) {
                    cv.competencies.push(line);
                }
                break;

            case 'experience':
                // Check if this is a job title (usually short, might have | or - separator)
                if (line.length < 80 && (line.includes('|') || /^[A-Z]/.test(line)) && !line.startsWith('-')) {
                    if (currentJob) {
                        cv.experience.push(currentJob);
                    }
                    const parts = line.split('|').map(p => p.trim());
                    currentJob = {
                        title: parts[0],
                        company: parts[1] || '',
                        period: parts[2] || '',
                        description: '',
                        responsibilities: []
                    };
                } else if (currentJob) {
                    // Check if this line contains a date pattern (e.g., "2020 - 2023", "Jan 2020 - Present")
                    const datePattern = /(\d{4}|\w{3,9}\s+\d{4})\s*[-–—]\s*(\d{4}|\w{3,9}\s+\d{4}|Present|present|heden|Heden)/i;
                    const dateMatch = line.match(datePattern);

                    if (dateMatch && !currentJob.period) {
                        // This line contains a date range, use it as the period
                        currentJob.period = line.trim();
                    } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
                        // Remove all leading bullet markers and asterisks
                        const cleaned = line.replace(/^[\-\•\*\s]+/, '').trim();
                        if (cleaned) {
                            currentJob.responsibilities.push(cleaned);
                        }
                    } else if (!currentJob.description) {
                        currentJob.description = line;
                    } else {
                        currentJob.responsibilities.push(line);
                    }
                }
                break;

            case 'education':
                if (!line.match(/^(education|opleiding)/i)) {
                    if (line.length < 80 && /^[A-Z]/.test(line)) {
                        if (currentEdu) {
                            cv.education.push(currentEdu);
                        }
                        const parts = line.split('|').map(p => p.trim());
                        currentEdu = {
                            degree: parts[0],
                            school: parts[1] || '',
                            period: parts[2] || ''
                        };
                    }
                }
                break;

            case 'skills':
                if (!line.match(/^(skills|vaardigheden)/i)) {
                    const skills = line.split(',').map(s => s.trim()).filter(s => s);
                    cv.skills.push(...skills);
                }
                break;
        }
    }

    // Add last job/education if exists
    if (currentJob) {
        cv.experience.push(currentJob);
    }
    if (currentEdu) {
        cv.education.push(currentEdu);
    }

    // If no structured data found, use the whole text as profile
    if (!cv.profile && !cv.experience.length) {
        cv.profile = text;
    }

    return cv;
}

function detectLanguage(text) {
    if (!text) return 'en';

    const lowerText = text.toLowerCase();

    // Count English vs Dutch indicators
    const englishIndicators = [
        /\b(work experience|experience|skills|profile|summary|education|responsibilities|managed|developed|led|created|implemented)\b/gi,
        /\b(the|and|with|for|from|this|that|these|those)\b/gi
    ];

    const dutchIndicators = [
        /\b(werkervaring|ervaring|vaardigheden|profiel|samenvatting|opleiding|verantwoordelijkheden|beheerde|ontwikkelde|leidde)\b/gi,
        /\b(het|de|en|met|voor|van|deze|die|dit|dat)\b/gi
    ];

    let englishScore = 0;
    let dutchScore = 0;

    englishIndicators.forEach(pattern => {
        const matches = lowerText.match(pattern);
        if (matches) englishScore += matches.length;
    });

    dutchIndicators.forEach(pattern => {
        const matches = lowerText.match(pattern);
        if (matches) dutchScore += matches.length;
    });

    console.log(`🔍 Language detection: EN=${englishScore}, NL=${dutchScore}`);

    // Return language with higher score, default to English
    return englishScore > dutchScore ? 'en' : 'nl';
}

function cleanMarkdown(text) {
    if (!text) return '';

    return text
        // Remove AI commentary headers and introductions
        .replace(/^Key\s+(Optimization|Improvement)\s+Strategies?\s*(Used)?:?\s*\n*/gim, '')
        .replace(/^Improvement\s+Strategies?\s*(Used)?:?\s*\n*/gim, '')
        .replace(/^Optimization\s+Strategies?\s*(Used)?:?\s*\n*/gim, '')
        .replace(/^Here'?s?\s+(is|are|a|an)\s+.*?:\s*\n*/gim, '')
        .replace(/^Here\s+(is|are)\s+the\s+.*?:\s*\n*/gim, '')
        .replace(/^The\s+(following|improved).*?:\s*\n*/gim, '')
        .replace(/^This\s+(is|CV).*?:\s*\n*/gim, '')
        .replace(/.*incorporating\s+ATS\s+keywords.*\n*/gi, '')
        .replace(/.*tailoring\s+it\s+to\s+the\s+job.*\n*/gi, '')
        // Remove prompt instructions patterns
        .replace(/\*\*Origineel:\*\*.*?(?=\n\n|\n\*\*|$)/gs, '')
        .replace(/\*\*Verbeterd:\*\*.*?(?=\n\n|$)/gs, '')
        .replace(/Hieronder vind je.*?(?=\n\n|$)/gi, '')
        .replace(/Absoluut!.*?(?=\n\n|$)/gi, '')
        .replace(/Natuurlijk!.*?(?=\n\n|$)/gi, '')
        .replace(/Hier (is|zijn).*?(?=\n\n|$)/gi, '')
        .replace(/###\s*\d+\..*?\n/g, '')
        // Remove markdown headers but keep the text
        .replace(/#{1,6}\s+/g, '')
        // Remove bold markers
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove italic markers
        .replace(/\*(.*?)\*/g, '$1')
        // Keep list markers for now (we'll parse them)
        // Remove emojis (they don't work with standard PDF fonts)
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        // Clean up extra newlines
        .replace(/\n{3,}/g, '\n\n')
        // Trim
        .trim();
}

/**
 * Professional PDF Generation for CV Analysis
 * Uses pdf-lib (pure JavaScript, serverless-compatible)
 *
 * Generates a branded, professional PDF with:
 * - Company logo and branding
 * - Full CV analysis (premium only)
 * - Cover letter (premium only)
 * - Recruiter tips (premium only)
 * - Professional layout and typography
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Color palette
const colors = {
    primary: rgb(0.38, 0.27, 0.94),      // #6366F1 (Indigo)
    secondary: rgb(0.06, 0.72, 0.51),    // #10B981 (Green)
    text: rgb(0.12, 0.16, 0.22),         // #1F2937 (Dark gray)
    textLight: rgb(0.42, 0.44, 0.47),    // #6B7280 (Light gray)
    background: rgb(0.97, 0.97, 0.97),   // #F7F7F7 (Light background)
    line: rgb(0.90, 0.91, 0.92)          // #E5E7EB (Border)
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
            matchScore,
            changesOverview,
            improvedCV,
            coverLetter,
            recruiterTips,
            isPremium = false,
            language = 'nl'
        } = data;

        console.log('📄 Generating PDF for', isPremium ? 'PREMIUM' : 'FREE', 'user');
        console.log('📊 Data received:', {
            matchScore,
            hasChangesOverview: !!changesOverview,
            hasImprovedCV: !!improvedCV,
            hasCoverLetter: !!coverLetter,
            hasRecruiterTips: !!recruiterTips,
            language
        });

        // Create PDF document
        const pdfDoc = await PDFDocument.create();

        // Embed fonts
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Page 1: Overview
        let page = pdfDoc.addPage([595, 842]); // A4 size
        const { width, height } = page.getSize();
        let y = height - 50;

        // Header
        y = addHeader(page, fontBold, fontRegular, width, y, language);

        // Title
        page.drawText(language === 'nl' ? 'Uw CV Analyse Rapport' : 'Your CV Analysis Report', {
            x: 50,
            y: y,
            size: 24,
            font: fontBold,
            color: colors.primary
        });
        y -= 40;

        // Match Score
        page.drawText(language === 'nl' ? 'Interview Kans Score' : 'Interview Chance Score', {
            x: 50,
            y: y,
            size: 14,
            font: fontRegular,
            color: colors.textLight
        });
        y -= 30;

        page.drawText(`${matchScore}%`, {
            x: 50,
            y: y,
            size: 48,
            font: fontBold,
            color: colors.secondary
        });
        y -= 60;

        // Section: Changes Overview
        y = addSection(page, fontBold, fontRegular, y, width,
            language === 'nl' ? 'Samenvatting Verbeteringen' : 'Improvements Summary');

        if (changesOverview) {
            const cleanedChanges = cleanMarkdown(changesOverview);
            y = addWrappedText(page, fontRegular, cleanedChanges, 50, y, width - 100, 11, colors.text);
        }
        y -= 20;

        // Section: Improved CV
        if (improvedCV) {
            // Check if we need a new page
            if (y < 150) {
                page = pdfDoc.addPage([595, 842]);
                y = height - 50;
                y = addHeader(page, fontBold, fontRegular, width, y, language);
            }

            y = addSection(page, fontBold, fontRegular, y, width,
                language === 'nl' ? 'Geoptimaliseerde CV' : 'Optimized CV');

            const cleanedCV = cleanMarkdown(improvedCV);
            y = addWrappedText(page, fontRegular, cleanedCV, 50, y, width - 100, 10, colors.text);
            y -= 20;
        }

        // Premium Content
        if (isPremium) {
            // Cover Letter
            if (coverLetter) {
                page = pdfDoc.addPage([595, 842]);
                y = height - 50;
                y = addHeader(page, fontBold, fontRegular, width, y, language);

                y = addSection(page, fontBold, fontRegular, y, width,
                    language === 'nl' ? 'AI Motivatiebrief' : 'AI Cover Letter');

                const cleanedCoverLetter = cleanMarkdown(coverLetter);
                y = addWrappedText(page, fontRegular, cleanedCoverLetter, 50, y, width - 100, 11, colors.text);
            }

            // Recruiter Tips
            if (recruiterTips) {
                page = pdfDoc.addPage([595, 842]);
                y = height - 50;
                y = addHeader(page, fontBold, fontRegular, width, y, language);

                y = addSection(page, fontBold, fontRegular, y, width,
                    language === 'nl' ? 'Recruiter Insider Tips' : 'Recruiter Insider Tips');

                const cleanedTips = cleanMarkdown(recruiterTips);
                y = addWrappedText(page, fontRegular, cleanedTips, 50, y, width - 100, 11, colors.text);
            }
        } else {
            // Free user - upgrade message
            page = pdfDoc.addPage([595, 842]);
            y = height - 50;
            y = addHeader(page, fontBold, fontRegular, width, y, language);

            y -= 150;

            const upgradeTitle = language === 'nl' ? 'Unlock Volledige Analyse' : 'Unlock Full Analysis';
            const titleWidth = fontBold.widthOfTextAtSize(upgradeTitle, 18);
            page.drawText(upgradeTitle, {
                x: (width - titleWidth) / 2,
                y: y,
                size: 18,
                font: fontBold,
                color: colors.text
            });
            y -= 40;

            const upgradeText = language === 'nl'
                ? 'Upgrade naar Pro voor:\n\n- Volledige gedetailleerde feedback (12+ verbeteringen)\n- AI-gegenereerde motivatiebrief\n- Recruiter insider tips\n- Onbeperkte CV analyses\n\nBezoek applyjobmatch.nl voor meer informatie'
                : 'Upgrade to Pro for:\n\n- Full detailed feedback (12+ improvements)\n- AI-generated cover letter\n- Recruiter insider tips\n- Unlimited CV analyses\n\nVisit applyjobmatch.nl for more information';

            y = addWrappedText(page, fontRegular, upgradeText, 100, y, width - 200, 12, colors.textLight, 'center');
        }

        // Add footers to all pages
        const pages = pdfDoc.getPages();
        pages.forEach((p, i) => {
            addFooter(p, fontRegular, width, language, isPremium, i + 1, pages.length);
        });

        // Serialize PDF
        const pdfBytes = await pdfDoc.save();

        console.log(`✅ PDF generated: ${pdfBytes.length} bytes`);

        // Return PDF
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="CV-Analysis-${Date.now()}.pdf"`,
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

function addHeader(page, fontBold, fontRegular, width, y, language) {
    // Company name
    page.drawText('ApplyJobMatch.nl', {
        x: width - 150,
        y: y,
        size: 10,
        font: fontBold,
        color: colors.primary
    });

    // Horizontal line
    page.drawLine({
        start: { x: 50, y: y - 10 },
        end: { x: width - 50, y: y - 10 },
        thickness: 1,
        color: colors.line
    });

    return y - 40;
}

function addFooter(page, fontRegular, width, language, isPremium, pageNum, totalPages) {
    const { height } = page.getSize();

    // Footer line
    page.drawLine({
        start: { x: 50, y: 50 },
        end: { x: width - 50, y: 50 },
        thickness: 1,
        color: colors.line
    });

    // Footer text
    const footerText = language === 'nl'
        ? `Gegenereerd door ApplyJobMatch.nl • ${isPremium ? 'Pro' : 'Free'} • Pagina ${pageNum} van ${totalPages}`
        : `Generated by ApplyJobMatch.nl • ${isPremium ? 'Pro' : 'Free'} • Page ${pageNum} of ${totalPages}`;

    const textWidth = fontRegular.widthOfTextAtSize(footerText, 8);

    page.drawText(footerText, {
        x: (width - textWidth) / 2,
        y: 35,
        size: 8,
        font: fontRegular,
        color: colors.textLight
    });
}

function addSection(page, fontBold, fontRegular, y, width, title) {
    page.drawText(title, {
        x: 50,
        y: y,
        size: 16,
        font: fontBold,
        color: colors.text
    });

    // Underline
    page.drawLine({
        start: { x: 50, y: y - 5 },
        end: { x: 250, y: y - 5 },
        thickness: 2,
        color: colors.primary
    });

    return y - 25;
}

function addWrappedText(page, font, text, x, y, maxWidth, fontSize, color, align = 'left') {
    const lines = wrapText(text, font, fontSize, maxWidth);

    lines.forEach(line => {
        let xPos = x;
        if (align === 'center') {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            xPos = x + (maxWidth - lineWidth) / 2;
        }

        page.drawText(line, {
            x: xPos,
            y: y,
            size: fontSize,
            font: font,
            color: color
        });
        y -= fontSize + 4;
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

function cleanMarkdown(text) {
    if (!text) return '';

    return text
        // Remove markdown headers
        .replace(/#{1,6}\s+/g, '')
        // Remove bold markers
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove italic markers
        .replace(/\*(.*?)\*/g, '$1')
        // Remove list markers
        .replace(/^[\-\*]\s+/gm, '- ')
        // Remove emojis (they don't work with standard PDF fonts)
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        // Clean up extra newlines
        .replace(/\n{3,}/g, '\n\n')
        // Trim
        .trim();
}

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

// Color palette - Professional and modern
const colors = {
    primary: rgb(0.38, 0.27, 0.94),        // #6366F1 (Indigo)
    primaryLight: rgb(0.82, 0.78, 0.99),   // Light indigo background
    secondary: rgb(0.06, 0.72, 0.51),      // #10B981 (Green)
    secondaryLight: rgb(0.83, 0.97, 0.91), // Light green background
    text: rgb(0.12, 0.16, 0.22),           // #1F2937 (Dark gray)
    textLight: rgb(0.42, 0.44, 0.47),      // #6B7280 (Medium gray)
    textExtraLight: rgb(0.61, 0.64, 0.67), // #9CA3AF (Light gray)
    background: rgb(0.98, 0.98, 0.99),     // #F9F9FB (Very light background)
    line: rgb(0.90, 0.91, 0.92),           // #E5E7EB (Border)
    white: rgb(1, 1, 1),
    warning: rgb(0.96, 0.62, 0.11),        // #F59E0B (Amber)
};

// Page margins
const MARGIN = {
    top: 60,
    bottom: 60,
    left: 60,
    right: 60
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
        const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        // Page 1: Overview & Summary
        let page = pdfDoc.addPage([595, 842]); // A4 size
        const { width, height } = page.getSize();
        let y = height - MARGIN.top;

        // ===== HEADER BANNER =====
        // Colored header banner
        page.drawRectangle({
            x: 0,
            y: height - 100,
            width: width,
            height: 100,
            color: colors.primary
        });

        // Company name in header
        page.drawText('ApplyJobMatch.nl', {
            x: MARGIN.left,
            y: height - 45,
            size: 16,
            font: fontBold,
            color: colors.white
        });

        // Document title
        page.drawText(language === 'nl' ? 'CV Analyse Rapport' : 'CV Analysis Report', {
            x: MARGIN.left,
            y: height - 75,
            size: 11,
            font: fontRegular,
            color: colors.primaryLight
        });

        y = height - 130;

        // ===== MATCH SCORE CARD =====
        const cardY = y - 120;
        // Background card
        page.drawRectangle({
            x: MARGIN.left,
            y: cardY,
            width: width - MARGIN.left - MARGIN.right,
            height: 110,
            color: colors.secondaryLight,
            borderColor: colors.secondary,
            borderWidth: 2
        });

        // Score label
        page.drawText(
            language === 'nl' ? 'Interview Kans Score' : 'Interview Chance Score',
            {
                x: MARGIN.left + 20,
                y: cardY + 75,
                size: 14,
                font: fontBold,
                color: colors.text
            }
        );

        // Large score number
        page.drawText(`${matchScore}%`, {
            x: MARGIN.left + 20,
            y: cardY + 30,
            size: 42,
            font: fontBold,
            color: colors.secondary
        });

        // Score interpretation
        let scoreText = '';
        if (matchScore >= 80) {
            scoreText = language === 'nl' ? 'Uitstekend - Hoge kans op interview' : 'Excellent - High interview chance';
        } else if (matchScore >= 60) {
            scoreText = language === 'nl' ? 'Goed - Goede kans op interview' : 'Good - Good interview chance';
        } else {
            scoreText = language === 'nl' ? 'Voldoende - Verbetering mogelijk' : 'Adequate - Room for improvement';
        }

        page.drawText(scoreText, {
            x: MARGIN.left + 20,
            y: cardY + 10,
            size: 10,
            font: fontItalic,
            color: colors.textLight
        });

        y = cardY - 30;

        // ===== IMPROVEMENTS SUMMARY SECTION =====
        if (changesOverview) {
            y -= 10;

            // Section header with colored bar
            page.drawRectangle({
                x: MARGIN.left - 10,
                y: y - 25,
                width: 4,
                height: 20,
                color: colors.primary
            });

            page.drawText(
                language === 'nl' ? 'Belangrijkste Verbeteringen' : 'Key Improvements',
                {
                    x: MARGIN.left + 5,
                    y: y - 20,
                    size: 16,
                    font: fontBold,
                    color: colors.text
                }
            );

            y -= 40;

            const cleanedChanges = cleanMarkdown(changesOverview);
            y = addWrappedText(page, fontRegular, cleanedChanges, MARGIN.left, y,
                             width - MARGIN.left - MARGIN.right, 11, colors.text, 1.6);
        }

        // ===== IMPROVED CV SECTION =====
        if (improvedCV) {
            // Check if we need a new page
            if (y < 200) {
                page = pdfDoc.addPage([595, 842]);
                y = height - MARGIN.top;
                addPageHeader(page, fontBold, fontRegular, width, height, language);
                y -= 120;
            }

            y -= 30;

            // Section header with colored background
            page.drawRectangle({
                x: MARGIN.left - 10,
                y: y - 30,
                width: width - MARGIN.left - MARGIN.right + 20,
                height: 35,
                color: colors.background
            });

            page.drawRectangle({
                x: MARGIN.left - 10,
                y: y - 25,
                width: 4,
                height: 20,
                color: colors.secondary
            });

            page.drawText(
                language === 'nl' ? 'Geoptimaliseerde CV Tekst' : 'Optimized CV Text',
                {
                    x: MARGIN.left + 5,
                    y: y - 20,
                    size: 16,
                    font: fontBold,
                    color: colors.text
                }
            );

            page.drawText(
                language === 'nl'
                    ? 'Direct te gebruiken in uw CV'
                    : 'Ready to use in your CV',
                {
                    x: MARGIN.left + 5,
                    y: y - 35,
                    size: 9,
                    font: fontItalic,
                    color: colors.textLight
                }
            );

            y -= 60;

            // Add improved CV in a subtle box
            const cvStartY = y;
            const cleanedCV = cleanMarkdown(improvedCV);

            // Calculate how much space we need
            const cvLines = wrapText(cleanedCV, fontRegular, 10, width - MARGIN.left - MARGIN.right - 40);
            const cvHeight = cvLines.length * 14 + 20;

            // Background box for CV
            page.drawRectangle({
                x: MARGIN.left,
                y: y - cvHeight,
                width: width - MARGIN.left - MARGIN.right,
                height: cvHeight,
                color: colors.white,
                borderColor: colors.line,
                borderWidth: 1
            });

            y = addWrappedText(page, fontRegular, cleanedCV, MARGIN.left + 20, y - 10,
                             width - MARGIN.left - MARGIN.right - 40, 10, colors.text, 1.4);

            y -= 10;
        }

        // ===== PREMIUM CONTENT =====
        if (isPremium) {
            // Cover Letter
            if (coverLetter) {
                page = pdfDoc.addPage([595, 842]);
                y = height - MARGIN.top;
                addPageHeader(page, fontBold, fontRegular, width, height, language);
                y -= 120;

                // Section header
                page.drawRectangle({
                    x: MARGIN.left - 10,
                    y: y - 25,
                    width: 4,
                    height: 20,
                    color: colors.primary
                });

                page.drawText(
                    language === 'nl' ? 'AI Motivatiebrief' : 'AI Cover Letter',
                    {
                        x: MARGIN.left + 5,
                        y: y - 20,
                        size: 16,
                        font: fontBold,
                        color: colors.text
                    }
                );

                page.drawText(
                    language === 'nl'
                        ? 'Persoonlijk opgesteld voor deze functie'
                        : 'Personalized for this position',
                    {
                        x: MARGIN.left + 5,
                        y: y - 35,
                        size: 9,
                        font: fontItalic,
                        color: colors.textLight
                    }
                );

                y -= 55;

                const cleanedCoverLetter = cleanMarkdown(coverLetter);
                y = addWrappedText(page, fontRegular, cleanedCoverLetter, MARGIN.left, y,
                                 width - MARGIN.left - MARGIN.right, 11, colors.text, 1.6);
            }

            // Recruiter Tips
            if (recruiterTips) {
                page = pdfDoc.addPage([595, 842]);
                y = height - MARGIN.top;
                addPageHeader(page, fontBold, fontRegular, width, height, language);
                y -= 120;

                // Section header with warning color (insider tips)
                page.drawRectangle({
                    x: MARGIN.left - 10,
                    y: y - 25,
                    width: 4,
                    height: 20,
                    color: colors.warning
                });

                page.drawText(
                    language === 'nl' ? 'Recruiter Insider Tips' : 'Recruiter Insider Tips',
                    {
                        x: MARGIN.left + 5,
                        y: y - 20,
                        size: 16,
                        font: fontBold,
                        color: colors.text
                    }
                );

                page.drawText(
                    language === 'nl'
                        ? 'Exclusieve inzichten van ervaren recruiters'
                        : 'Exclusive insights from experienced recruiters',
                    {
                        x: MARGIN.left + 5,
                        y: y - 35,
                        size: 9,
                        font: fontItalic,
                        color: colors.textLight
                    }
                );

                y -= 55;

                const cleanedTips = cleanMarkdown(recruiterTips);
                y = addWrappedText(page, fontRegular, cleanedTips, MARGIN.left, y,
                                 width - MARGIN.left - MARGIN.right, 11, colors.text, 1.6);
            }
        } else {
            // Free user - upgrade message
            page = pdfDoc.addPage([595, 842]);
            y = height - MARGIN.top;
            addPageHeader(page, fontBold, fontRegular, width, height, language);

            y = height / 2;

            // Upgrade box
            const boxHeight = 280;
            const boxY = y - boxHeight/2;

            page.drawRectangle({
                x: 100,
                y: boxY,
                width: width - 200,
                height: boxHeight,
                color: colors.background,
                borderColor: colors.primary,
                borderWidth: 2
            });

            y = boxY + boxHeight - 40;

            const upgradeTitle = language === 'nl' ? 'Unlock Volledige Analyse' : 'Unlock Full Analysis';
            const titleWidth = fontBold.widthOfTextAtSize(upgradeTitle, 20);
            page.drawText(upgradeTitle, {
                x: (width - titleWidth) / 2,
                y: y,
                size: 20,
                font: fontBold,
                color: colors.primary
            });
            y -= 35;

            const subtitle = language === 'nl'
                ? 'Upgrade naar Pro voor de volledige analyse'
                : 'Upgrade to Pro for the full analysis';
            const subtitleWidth = fontRegular.widthOfTextAtSize(subtitle, 12);
            page.drawText(subtitle, {
                x: (width - subtitleWidth) / 2,
                y: y,
                size: 12,
                font: fontRegular,
                color: colors.textLight
            });

            y -= 40;

            const features = language === 'nl'
                ? [
                    '12+ gedetailleerde ATS-verbeteringen',
                    'AI-gegenereerde motivatiebrief',
                    'Recruiter insider tips',
                    'Onbeperkte CV analyses'
                  ]
                : [
                    '12+ detailed ATS improvements',
                    'AI-generated cover letter',
                    'Recruiter insider tips',
                    'Unlimited CV analyses'
                  ];

            features.forEach(feature => {
                page.drawText('✓', {
                    x: 140,
                    y: y,
                    size: 14,
                    font: fontBold,
                    color: colors.secondary
                });

                page.drawText(feature, {
                    x: 165,
                    y: y,
                    size: 11,
                    font: fontRegular,
                    color: colors.text
                });
                y -= 25;
            });

            y -= 20;

            const cta = 'applyjobmatch.nl';
            const ctaWidth = fontBold.widthOfTextAtSize(cta, 14);
            page.drawText(cta, {
                x: (width - ctaWidth) / 2,
                y: y,
                size: 14,
                font: fontBold,
                color: colors.primary
            });
        }

        // Add footers to all pages
        const pages = pdfDoc.getPages();
        pages.forEach((p, i) => {
            addFooter(p, fontRegular, width, height, language, isPremium, i + 1, pages.length);
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
                'Content-Disposition': `attachment; filename="CV-Analysis-ApplyJobMatch-${Date.now()}.pdf"`,
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

function addPageHeader(page, fontBold, fontRegular, width, height, language) {
    // Smaller header for subsequent pages
    page.drawRectangle({
        x: 0,
        y: height - 60,
        width: width,
        height: 60,
        color: colors.primary
    });

    page.drawText('ApplyJobMatch.nl', {
        x: MARGIN.left,
        y: height - 38,
        size: 14,
        font: fontBold,
        color: colors.white
    });

    page.drawText(language === 'nl' ? 'CV Analyse' : 'CV Analysis', {
        x: width - MARGIN.right - 100,
        y: height - 38,
        size: 10,
        font: fontRegular,
        color: colors.primaryLight
    });
}

function addFooter(page, fontRegular, width, height, language, isPremium, pageNum, totalPages) {
    // Footer line
    page.drawLine({
        start: { x: MARGIN.left, y: MARGIN.bottom + 20 },
        end: { x: width - MARGIN.right, y: MARGIN.bottom + 20 },
        thickness: 0.5,
        color: colors.line
    });

    // Footer text
    const footerText = language === 'nl'
        ? `ApplyJobMatch.nl • ${isPremium ? 'Pro Rapport' : 'Gratis Rapport'}`
        : `ApplyJobMatch.nl • ${isPremium ? 'Pro Report' : 'Free Report'}`;

    page.drawText(footerText, {
        x: MARGIN.left,
        y: MARGIN.bottom,
        size: 8,
        font: fontRegular,
        color: colors.textExtraLight
    });

    // Page number
    const pageText = `${pageNum} / ${totalPages}`;
    const pageWidth = fontRegular.widthOfTextAtSize(pageText, 8);

    page.drawText(pageText, {
        x: width - MARGIN.right - pageWidth,
        y: MARGIN.bottom,
        size: 8,
        font: fontRegular,
        color: colors.textExtraLight
    });
}

function addWrappedText(page, font, text, x, y, maxWidth, fontSize, color, lineHeight = 1.4) {
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

function cleanMarkdown(text) {
    if (!text) return '';

    return text
        // Remove prompt instructions patterns
        .replace(/\*\*Origineel:\*\*.*?(?=\n\n|\n\*\*|$)/gs, '')
        .replace(/\*\*Verbeterd:\*\*.*?(?=\n\n|$)/gs, '')
        .replace(/Hieronder vind je.*?(?=\n\n|$)/gi, '')
        .replace(/Absoluut!.*?(?=\n\n|$)/gi, '')
        .replace(/Natuurlijk!.*?(?=\n\n|$)/gi, '')
        .replace(/Hier (is|zijn).*?(?=\n\n|$)/gi, '')
        .replace(/###\s*\d+\..*?\n/g, '')
        // Remove markdown headers
        .replace(/#{1,6}\s+/g, '')
        // Remove bold markers
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove italic markers
        .replace(/\*(.*?)\*/g, '$1')
        // Remove list markers but keep the dash
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

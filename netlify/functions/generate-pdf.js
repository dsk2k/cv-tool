/**
 * Professional PDF Generation for CV Analysis
 *
 * Generates a branded, professional PDF with:
 * - Company logo and branding
 * - Full CV analysis (premium only)
 * - Cover letter (premium only)
 * - Recruiter tips (premium only)
 * - Professional layout and typography
 */

const PDFDocument = require('pdfkit');

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: 'CV Analysis Report - ApplyJobMatch.nl',
                Author: 'ApplyJobMatch.nl',
                Subject: 'Professional CV Analysis',
                Keywords: 'CV, Resume, Analysis, Job Search'
            }
        });

        // Collect PDF chunks
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
            console.log('✅ PDF generation complete');
        });

        // ===== HEADER =====
        addHeader(doc, language);

        // ===== TITLE =====
        doc.fontSize(24)
           .fillColor('#4F46E5')
           .text(language === 'nl' ? 'Uw CV Analyse Rapport' : 'Your CV Analysis Report', {
               align: 'center'
           });

        doc.moveDown(0.5);

        // Match Score Badge
        doc.fontSize(14)
           .fillColor('#6B7280')
           .text(language === 'nl' ? 'Interview Kans Score' : 'Interview Chance Score', {
               align: 'center'
           });

        doc.fontSize(48)
           .fillColor('#10B981')
           .text(`${matchScore}%`, {
               align: 'center'
           });

        doc.moveDown(1);

        // ===== CHANGES OVERVIEW =====
        addSection(doc, language === 'nl' ? '📊 Samenvatting Verbeteringen' : '📊 Improvements Summary');

        if (changesOverview) {
            const cleanedChanges = cleanMarkdown(changesOverview);
            doc.fontSize(11)
               .fillColor('#374151')
               .text(cleanedChanges, {
                   align: 'left',
                   lineGap: 3
               });
        }

        doc.moveDown(1);

        // ===== IMPROVED CV =====
        if (improvedCV) {
            addSection(doc, language === 'nl' ? '✨ Geoptimaliseerde CV' : '✨ Optimized CV');

            const cleanedCV = cleanMarkdown(improvedCV);
            doc.fontSize(10)
               .fillColor('#1F2937')
               .text(cleanedCV, {
                   align: 'left',
                   lineGap: 2
               });

            doc.moveDown(1);
        }

        // ===== PREMIUM CONTENT =====
        if (isPremium) {
            // Cover Letter (Premium Only)
            if (coverLetter) {
                doc.addPage();
                addHeader(doc, language);
                addSection(doc, language === 'nl' ? '✉️ AI Motivatiebrief' : '✉️ AI Cover Letter');

                const cleanedCoverLetter = cleanMarkdown(coverLetter);
                doc.fontSize(11)
                   .fillColor('#1F2937')
                   .text(cleanedCoverLetter, {
                       align: 'left',
                       lineGap: 4
                   });

                doc.moveDown(1);
            }

            // Recruiter Tips (Premium Only)
            if (recruiterTips) {
                doc.addPage();
                addHeader(doc, language);
                addSection(doc, language === 'nl' ? '🎯 Recruiter Insider Tips' : '🎯 Recruiter Insider Tips');

                const cleanedTips = cleanMarkdown(recruiterTips);
                doc.fontSize(11)
                   .fillColor('#1F2937')
                   .text(cleanedTips, {
                       align: 'left',
                       lineGap: 4
                   });

                doc.moveDown(1);
            }
        } else {
            // Free user - show upgrade message
            doc.addPage();
            addHeader(doc, language);

            doc.fontSize(20)
               .fillColor('#6366F1')
               .text('🔒', { align: 'center' });

            doc.moveDown(0.5);

            doc.fontSize(18)
               .fillColor('#1F2937')
               .text(
                   language === 'nl'
                       ? 'Unlock Volledige Analyse'
                       : 'Unlock Full Analysis',
                   { align: 'center' }
               );

            doc.moveDown(0.5);

            doc.fontSize(12)
               .fillColor('#6B7280')
               .text(
                   language === 'nl'
                       ? 'Upgrade naar Pro voor:\n\n• Volledige gedetailleerde feedback (12+ verbeteringen)\n• AI-gegenereerde motivatiebrief\n• Recruiter insider tips\n• Onbeperkte CV analyses\n\nBezoek applyjobmatch.nl voor meer informatie'
                       : 'Upgrade to Pro for:\n\n• Full detailed feedback (12+ improvements)\n• AI-generated cover letter\n• Recruiter insider tips\n• Unlimited CV analyses\n\nVisit applyjobmatch.nl for more information',
                   {
                       align: 'center',
                       lineGap: 5
                   }
               );
        }

        // ===== FOOTER =====
        addFooter(doc, language, isPremium);

        // Finalize PDF
        doc.end();

        // Wait for PDF to finish
        await new Promise(resolve => doc.on('end', resolve));

        // Combine chunks into buffer
        const pdfBuffer = Buffer.concat(chunks);

        console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

        // Return PDF
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="CV-Analysis-${Date.now()}.pdf"`,
                'Content-Length': pdfBuffer.length
            },
            body: pdfBuffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('❌ PDF generation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to generate PDF',
                message: error.message
            })
        };
    }
};

// ===== HELPER FUNCTIONS =====

function addHeader(doc, language) {
    // Add header with branding
    doc.fontSize(10)
       .fillColor('#6366F1')
       .text('ApplyJobMatch.nl', 50, 30, { align: 'right' });

    // Horizontal line
    doc.moveTo(50, 45)
       .lineTo(545, 45)
       .strokeColor('#E5E7EB')
       .stroke();

    doc.moveDown(2);
}

function addFooter(doc, language, isPremium) {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        // Footer line
        doc.moveTo(50, 792 - 40)
           .lineTo(545, 792 - 40)
           .strokeColor('#E5E7EB')
           .stroke();

        // Footer text
        doc.fontSize(8)
           .fillColor('#9CA3AF')
           .text(
               language === 'nl'
                   ? `Gegenereerd door ApplyJobMatch.nl • ${isPremium ? 'Pro' : 'Free'} • Pagina ${i + 1} van ${pageCount}`
                   : `Generated by ApplyJobMatch.nl • ${isPremium ? 'Pro' : 'Free'} • Page ${i + 1} of ${pageCount}`,
               50,
               792 - 30,
               {
                   align: 'center',
                   width: 495
               }
           );
    }
}

function addSection(doc, title) {
    doc.fontSize(16)
       .fillColor('#1F2937')
       .text(title, { underline: false });

    doc.moveDown(0.5);

    // Underline
    doc.moveTo(50, doc.y)
       .lineTo(250, doc.y)
       .strokeColor('#6366F1')
       .lineWidth(2)
       .stroke();

    doc.moveDown(0.5);
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
        .replace(/^[\-\*]\s+/gm, '• ')
        // Clean up extra newlines
        .replace(/\n{3,}/g, '\n\n')
        // Trim
        .trim();
}

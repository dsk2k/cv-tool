/**
 * PDF Generator - Client-Side
 * Secure, free, and privacy-focused PDF generation
 * Uses jsPDF for client-side rendering (no server costs!)
 */

class PDFGenerator {
    constructor() {
        this.jsPDF = null;
        this.isInitialized = false;
    }

    /**
     * Initialize jsPDF library (lazy loaded)
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Load jsPDF from CDN (only when needed)
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            this.jsPDF = window.jspdf.jsPDF;
            this.isInitialized = true;
            console.log('✅ PDF Generator initialized');
        } catch (error) {
            console.error('❌ Failed to load jsPDF:', error);
            throw new Error('PDF library failed to load');
        }
    }

    /**
     * Load external script
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Sanitize text to prevent XSS and encoding issues
     */
    sanitizeText(text) {
        if (!text) return '';

        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim()
            .substring(0, 10000); // Max 10k characters per field
    }

    /**
     * Download improved CV as PDF
     * @param {string} cvContent - The improved CV content (HTML or plain text)
     * @param {Object} metadata - CV metadata (name, job title, etc.)
     */
    async downloadCV(cvContent, metadata = {}) {
        try {
            await this.init();

            // Sanitize inputs
            const safeCVContent = this.sanitizeText(cvContent);
            const safeName = this.sanitizeText(metadata.name || 'Candidate');
            const safeJobTitle = this.sanitizeText(metadata.jobTitle || 'Position');

            // Track download
            if (window.trackDownload) {
                window.trackDownload('cv');
            }

            // Create PDF
            const doc = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Set metadata
            doc.setProperties({
                title: `CV - ${safeName}`,
                subject: `CV tailored for ${safeJobTitle}`,
                author: safeName,
                keywords: 'cv, resume, optimized',
                creator: 'AI CV Tailor'
            });

            // Add content
            this.addCVContent(doc, safeCVContent, safeName, safeJobTitle);

            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `CV_${safeName.replace(/\s+/g, '_')}_${timestamp}.pdf`;

            // Download (stays in browser, never uploaded)
            doc.save(filename);

            console.log('✅ PDF downloaded:', filename);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ PDF generation failed:', error);

            // Track error
            if (window.trackCVSubmissionError) {
                window.trackCVSubmissionError('pdf_generation_failed');
            }

            return {
                success: false,
                error: 'Failed to generate PDF. Please try again or copy the text manually.'
            };
        }
    }

    /**
     * Download cover letter as PDF
     */
    async downloadCoverLetter(letterContent, metadata = {}) {
        try {
            await this.init();

            const safeContent = this.sanitizeText(letterContent);
            const safeName = this.sanitizeText(metadata.name || 'Candidate');
            const safeJobTitle = this.sanitizeText(metadata.jobTitle || 'Position');

            // Track download
            if (window.trackDownload) {
                window.trackDownload('cover_letter');
            }

            const doc = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            doc.setProperties({
                title: `Cover Letter - ${safeName}`,
                subject: `Cover Letter for ${safeJobTitle}`,
                author: safeName,
                keywords: 'cover letter, application',
                creator: 'AI CV Tailor'
            });

            this.addLetterContent(doc, safeContent, safeName, safeJobTitle);

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `CoverLetter_${safeName.replace(/\s+/g, '_')}_${timestamp}.pdf`;

            doc.save(filename);

            console.log('✅ Cover letter downloaded:', filename);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ Cover letter generation failed:', error);
            return {
                success: false,
                error: 'Failed to generate cover letter PDF.'
            };
        }
    }

    /**
     * Add CV content to PDF with professional formatting
     */
    addCVContent(doc, content, name, jobTitle) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (2 * margin);
        let y = margin;

        // Header - Name
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(name, margin, y);
        y += 10;

        // Job Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Applying for: ${jobTitle}`, margin, y);
        y += 15;

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Content
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        // Split content into lines and add to PDF
        const lines = doc.splitTextToSize(content, maxWidth);

        lines.forEach(line => {
            // Check if we need a new page
            if (y > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            doc.text(line, margin, y);
            y += 6;
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Generated by AI CV Tailor - Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }
    }

    /**
     * Add cover letter content to PDF
     */
    addLetterContent(doc, content, name, jobTitle) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 25;
        const maxWidth = pageWidth - (2 * margin);
        let y = margin;

        // Header - Name
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(name, margin, y);
        y += 8;

        // Date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(today, margin, y);
        y += 15;

        // Content
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const lines = doc.splitTextToSize(content, maxWidth);

        lines.forEach(line => {
            if (y > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            doc.text(line, margin, y);
            y += 6;
        });

        // Signature area
        y += 20;
        if (y > pageHeight - margin - 20) {
            doc.addPage();
            y = margin;
        }

        doc.text('Sincerely,', margin, y);
        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text(name, margin, y);
    }

    /**
     * Estimate PDF size before generation (for rate limiting)
     */
    estimateSize(content) {
        // Rough estimate: ~1KB per 500 characters
        const sizeKB = Math.ceil(content.length / 500);
        return sizeKB;
    }
}

// Create global instance
window.pdfGenerator = new PDFGenerator();

// Export for use
window.downloadCVAsPDF = async (cvContent, metadata) => {
    return await window.pdfGenerator.downloadCV(cvContent, metadata);
};

window.downloadCoverLetterAsPDF = async (letterContent, metadata) => {
    return await window.pdfGenerator.downloadCoverLetter(letterContent, metadata);
};

console.log('📄 PDF Generator loaded (client-side, secure, free!)');

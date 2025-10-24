// REPLACE THE downloadPdfBtn EVENT LISTENER (around line 633) WITH THIS:

downloadPdfBtn.addEventListener('click', async function() {
    try {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            showError('PDF library not loaded. Please refresh the page and try again.');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        // Use global variables for content
        const coverLetterText = generatedCoverLetter;
        const improvedCVText = generatedImprovedCV;
        const changesMadeText = generatedChangesMade;
        
        // Check content
        if (!improvedCVText || improvedCVText.length < 50) {
            showError('Please generate your application first before downloading PDF.');
            return;
        }
        
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Page settings
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (2 * margin);
        let yPosition = margin;
        
        // Color scheme
        const colors = {
            primary: [41, 128, 185],      // Blue
            secondary: [52, 73, 94],      // Dark blue-gray
            accent: [46, 204, 113],       // Green
            text: [44, 62, 80],           // Dark text
            lightGray: [189, 195, 199],   // Light gray
            white: [255, 255, 255]
        };
        
        // Helper function to check if we need a new page
        function checkNewPage(neededSpace = 20) {
            if (yPosition + neededSpace > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
                return true;
            }
            return false;
        }
        
        // Helper function to parse and format CV text
        function parseAndFormatCV(text) {
            const lines = text.split('\n');
            let inContactInfo = false;
            let inSection = false;
            let currentSection = '';
            
            lines.forEach((line, index) => {
                const trimmedLine = line.trim();
                
                // Skip empty lines at the start
                if (!trimmedLine && yPosition < 50) return;
                
                checkNewPage();
                
                // Detect name (usually first line with ** markers or all caps)
                if (index < 3 && (trimmedLine.includes('**') || trimmedLine === trimmedLine.toUpperCase())) {
                    const name = trimmedLine.replace(/\*\*/g, '').trim();
                    doc.setFontSize(24);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...colors.primary);
                    doc.text(name, margin, yPosition);
                    yPosition += 10;
                    inContactInfo = true;
                    return;
                }
                
                // Detect contact info (email, phone, location, LinkedIn)
                if (inContactInfo && (trimmedLine.includes('@') || trimmedLine.includes('|') || 
                    trimmedLine.includes('Phone') || trimmedLine.includes('LinkedIn'))) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...colors.text);
                    const contactText = trimmedLine.replace(/\[|\]/g, '');
                    doc.text(contactText, margin, yPosition);
                    yPosition += 5;
                    
                    // Add line separator after contact info
                    if (index < 5) {
                        yPosition += 2;
                        doc.setDrawColor(...colors.lightGray);
                        doc.setLineWidth(0.5);
                        doc.line(margin, yPosition, pageWidth - margin, yPosition);
                        yPosition += 8;
                        inContactInfo = false;
                    }
                    return;
                }
                
                // Detect section headers (SUMMARY, SKILLS, EXPERIENCE, EDUCATION, etc.)
                if (trimmedLine.match(/^\*\*[A-Z\s]+\*\*$/) || 
                    (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && trimmedLine.length < 30)) {
                    checkNewPage(25);
                    yPosition += 5;
                    
                    const sectionTitle = trimmedLine.replace(/\*\*/g, '').trim();
                    currentSection = sectionTitle;
                    
                    // Section header with background
                    doc.setFillColor(...colors.primary);
                    doc.rect(margin - 2, yPosition - 5, contentWidth + 4, 8, 'F');
                    
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...colors.white);
                    doc.text(sectionTitle, margin, yPosition);
                    yPosition += 10;
                    
                    doc.setTextColor(...colors.text);
                    return;
                }
                
                // Detect company/job titles (bold items within experience)
                if (trimmedLine.includes('**') && !trimmedLine.match(/^\*\*[A-Z\s]+\*\*$/)) {
                    checkNewPage(15);
                    const boldText = trimmedLine.replace(/\*\*/g, '');
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...colors.secondary);
                    
                    const textLines = doc.splitTextToSize(boldText, contentWidth);
                    textLines.forEach(textLine => {
                        checkNewPage();
                        doc.text(textLine, margin, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 1;
                    return;
                }
                
                // Detect bullet points
                if (trimmedLine.startsWith('•') || trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
                    checkNewPage(10);
                    const bulletText = trimmedLine.substring(1).trim();
                    
                    // Draw bullet
                    doc.setFillColor(...colors.accent);
                    doc.circle(margin + 2, yPosition - 1.5, 1, 'F');
                    
                    // Bullet text
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...colors.text);
                    
                    const textLines = doc.splitTextToSize(bulletText, contentWidth - 8);
                    textLines.forEach((textLine, i) => {
                        if (i > 0) checkNewPage();
                        doc.text(textLine, margin + 6, yPosition);
                        yPosition += 5;
                    });
                    return;
                }
                
                // Regular paragraph text
                if (trimmedLine) {
                    checkNewPage(10);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...colors.text);
                    
                    const textLines = doc.splitTextToSize(trimmedLine, contentWidth);
                    textLines.forEach(textLine => {
                        checkNewPage();
                        doc.text(textLine, margin, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 2;
                }
            });
        }
        
        // Helper function to add a simple section with header
        function addSection(title, content, headerColor) {
            checkNewPage(30);
            
            // Section header
            doc.setFillColor(...headerColor);
            doc.rect(0, yPosition - 5, pageWidth, 12, 'F');
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.white);
            doc.text(title, margin, yPosition + 2);
            yPosition += 15;
            
            doc.setTextColor(...colors.text);
            
            // Content
            if (content && content.trim()) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                const lines = content.split('\n');
                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine) {
                        checkNewPage(10);
                        
                        // Handle bullet points
                        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
                            const bulletText = trimmedLine.substring(1).trim();
                            doc.setFillColor(...colors.accent);
                            doc.circle(margin + 2, yPosition - 1.5, 1, 'F');
                            
                            const textLines = doc.splitTextToSize(bulletText, contentWidth - 8);
                            textLines.forEach((textLine, i) => {
                                if (i > 0) checkNewPage();
                                doc.text(textLine, margin + 6, yPosition);
                                yPosition += 5;
                            });
                        } else {
                            const textLines = doc.splitTextToSize(trimmedLine, contentWidth);
                            textLines.forEach(textLine => {
                                checkNewPage();
                                doc.text(textLine, margin, yPosition);
                                yPosition += 5;
                            });
                        }
                        yPosition += 2;
                    }
                });
            }
            
            yPosition += 10;
        }
        
        // Generate PDF content
        
        // 1. Cover Letter (if exists)
        if (coverLetterText && coverLetterText.trim() && 
            !coverLetterText.includes('generation failed')) {
            addSection('Cover Letter', coverLetterText, colors.primary);
            
            // Add page break before CV
            doc.addPage();
            yPosition = margin;
        }
        
        // 2. Improved CV (main content)
        parseAndFormatCV(improvedCVText);
        
        // 3. Changes Made (if exists)
        if (changesMadeText && changesMadeText.trim() && 
            !changesMadeText.includes('not available')) {
            doc.addPage();
            yPosition = margin;
            addSection('Changes Made to Your CV', changesMadeText, colors.accent);
        }
        
        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Generated by applyjobmatch.nl', pageWidth / 2, pageHeight - 8, { align: 'center' });
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        }
        
        // Save PDF
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `CV_Improved_${timestamp}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showError('Failed to generate PDF. Please try again or contact support if the problem persists.');
    }
});

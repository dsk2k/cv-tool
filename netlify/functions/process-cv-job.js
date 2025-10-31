const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { checkCache, saveToCache } = require('./cache-helper');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// All start markers for extraction
const ALL_START_MARKERS = [
  '---IMPROVED_CV_START---',
  '---COVER_LETTER_START---',
  '---RECRUITER_TIPS_START---',
  '---CHANGES_OVERVIEW_START---'
];

// Helper function to extract sections
function extractSection(fullText, startMarker, endMarker, fallbackMessage) {
  try {
    const startIndex = fullText.indexOf(startMarker);
    if (startIndex === -1) {
      console.log(`⚠️  Could not find ${startMarker}`);
      return { success: false, content: fallbackMessage };
    }

    const contentStart = startIndex + startMarker.length;
    let endIndex = fullText.indexOf(endMarker, contentStart);

    // Robust Fallback: If end marker is missing, find the next different start marker
    if (endIndex === -1) {
      console.log(`⚠️  Could not find ${endMarker}. Using fallback.`);
      let nearestNextStartIndex = fullText.length;
      for (const marker of ALL_START_MARKERS) {
        if (marker === startMarker) continue;
        const nextMarkerIndex = fullText.indexOf(marker, contentStart);
        if (nextMarkerIndex !== -1 && nextMarkerIndex < nearestNextStartIndex) {
          nearestNextStartIndex = nextMarkerIndex;
        }
      }
      endIndex = nearestNextStartIndex;
    }

    let content = fullText.substring(contentStart, endIndex).trim();

    if (!content || content.length < 5) {
      return { success: false, content: fallbackMessage };
    }

    // Check for contamination
    for (const marker of ALL_START_MARKERS) {
      if (marker === startMarker) continue;
      if (content.includes(marker)) {
        const contaminationIndex = content.indexOf(marker);
        content = content.substring(0, contaminationIndex).trim();
        if (!content || content.length < 5) {
          return { success: false, content: fallbackMessage };
        }
      }
    }

    return { success: true, content };
  } catch (error) {
    console.error(`❌ Error extracting section ${startMarker}:`, error);
    return { success: false, content: fallbackMessage };
  }
}

// Create prompt (simplified version)
function createPrompt(cvText, jobDescription, language) {
  const lang = language === 'nl' ? 'Nederlands' : 'English';

  return `You are an expert CV optimizer. Analyze this CV against the job description and provide output in ${lang}.

IMPORTANT: Respond with these EXACT markers:

---IMPROVED_CV_START---
[Improved CV text in ${lang}]
---IMPROVED_CV_END---

---COVER_LETTER_START---
[Professional cover letter in ${lang}]
---COVER_LETTER_END---

---RECRUITER_TIPS_START---
[Bulleted recruiter tips in ${lang}]
---RECRUITER_TIPS_END---

---CHANGES_OVERVIEW_START---
[Summary of changes in ${lang}]
---CHANGES_OVERVIEW_END---

Job Description:
${jobDescription}

Current CV:
${cvText}

Optimize the CV for:
1. Keywords from job description
2. Relevant skills and experience
3. ATS-friendly structure
4. Professional formatting`;
}

// Main handler
exports.handler = async (event) => {
  const startTime = Date.now();

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Job-ID',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    };
  }

  try {
    console.log('🔄 Background processor started');

    const body = JSON.parse(event.body);
    const { jobId, cvText, jobDescription, language } = body;

    if (!jobId || !cvText || !jobDescription) {
      throw new Error('Missing required parameters');
    }

    console.log(`📋 Processing job: ${jobId}`);

    // Update status to processing
    await supabase
      .from('cv_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('job_id', jobId);

    console.log('✅ Job status updated to processing');

    // Check cache first
    console.log('🔍 Checking cache...');
    const cachedResult = await checkCache(cvText, jobDescription, language);

    if (cachedResult) {
      console.log('🎯 CACHE HIT!');

      // Update job with cached result
      await supabase
        .from('cv_jobs')
        .update({
          status: 'completed',
          result: cachedResult,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime
        })
        .eq('job_id', jobId);

      console.log(`✅ Job completed with cache in ${Date.now() - startTime}ms`);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, cached: true })
      };
    }

    // No cache - call Gemini API
    console.log('🤖 Calling Gemini API...');
    console.log(`📄 CV: ${cvText.length} chars`);
    console.log(`💼 Job Description: ${jobDescription.length} chars`);

    const prompt = createPrompt(cvText, jobDescription, language);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      }
    });

    // Call Gemini (no timeout here - we have plenty of time in background)
    const result = await model.generateContent(prompt);
    const fullText = result.response.text();

    console.log(`✅ Gemini response received: ${fullText.length} chars`);

    // Extract sections
    const improvedCV = extractSection(fullText, '---IMPROVED_CV_START---', '---IMPROVED_CV_END---', 'Could not generate CV');
    const coverLetter = extractSection(fullText, '---COVER_LETTER_START---', '---COVER_LETTER_END---', 'Could not generate cover letter');
    const recruiterTips = extractSection(fullText, '---RECRUITER_TIPS_START---', '---RECRUITER_TIPS_END---', 'Could not generate tips');
    const changesOverview = extractSection(fullText, '---CHANGES_OVERVIEW_START---', '---CHANGES_OVERVIEW_END---', 'Could not generate changes');

    console.log(`${improvedCV.success ? '✅' : '❌'} CV: ${improvedCV.content.length} chars`);
    console.log(`${coverLetter.success ? '✅' : '❌'} Cover Letter: ${coverLetter.content.length} chars`);
    console.log(`${recruiterTips.success ? '✅' : '❌'} Tips: ${recruiterTips.content.length} chars`);
    console.log(`${changesOverview.success ? '✅' : '❌'} Changes: ${changesOverview.content.length} chars`);

    const responseData = {
      improvedCV: improvedCV.content,
      coverLetter: coverLetter.content,
      recruiterTips: recruiterTips.content,
      changesOverview: changesOverview.content,
      metadata: {
        language,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };

    // Save to cache
    console.log('💾 Saving to cache...');
    await saveToCache(cvText, jobDescription, language, responseData);
    console.log('✅ Saved to cache');

    // Update job with result
    await supabase
      .from('cv_jobs')
      .update({
        status: 'completed',
        result: responseData,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      })
      .eq('job_id', jobId);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Job ${jobId} completed successfully in ${totalTime}ms`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, processingTime: totalTime })
    };

  } catch (error) {
    console.error('❌ Background processing error:', error);

    // Try to update job status to failed
    try {
      const body = JSON.parse(event.body);
      if (body.jobId) {
        await supabase
          .from('cv_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime
          })
          .eq('job_id', body.jobId);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Background processing failed',
        message: error.message
      })
    };
  }
};

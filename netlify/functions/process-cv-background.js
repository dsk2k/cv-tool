// Netlify Background Function - runs up to 15 minutes on Pro plan
// Must return 202 immediately, then continues processing

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { checkCache, saveToCache } = require('./cache-helper');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const ALL_START_MARKERS = [
  '---IMPROVED_CV_START---',
  '---COVER_LETTER_START---',
  '---RECRUITER_TIPS_START---',
  '---CHANGES_OVERVIEW_START---'
];

function extractSection(fullText, startMarker, endMarker, fallbackMessage) {
  try {
    const startIndex = fullText.indexOf(startMarker);
    if (startIndex === -1) return { success: false, content: fallbackMessage };

    const contentStart = startIndex + startMarker.length;
    let endIndex = fullText.indexOf(endMarker, contentStart);

    if (endIndex === -1) {
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
    if (!content || content.length < 5) return { success: false, content: fallbackMessage };

    for (const marker of ALL_START_MARKERS) {
      if (marker === startMarker) continue;
      if (content.includes(marker)) {
        const contaminationIndex = content.indexOf(marker);
        content = content.substring(0, contaminationIndex).trim();
        if (!content || content.length < 5) return { success: false, content: fallbackMessage };
      }
    }

    return { success: true, content };
  } catch (error) {
    return { success: false, content: fallbackMessage };
  }
}

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

exports.handler = async (event, context) => {
  const startTime = Date.now();

  // CRITICAL: Return 202 immediately to avoid timeout
  // Background function continues processing after response
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { jobId, cvText, jobDescription, language } = JSON.parse(event.body);

    console.log(`🔄 [BACKGROUND] Processing job: ${jobId}`);

    // Update job status to processing
    await supabase
      .from('cv_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('job_id', jobId);

    // Check cache
    const cachedResult = await checkCache(cvText, jobDescription, language);
    if (cachedResult) {
      console.log(`🎯 [BACKGROUND] Cache hit for job: ${jobId}`);
      await supabase
        .from('cv_jobs')
        .update({
          status: 'completed',
          result: cachedResult,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime
        })
        .eq('job_id', jobId);

      return { statusCode: 200 };
    }

    // Call Gemini API (no timeout concerns - we have 15 minutes!)
    console.log(`🤖 [BACKGROUND] Calling Gemini for job: ${jobId}`);
    const prompt = createPrompt(cvText, jobDescription, language);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 4096,  // Full quality
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      }
    });

    const result = await model.generateContent(prompt);
    const fullText = result.response.text();

    console.log(`✅ [BACKGROUND] Gemini completed for job: ${jobId} (${fullText.length} chars)`);

    // Extract sections
    const improvedCV = extractSection(fullText, '---IMPROVED_CV_START---', '---IMPROVED_CV_END---', 'Could not generate CV');
    const coverLetter = extractSection(fullText, '---COVER_LETTER_START---', '---COVER_LETTER_END---', 'Could not generate cover letter');
    const recruiterTips = extractSection(fullText, '---RECRUITER_TIPS_START---', '---RECRUITER_TIPS_END---', 'Could not generate tips');
    const changesOverview = extractSection(fullText, '---CHANGES_OVERVIEW_START---', '---CHANGES_OVERVIEW_END---', 'Could not generate changes');

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
    await saveToCache(cvText, jobDescription, language, responseData);

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

    console.log(`✅ [BACKGROUND] Job ${jobId} completed in ${Date.now() - startTime}ms`);

    return { statusCode: 200 };

  } catch (error) {
    console.error(`❌ [BACKGROUND] Error:`, error);

    try {
      const { jobId } = JSON.parse(event.body);
      await supabase
        .from('cv_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('job_id', jobId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return { statusCode: 500 };
  }
};

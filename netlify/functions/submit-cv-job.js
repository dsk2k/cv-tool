const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const multipart = require('parse-multipart-data');
const { rateLimitMiddleware } = require('./rate-limiter');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Generate unique job ID
function generateJobId() {
  return `job_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

// Generate hash for caching
function generateHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

exports.handler = async (event) => {
  const startTime = Date.now();

  // CORS headers
  const allowedOrigins = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    'http://localhost:8888',
    'http://localhost:3000'
  ].filter(Boolean);
  const origin = event.headers.origin || event.headers.Origin;
  const allowOrigin = allowedOrigins.some(allowed => origin?.startsWith(allowed)) ? origin : allowedOrigins[0];
  const headers = {
    'Access-Control-Allow-Origin': allowOrigin || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('🚀 Job submission started');

    // Check rate limit
    const rateLimit = await rateLimitMiddleware(event);
    if (!rateLimit.allowed) {
      console.log('⛔ Rate limit exceeded');
      return {
        statusCode: 429,
        headers: { ...headers, ...rateLimit.headers },
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          resetAt: rateLimit.resetAt,
          rateLimit: {
            used: rateLimit.used,
            total: rateLimit.total,
            remaining: 0,
            isDeveloperMode: rateLimit.isDeveloperMode || false
          }
        }),
      };
    }

    // Parse multipart form data
    const boundary = multipart.getBoundary(event.headers['content-type']);
    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);

    let cvFile = null;
    let jobDescription = '';
    let language = 'nl';

    for (const part of parts) {
      if (part.name === 'cv') {
        cvFile = part;
      } else if (part.name === 'jobDescription') {
        jobDescription = part.data.toString('utf8');
      } else if (part.name === 'language') {
        language = part.data.toString('utf8');
      }
    }

    if (!cvFile || !jobDescription) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing CV or job description' }),
      };
    }

    // Parse PDF
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(cvFile.data);
    const cvText = pdfData.text;

    console.log(`📄 CV parsed: ${cvText.length} chars`);

    // Generate hashes for caching/deduplication
    const cvHash = generateHash(cvText);
    const jobDescHash = generateHash(jobDescription);

    // Check if we have this exact request in progress or completed recently
    const { data: existingJobs } = await supabase
      .from('cv_jobs')
      .select('*')
      .eq('cv_hash', cvHash)
      .eq('job_description_hash', jobDescHash)
      .eq('language', language)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false })
      .limit(1);

    // If we have a recent completed job, return it immediately
    if (existingJobs && existingJobs.length > 0) {
      const existingJob = existingJobs[0];
      if (existingJob.status === 'completed' && existingJob.result) {
        console.log(`🎯 Found recent completed job: ${existingJob.job_id}`);
        return {
          statusCode: 200,
          headers: { ...headers, ...rateLimit.headers },
          body: JSON.stringify({
            jobId: existingJob.job_id,
            status: 'completed',
            result: existingJob.result,
            cached: true,
            rateLimit: {
              used: rateLimit.used,
              total: rateLimit.total,
              remaining: rateLimit.remaining,
              isDeveloperMode: rateLimit.isDeveloperMode || false
            }
          }),
        };
      } else if (existingJob.status === 'processing' || existingJob.status === 'pending') {
        // Return existing job ID for polling
        console.log(`🔄 Found in-progress job: ${existingJob.job_id}`);
        return {
          statusCode: 200,
          headers: { ...headers, ...rateLimit.headers },
          body: JSON.stringify({
            jobId: existingJob.job_id,
            status: existingJob.status,
            rateLimit: {
              used: rateLimit.used,
              total: rateLimit.total,
              remaining: rateLimit.remaining,
              isDeveloperMode: rateLimit.isDeveloperMode || false
            }
          }),
        };
      }
    }

    // Create new job
    const jobId = generateJobId();
    const clientIp = event.headers['x-forwarded-for'] || event.headers['x-nf-client-connection-ip'] || 'unknown';

    const { error: insertError } = await supabase
      .from('cv_jobs')
      .insert({
        job_id: jobId,
        status: 'pending',
        cv_hash: cvHash,
        job_description_hash: jobDescHash,
        language: language,
        client_ip: clientIp,
        rate_limit_info: {
          used: rateLimit.used,
          total: rateLimit.total,
          isDeveloperMode: rateLimit.isDeveloperMode || false
        }
      });

    if (insertError) {
      console.error('❌ Failed to create job:', insertError);
      throw new Error('Failed to create background job');
    }

    console.log(`✅ Job created: ${jobId}`);

    // Trigger background processing by calling process-cv-job function
    // This is a fire-and-forget call
    try {
      const processUrl = `${process.env.URL}/.netlify/functions/process-cv-job`;

      // Don't await this - let it process in background
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Job-ID': jobId,
        },
        body: JSON.stringify({
          jobId,
          cvText,
          jobDescription,
          language
        })
      }).catch(err => {
        console.error('Failed to trigger background processor:', err);
      });

      console.log(`🔄 Background processor triggered for ${jobId}`);
    } catch (triggerError) {
      console.error('Failed to trigger processor:', triggerError);
      // Continue anyway - the job is in the database
    }

    // Return immediately with job ID
    const processingTime = Date.now() - startTime;
    console.log(`⚡ Job submitted in ${processingTime}ms`);

    return {
      statusCode: 200,
      headers: { ...headers, ...rateLimit.headers },
      body: JSON.stringify({
        jobId,
        status: 'pending',
        message: 'Your CV is being analyzed. This usually takes 30-40 seconds.',
        rateLimit: {
          used: rateLimit.used,
          total: rateLimit.total,
          remaining: rateLimit.remaining,
          isDeveloperMode: rateLimit.isDeveloperMode || false
        }
      }),
    };

  } catch (error) {
    console.error('❌ Job submission error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to submit job',
        message: error.message
      }),
    };
  }
};

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get job ID from query parameters
    const jobId = event.queryStringParameters?.jobId;

    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing jobId parameter' }),
      };
    }

    console.log(`📊 Checking status for job: ${jobId}`);

    // Query job status
    const { data, error } = await supabase
      .from('cv_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !data) {
      console.error('❌ Job not found:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' }),
      };
    }

    console.log(`📋 Job status: ${data.status}`);

    // Prepare response based on status
    const response = {
      jobId: data.job_id,
      status: data.status,
      createdAt: data.created_at,
    };

    if (data.status === 'completed') {
      response.result = data.result;
      response.processingTime = data.processing_time_ms;
      response.rateLimit = data.rate_limit_info;
      console.log(`✅ Job completed, returning result (${JSON.stringify(response.result).length} chars)`);
    } else if (data.status === 'failed') {
      response.error = data.error_message;
      console.log(`❌ Job failed: ${data.error_message}`);
    } else if (data.status === 'processing') {
      const elapsedMs = Date.now() - new Date(data.started_at).getTime();
      response.elapsedSeconds = Math.round(elapsedMs / 1000);
      response.estimatedTotalSeconds = 35; // Typical processing time
      console.log(`⏳ Job still processing (${response.elapsedSeconds}s elapsed)`);
    } else if (data.status === 'pending') {
      console.log(`⏳ Job pending`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('❌ Status check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check job status',
        message: error.message
      }),
    };
  }
};

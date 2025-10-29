// netlify/functions/cache-helper.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Generate cache key from CV text and job description
 */
function generateCacheKey(cvText, jobDescription, language = 'en') {
  const combined = `${cvText}|${jobDescription}|${language}`.toLowerCase().trim();
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Generate hash for individual text (for indexing)
 */
function generateHash(text) {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

/**
 * Check if result is cached
 */
async function checkCache(cvText, jobDescription, language = 'en') {
  try {
    const cacheKey = generateCacheKey(cvText, jobDescription, language);

    console.log('🔍 Checking cache for key:', cacheKey.substring(0, 16) + '...');

    const { data, error } = await supabase
      .from('ai_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - cache miss
        console.log('❌ Cache miss');
        return null;
      }
      console.error('❌ Cache check error:', error);
      return null;
    }

    if (data) {
      // Check if cache entry has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.log('⏰ Cache entry expired, treating as cache miss');
        // Optionally delete expired entry
        await supabase
          .from('ai_cache')
          .delete()
          .eq('id', data.id);
        return null;
      }

      // Update hit count, last accessed, and extend expiration
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30); // Extend by 30 days

      await supabase
        .from('ai_cache')
        .update({
          hit_count: data.hit_count + 1,
          last_accessed_at: new Date().toISOString(),
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', data.id);

      console.log('✅ Cache HIT! (hits:', data.hit_count + 1, ')');

      return {
        improvedCV: data.improved_cv,
        coverLetter: data.cover_letter,
        recruiterTips: data.recruiter_tips,
        changesOverview: data.changes_overview,
        metadata: {
          cached: true,
          hitCount: data.hit_count + 1,
          cachedAt: data.created_at,
          expiresAt: newExpiresAt.toISOString(),
          language: data.language
        }
      };
    }

    console.log('❌ Cache miss');
    return null;

  } catch (error) {
    console.error('❌ Cache check failed:', error);
    return null; // Fail gracefully - continue without cache
  }
}

/**
 * Save result to cache
 */
async function saveToCache(cvText, jobDescription, language, result) {
  try {
    const cacheKey = generateCacheKey(cvText, jobDescription, language);
    const cvHash = generateHash(cvText);
    const jobHash = generateHash(jobDescription);

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    console.log('💾 Saving to cache:', cacheKey.substring(0, 16) + '...');

    const { data, error } = await supabase
      .from('ai_cache')
      .insert({
        cache_key: cacheKey,
        cv_text_hash: cvHash,
        job_description_hash: jobHash,
        language: language,
        improved_cv: result.improvedCV,
        cover_letter: result.coverLetter,
        recruiter_tips: result.recruiterTips,
        changes_overview: result.changesOverview,
        hit_count: 1,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });
    
    if (error) {
      // Duplicate key is OK - means it was cached while we were processing
      if (error.code === '23505') {
        console.log('⚠️ Already cached by another request');
        return true;
      }
      console.error('❌ Cache save error:', error);
      return false;
    }
    
    console.log('✅ Saved to cache successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Cache save failed:', error);
    return false; // Fail gracefully - response still works
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const { data, error } = await supabase
      .rpc('get_cache_stats');
    
    if (error) {
      console.error('❌ Failed to get cache stats:', error);
      return null;
    }
    
    return data[0];
    
  } catch (error) {
    console.error('❌ Cache stats error:', error);
    return null;
  }
}

module.exports = {
  checkCache,
  saveToCache,
  getCacheStats,
  generateCacheKey,
  generateHash
};
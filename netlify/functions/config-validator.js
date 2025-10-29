// netlify/functions/config-validator.js

/**
 * Validates that all required environment variables are set
 * Call this at the start of your functions to ensure configuration is correct
 */

const REQUIRED_ENV_VARS = {
  // AI Configuration
  GEMINI_API_KEY: {
    required: true,
    description: 'Google Gemini API key for AI processing',
    pattern: /^[A-Za-z0-9_-]+$/,
    minLength: 20
  },

  // Database Configuration
  SUPABASE_URL: {
    required: true,
    description: 'Supabase project URL',
    pattern: /^https:\/\/[a-z0-9-]+\.supabase\.co$/,
    example: 'https://your-project.supabase.co'
  },
  SUPABASE_SERVICE_KEY: {
    required: true,
    description: 'Supabase service role key (not anon key!)',
    pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    minLength: 100
  },

  // Payment Configuration (optional for free tier)
  STRIPE_SECRET_KEY: {
    required: false,
    description: 'Stripe secret key for payments',
    pattern: /^sk_(test|live)_[A-Za-z0-9]+$/
  },

  // Netlify Auto-provided (should always exist)
  URL: {
    required: false,
    description: 'Netlify site URL (auto-provided)',
    pattern: /^https?:\/\/.+$/
  }
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(name, config) {
  const value = process.env[name];
  const errors = [];
  const warnings = [];

  // Check if required
  if (config.required && !value) {
    errors.push(`Missing required environment variable: ${name}`);
    errors.push(`  Description: ${config.description}`);
    if (config.example) {
      errors.push(`  Example: ${config.example}`);
    }
    return { valid: false, errors, warnings };
  }

  // Skip further validation if not set and not required
  if (!value) {
    if (!config.required) {
      warnings.push(`Optional environment variable not set: ${name}`);
    }
    return { valid: true, errors, warnings };
  }

  // Check pattern
  if (config.pattern && !config.pattern.test(value)) {
    errors.push(`Invalid format for ${name}`);
    errors.push(`  Expected pattern: ${config.pattern}`);
    if (config.example) {
      errors.push(`  Example: ${config.example}`);
    }
  }

  // Check minimum length
  if (config.minLength && value.length < config.minLength) {
    errors.push(`${name} is too short (min ${config.minLength} chars, got ${value.length})`);
  }

  // Warn about test keys in production
  if (name.includes('STRIPE') && value.includes('_test_') && process.env.CONTEXT === 'production') {
    warnings.push(`Using test Stripe key in production for ${name}`);
  }

  const valid = errors.length === 0;
  return { valid, errors, warnings };
}

/**
 * Validate all environment variables
 */
function validateConfig() {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    missing: [],
    configured: []
  };

  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const result = validateEnvVar(name, config);

    if (!result.valid) {
      results.valid = false;
      results.errors.push(...result.errors);
      if (config.required) {
        results.missing.push(name);
      }
    } else {
      if (process.env[name]) {
        results.configured.push(name);
      }
    }

    results.warnings.push(...result.warnings);
  }

  return results;
}

/**
 * Log validation results
 */
function logValidationResults(results) {
  if (results.valid) {
    console.log('✅ All required environment variables are configured');
    console.log(`📋 Configured: ${results.configured.join(', ')}`);
  } else {
    console.error('❌ Environment configuration is invalid!');
    console.error('\nErrors:');
    results.errors.forEach(err => console.error(`  ${err}`));
  }

  if (results.warnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    results.warnings.forEach(warn => console.warn(`  ${warn}`));
  }

  if (results.missing.length > 0) {
    console.error('\n📝 Missing required variables:');
    results.missing.forEach(name => {
      console.error(`  - ${name}: ${REQUIRED_ENV_VARS[name].description}`);
    });
    console.error('\nSet these in Netlify: Site settings → Environment variables');
  }
}

/**
 * Throw error if configuration is invalid
 */
function requireValidConfig() {
  const results = validateConfig();
  logValidationResults(results);

  if (!results.valid) {
    throw new Error('Invalid environment configuration. Check logs for details.');
  }

  return results;
}

/**
 * Get configuration status as HTTP response
 */
function getConfigStatusResponse() {
  const results = validateConfig();

  return {
    statusCode: results.valid ? 200 : 500,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valid: results.valid,
      configured: results.configured,
      missing: results.missing,
      errors: results.errors,
      warnings: results.warnings,
      timestamp: new Date().toISOString()
    })
  };
}

module.exports = {
  validateConfig,
  validateEnvVar,
  requireValidConfig,
  logValidationResults,
  getConfigStatusResponse,
  REQUIRED_ENV_VARS
};

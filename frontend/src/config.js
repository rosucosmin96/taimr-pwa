/**
 * Frontend configuration loaded from environment variables
 */

const config = {
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },

  // Application Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Freelancer PWA',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    debug: import.meta.env.VITE_DEBUG === 'true',
  },

  // API Configuration
  api: {
    url: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  },
};

/**
 * Validate required environment variables
 */
function validateConfig() {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Validate configuration on import
if (import.meta.env.PROD) {
  validateConfig();
}

export default config;

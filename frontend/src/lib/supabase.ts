import { createClient } from '@supabase/supabase-js';

// Supabase credentials - disabled for WebSocket-only chat implementation
// Using custom WebSocket service instead of Supabase real-time
const supabaseUrl = 'https://disabled.supabase.co';
const supabaseAnonKey = 'disabled-key';

// Note: Supabase real-time is disabled - using custom WebSocket service for chat
// The backend uses Supabase for data storage but WebSocket + Redis for real-time features
console.log('🔍 Supabase real-time disabled - using WebSocket service for chat');

console.log('🔍 Supabase Environment Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseAnonKey?.length || 0,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : 'MISSING',
  fullUrl: supabaseUrl,
  keyStart: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
});

// Validate hardcoded credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing hardcoded Supabase credentials');
  throw new Error('Missing required Supabase credentials');
}

console.log('✅ Supabase credentials loaded successfully');

/**
 * Supabase client for frontend
 * Uses anon key for public access with RLS policies
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
  },
  global: {
    headers: {
      'X-Client-Info': 'go3net-chat-client',
    },
  },
});

/**
 * Health check for Supabase connection
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('group_chats').select('count', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    console.info('✅ Supabase connected');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

/**
 * Initialize realtime subscriptions after auth
 */
export async function initializeRealtimeSubscriptions(): Promise<void> {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      console.warn('⚠️  No active session, realtime subscriptions require authentication');
      return;
    }

    console.info('✅ Realtime subscriptions initialized for authenticated user');
  } catch (error) {
    console.error('❌ Failed to initialize realtime subscriptions:', error);
  }
}

/**
 * Diagnostic function to check Supabase configuration
 * Call this from browser console: window.checkSupabaseConfig()
 */
export function checkSupabaseConfig() {
  const config = {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
    urlValid: !!(import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project')),
    keyValid: !!(import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.length > 100),
    allEnvVars: Object.keys(import.meta.env).filter(key => key.includes('SUPABASE'))
  };

  console.log('🔍 Supabase Configuration Check:', config);

  if (!config.urlValid || !config.keyValid) {
    console.error('❌ Configuration issues detected:');
    if (!config.urlValid) console.error('   - URL is missing or contains placeholder value');
    if (!config.keyValid) console.error('   - Anon key is missing or too short (should be ~110+ characters)');
    console.error('🔧 Fix: Update frontend/.env with real Supabase credentials and restart dev server');
  } else {
    console.log('✅ Supabase configuration looks good!');
  }

  return config;
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).checkSupabaseConfig = checkSupabaseConfig;
}

export default supabase;
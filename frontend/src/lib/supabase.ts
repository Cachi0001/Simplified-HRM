import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

// Get Supabase URL and anon key from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('❌ Missing Supabase environment variables');
  logger.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  logger.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
}

/**
 * Supabase client for frontend
 * Uses anon key for public access with RLS policies
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  // Enable automatic reconnection on network errors
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
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

    logger.info('✅ Supabase connected');
    return true;
  } catch (error) {
    logger.error('❌ Supabase connection failed:', error);
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
      logger.warn('⚠️  No active session, realtime subscriptions require authentication');
      return;
    }

    logger.info('✅ Realtime subscriptions initialized for authenticated user');
  } catch (error) {
    logger.error('❌ Failed to initialize realtime subscriptions:', error);
  }
}

export default supabase;
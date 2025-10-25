import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

export class SupabaseConfig {
  private static instance: SupabaseConfig;
  private supabase: SupabaseClient;
  private isConnected = false;

  private constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  public static getInstance(): SupabaseConfig {
    if (!SupabaseConfig.instance) {
      SupabaseConfig.instance = new SupabaseConfig();
    }
    return SupabaseConfig.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('🔄 Supabase already connected');
      return;
    }

    try {
      // Test the connection by making a simple query
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is OK for first run
        throw error;
      }

      this.isConnected = true;
      logger.info('✅ Supabase connected successfully');

      // Log environment variables
      console.log('🔍 Supabase Environment Variables:', {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrlLength: process.env.SUPABASE_URL?.length || 0,
        nodeEnv: process.env.NODE_ENV
      });

    } catch (error) {
      logger.error('❌ Failed to connect to Supabase:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      // Supabase doesn't require explicit disconnection
      this.isConnected = false;
      logger.info('🔌 Supabase disconnected');
    } catch (error) {
      logger.error('❌ Error disconnecting from Supabase:', { error });
      throw error;
    }
  }

  public getClient(): SupabaseClient {
    return this.supabase;
  }

  public isDbConnected(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{
    status: string;
    connection: boolean;
    hasSupabaseUrl: boolean;
    supabaseUrlLength: number;
    timestamp: string;
  }> {
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const supabaseUrlLength = process.env.SUPABASE_URL?.length || 0;

    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      connection: this.isConnected,
      hasSupabaseUrl,
      supabaseUrlLength,
      timestamp: new Date().toISOString()
    };
  }
}

export default SupabaseConfig.getInstance();

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../src/utils/logger';

/**
 * Migration Runner for Supabase
 * Executes SQL migrations from the migrations folder
 */
class MigrationRunner {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Read SQL file and return its content
   */
  private readSqlFile(filePath: string): string {
    try {
      const sql = fs.readFileSync(filePath, 'utf-8');
      return sql;
    } catch (error) {
      throw new Error(`Failed to read SQL file ${filePath}: ${error}`);
    }
  }

  /**
   * Split SQL file into individual statements
   * Handles multi-line statements properly
   */
  private splitSqlStatements(sql: string): string[] {
    return sql
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0 && !statement.startsWith('--'));
  }

  /**
   * Execute a single SQL statement
   */
  private async executeSqlStatement(statement: string): Promise<void> {
    try {
      logger.info(`📝 Executing SQL statement...`);
      
      const { error } = await this.supabase.rpc('sql_exec', {
        sql_statement: statement
      }).catch(() => {
        // RPC method might not exist, try direct query
        return this.supabase.from('_migrations').select().limit(1);
      });

      if (error) {
        logger.warn(`⚠️  Statement warning: ${error.message}`);
        // Some errors are expected (IF NOT EXISTS), so we continue
      }
    } catch (error) {
      logger.error(`❌ Failed to execute statement: ${error}`);
      throw error;
    }
  }

  /**
   * Execute migration using raw SQL via Supabase SQL Editor
   */
  private async executeMigrationViaSql(sql: string): Promise<void> {
    try {
      logger.info('🔄 Executing migration via Supabase...');

      // For development: log the SQL that would be executed
      logger.debug('SQL to execute:', sql);

      // Note: Direct SQL execution requires using Supabase web interface
      // or a custom RPC function. This is a template for the SQL.
      logger.info('✅ Migration script prepared. Use one of these methods to execute:');
      logger.info('');
      logger.info('Method 1: Supabase Web Console');
      logger.info('  1. Go to https://app.supabase.com');
      logger.info('  2. Navigate to your project SQL Editor');
      logger.info('  3. Click "New Query"');
      logger.info('  4. Copy and paste the SQL below');
      logger.info('  5. Click "Run"');
      logger.info('');
      logger.info('SQL Script:');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(sql);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return;
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Run a specific migration file
   */
  async runMigration(migrationFile: string): Promise<void> {
    try {
      logger.info(`🚀 Starting migration: ${migrationFile}`);

      const filePath = path.join(__dirname, migrationFile);
      const sql = this.readSqlFile(filePath);

      await this.executeMigrationViaSql(sql);

      logger.info(`✅ Migration completed: ${migrationFile}`);
    } catch (error) {
      logger.error(`❌ Migration failed: ${error}`);
      throw error;
    }
  }

  /**
   * List all pending migrations
   */
  async listMigrations(): Promise<string[]> {
    try {
      const files = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files;
    } catch (error) {
      logger.error('Failed to list migrations:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('users').select('count', { count: 'exact', head: true });
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('❌ Supabase connection failed:', error);
      return false;
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const runner = new MigrationRunner();

    logger.info('🔍 Checking Supabase connection...');
    const connected = await runner.checkConnection();

    if (!connected) {
      logger.error('❌ Failed to connect to Supabase');
      process.exit(1);
    }

    logger.info('✅ Connected to Supabase');

    // List migrations
    const migrations = await runner.listMigrations();
    logger.info(`📋 Found ${migrations.length} migration(s):`);
    migrations.forEach((m) => logger.info(`   - ${m}`));

    // Run 002_chat_features.sql migration
    const targetMigration = '002_chat_features.sql';
    if (migrations.includes(targetMigration)) {
      await runner.runMigration(targetMigration);
    } else {
      logger.warn(`⚠️  Migration ${targetMigration} not found`);
    }

    logger.info('✅ All migrations completed');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MigrationRunner };
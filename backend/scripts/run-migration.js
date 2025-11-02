const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', '..', 'database', 'migrations', '023_system_enhancements_comprehensive.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running migration: 023_system_enhancements_comprehensive.sql');

    // Execute the migration
    await client.query(migrationSQL);
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
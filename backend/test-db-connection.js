// Quick database connection test script
// Run with: node test-db-connection.js

require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...\n');

// Test 1: Basic connection
const pool1 = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('📋 Connection Details:');
console.log('- Host:', process.env.DATABASE_URL?.match(/@([^:]+):/)?.[1] || 'unknown');
console.log('- Database:', process.env.DATABASE_URL?.match(/\/([^?]+)/)?.[1] || 'unknown');
console.log('\n');

async function testConnection() {
  try {
    console.log('⏳ Attempting connection...');
    const client = await pool1.connect();
    console.log('✅ Connection successful!');
    
    const result = await client.query('SELECT NOW(), version()');
    console.log('\n📊 Database Info:');
    console.log('- Time:', result.rows[0].now);
    console.log('- Version:', result.rows[0].version.split('\n')[0]);
    
    client.release();
    await pool1.end();
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Database is paused (check Supabase dashboard)');
    console.error('2. Network/firewall blocking connection');
    console.error('3. Invalid credentials');
    console.error('4. IPv6 connection issues');
    
    await pool1.end();
    process.exit(1);
  }
}

testConnection();

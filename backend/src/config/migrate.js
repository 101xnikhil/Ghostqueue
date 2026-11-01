const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...');
    const sqlPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;

require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : { user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT };
const pool = new Pool(poolConfig);

async function migrate() {
  try {
    const client = await pool.connect();
    console.log('Connected to DB');
    await client.query('BEGIN');
    
    // Check if column exists in sales
    let check = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='sales' AND column_name='branch'");
    if (check.rows.length === 0) {
      await client.query("ALTER TABLE sales ADD COLUMN branch VARCHAR(100) NOT NULL DEFAULT 'Golden Handi (G.H)'");
      console.log('Added branch to sales');
    }

    // Check if column exists in expenses
    check = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='expenses' AND column_name='branch'");
    if (check.rows.length === 0) {
      await client.query("ALTER TABLE expenses ADD COLUMN branch VARCHAR(100) NOT NULL DEFAULT 'Golden Handi (G.H)'");
      console.log('Added branch to expenses');
    }

    // Check if column exists in purchases
    check = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='purchases' AND column_name='branch'");
    if (check.rows.length === 0) {
      await client.query("ALTER TABLE purchases ADD COLUMN branch VARCHAR(100) NOT NULL DEFAULT 'Golden Handi (G.H)'");
      console.log('Added branch to purchases');
    }

    await client.query('COMMIT');
    console.log('Migration successful');
    client.release();
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Ravi19711426@db.memhgrycmlgfqcjrbqhg.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query("SELECT sale_date, category, sub_category, amount, branch FROM sales WHERE category = 'Online' AND branch = 'Golden Handi (G.H)' LIMIT 10;");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();

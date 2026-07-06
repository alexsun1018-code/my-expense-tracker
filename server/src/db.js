const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

// OID 1082 = DATE。預設 node-pg 會轉成本地時區的 JS Date 物件，
// 再轉回字串時可能位移一天，因此改為直接回傳原始 'YYYY-MM-DD' 字串。
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

module.exports = { pool, initDb };

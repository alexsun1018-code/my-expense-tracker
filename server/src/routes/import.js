const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { accounts = [], transactions = [] } = req.body || {};
  const client = await pool.connect();

  try {
    const existing = await client.query(
      'SELECT 1 FROM transactions WHERE user_id = $1 LIMIT 1',
      [req.userId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: '已有交易記錄，無法重複匯入' });
    }

    await client.query('BEGIN');

    for (const acc of accounts) {
      await client.query(
        `INSERT INTO accounts (id, user_id, name, type, initial_balance, color)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id, user_id) DO UPDATE SET
           name = EXCLUDED.name, type = EXCLUDED.type,
           initial_balance = EXCLUDED.initial_balance, color = EXCLUDED.color`,
        [acc.id, req.userId, acc.name, acc.type, acc.initialBalance || 0, acc.color || null]
      );
    }

    for (const t of transactions) {
      await client.query(
        `INSERT INTO transactions
          (id, user_id, date, amount, flow, category, account_id, payment_method_id, merchant, note, necessary, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id, user_id) DO NOTHING`,
        [
          t.id, req.userId, t.date, t.amount, t.flow, t.category || null,
          t.accountId, t.paymentMethod || null, t.merchant || null, t.note || null,
          t.necessary ?? null, t.createdAt || Date.now(),
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ imported: { accounts: accounts.length, transactions: transactions.length } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: '匯入失敗' });
  } finally {
    client.release();
  }
});

module.exports = router;

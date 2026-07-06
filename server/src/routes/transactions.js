const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function toApi(row) {
  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    flow: row.flow,
    category: row.category,
    accountId: row.account_id,
    paymentMethod: row.payment_method_id || undefined,
    merchant: row.merchant || '',
    note: row.note || '',
    necessary: row.necessary,
    createdAt: Number(row.created_at),
  };
}

router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date, created_at',
    [req.userId]
  );
  res.json(result.rows.map(toApi));
});

router.post('/', async (req, res) => {
  const t = req.body || {};
  if (!t.id || !t.date || t.amount == null || !t.flow || !t.accountId) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }

  try {
    await pool.query(
      `INSERT INTO transactions
        (id, user_id, date, amount, flow, category, account_id, payment_method_id, merchant, note, necessary, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        t.id, req.userId, t.date, t.amount, t.flow, t.category || null,
        t.accountId, t.paymentMethod || null, t.merchant || null, t.note || null,
        t.necessary ?? null, t.createdAt || Date.now(),
      ]
    );
    res.status(201).json(t);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: '找不到對應的帳戶' });
    console.error(err);
    res.status(500).json({ error: '新增交易失敗' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const patch = req.body || {};

  const fieldMap = {
    date: 'date', amount: 'amount', flow: 'flow', category: 'category',
    accountId: 'account_id', paymentMethod: 'payment_method_id',
    merchant: 'merchant', note: 'note', necessary: 'necessary',
  };

  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in patch) {
      values.push(patch[key] ?? null);
      sets.push(`${column} = $${values.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: '沒有可更新的欄位' });

  values.push(id, req.userId);
  try {
    const result = await pool.query(
      `UPDATE transactions SET ${sets.join(', ')} WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
      values
    );
    if (!result.rowCount) return res.status(404).json({ error: '找不到這筆交易' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: '找不到對應的帳戶' });
    console.error(err);
    res.status(500).json({ error: '更新交易失敗' });
  }
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
});

module.exports = router;

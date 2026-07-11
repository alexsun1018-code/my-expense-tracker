const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function toApi(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: Number(row.initial_balance),
    color: row.color,
    currency: row.currency,
    parentAccountId: row.parent_account_id,
  };
}

router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM accounts WHERE user_id = $1 ORDER BY id',
    [req.userId]
  );
  res.json(result.rows.map(toApi));
});

router.post('/', async (req, res) => {
  const { id, name, type, initialBalance, color, currency, parentAccountId } = req.body || {};
  if (!id || !name || !type) return res.status(400).json({ error: '缺少必要欄位' });

  try {
    await pool.query(
      'INSERT INTO accounts (id, user_id, name, type, initial_balance, color, currency, parent_account_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, req.userId, name, type, initialBalance || 0, color || null, currency || 'TWD', parentAccountId || null]
    );
    res.status(201).json({ id, name, type, initialBalance: initialBalance || 0, color, currency: currency || 'TWD', parentAccountId: parentAccountId || null });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: '帳戶已存在' });
    if (err.code === '23503') return res.status(400).json({ error: '找不到所屬銀行帳戶' });
    console.error(err);
    res.status(500).json({ error: '新增帳戶失敗' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const inUse = await pool.query(
    'SELECT 1 FROM transactions WHERE user_id = $1 AND (account_id = $2 OR payment_method_id = $2) LIMIT 1',
    [req.userId, id]
  );
  if (inUse.rows.length) {
    return res.status(409).json({ error: '此帳戶仍有交易記錄，無法刪除。請先刪除相關記錄。' });
  }

  try {
    await pool.query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: '此帳戶底下仍有信用卡／電子支付，無法刪除。請先刪除相關支出方式。' });
    console.error(err);
    res.status(500).json({ error: '刪除帳戶失敗' });
  }
});

module.exports = router;

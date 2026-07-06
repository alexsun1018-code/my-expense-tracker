const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT current_month FROM users WHERE id = $1', [req.userId]);
  res.json({ currentMonth: result.rows[0]?.current_month || null });
});

router.put('/', async (req, res) => {
  const { currentMonth } = req.body || {};
  await pool.query('UPDATE users SET current_month = $1 WHERE id = $2', [currentMonth || null, req.userId]);
  res.json({ currentMonth: currentMonth || null });
});

module.exports = router;

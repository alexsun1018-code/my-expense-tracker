const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { DEFAULT_ACCOUNTS } = require('../defaultAccounts');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function thisMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: '請輸入 email，密碼至少 6 碼' });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: '此 email 已註冊' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, current_month) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, thisMonthStr()]
    );
    const userId = userResult.rows[0].id;

    for (const acc of DEFAULT_ACCOUNTS) {
      await client.query(
        'INSERT INTO accounts (id, user_id, name, type, initial_balance, color) VALUES ($1,$2,$3,$4,$5,$6)',
        [acc.id, userId, acc.name, acc.type, acc.initialBalance, acc.color]
      );
    }
    await client.query('COMMIT');

    res.json({ token: issueToken(userId), user: { id: userId, email } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: '註冊失敗' });
  } finally {
    client.release();
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '請輸入 email 和密碼' });

  try {
    const result = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'email 或密碼錯誤' });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'email 或密碼錯誤' });

    res.json({ token: issueToken(user.id), user: { id: user.id, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '登入失敗' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.userId]);
  if (!result.rows.length) return res.status(404).json({ error: '找不到使用者' });
  res.json(result.rows[0]);
});

module.exports = router;

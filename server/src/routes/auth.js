const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { DEFAULT_ACCOUNTS } = require('../defaultAccounts');
const { sendPasswordResetEmail } = require('../email');

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

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
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

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: '請輸入 email' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length) {
      const userId = result.rows[0].id;
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 30 * 60 * 1000);
      await pool.query(
        'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
        [hashToken(rawToken), expires, userId]
      );
      const appUrl = process.env.APP_URL || 'https://alexsun1018-code.github.io/my-expense-tracker';
      try {
        await sendPasswordResetEmail(email, `${appUrl}?reset_token=${rawToken}`);
      } catch (mailErr) {
        // 寄信失敗只記錄在伺服器端，不讓客戶端察覺帳號是否存在或寄信是否成功
        console.error('寄送重設密碼信件失敗:', mailErr);
      }
    }
  } catch (err) {
    console.error(err);
  }
  // 無論帳號是否存在、寄信是否成功，一律回覆同樣的訊息，避免被用來探測已註冊的 email
  res.json({ message: '如果此信箱已註冊，重設信件已寄出' });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || password.length < 6) {
    return res.status(400).json({ error: '請輸入新密碼，至少 6 碼' });
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token_hash = $1 AND reset_token_expires > now()',
      [hashToken(token)]
    );
    if (!result.rows.length) {
      return res.status(400).json({ error: '連結無效或已過期，請重新申請' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, result.rows[0].id]
    );
    res.json({ message: '密碼已重設' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '重設失敗，請稍後再試' });
  }
});

router.delete('/me', authLimiter, requireAuth, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: '請輸入密碼以確認刪除帳號' });

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: '找不到使用者' });

    const ok = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: '密碼錯誤' });

    await pool.query('DELETE FROM users WHERE id = $1', [req.userId]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '刪除帳號失敗' });
  }
});

module.exports = router;

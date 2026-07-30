const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

function genId(prefix) {
  return `${prefix}-${uuidv4().slice(0, 6).toUpperCase()}`;
}

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, area } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const id = genId('U');
    await pool.query(
      'INSERT INTO users (id, name, email, phone, password_hash, role, area) VALUES (?,?,?,?,?,?,?)',
      [id, name, email, phone || null, hash, 'citizen', area || null]
    );
    await pool.query(
      'INSERT INTO notifications (id, user_id, text, type) VALUES (?,?,?,?)',
      [genId('N'), id, `Welcome ${name}! Your citizen account is ready.`, 'info']
    );
    res.status(201).json({ message: 'Registration successful.', userId: id });
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
        message: "Server error during registration.",
        error: err.message,
        sql: err.sqlMessage || null
    });
}
});

/* POST /api/auth/login  { email, password, role } */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password.' });
    const user = rows[0];
    if (role && user.role !== role) return res.status(403).json({ message: `This account is not registered as ${role}.` });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
    delete user.password_hash;
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
  
});

/* POST /api/auth/forgot-password  { email }  -> generates OTP */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ message: 'No account found with that email.' });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query('INSERT INTO password_resets (user_id, otp_code, expires_at) VALUES (?,?,?)', [rows[0].id, otp, expires]);

    // In production, send via nodemailer/SMS gateway instead of returning it.
    res.json({ message: 'OTP generated.', otp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

/* POST /api/auth/reset-password { email, otp, newPassword } */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(404).json({ message: 'Account not found.' });
    const userId = users[0].id;

    const [resets] = await pool.query(
      'SELECT * FROM password_resets WHERE user_id=? AND otp_code=? AND used=0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [userId, otp]
    );
    if (!resets.length) return res.status(400).json({ message: 'Invalid or expired code.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, userId]);
    await pool.query('UPDATE password_resets SET used=1 WHERE id=?', [resets[0].id]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

/* GET /api/auth/me */
router.get('/me', verifyToken, async (req, res) => {
  const [rows] = await pool.query('SELECT id,name,email,phone,role,area,avatar_url,created_at FROM users WHERE id=?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'User not found.' });
  res.json(rows[0]);
});

/* PUT /api/auth/profile  { name, phone, area, password } */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, area, password } = req.body;
    const fields = [], values = [];
    if (name) { fields.push('name=?'); values.push(name); }
    if (phone) { fields.push('phone=?'); values.push(phone); }
    if (area !== undefined) { fields.push('area=?'); values.push(area); }
    if (password) { fields.push('password_hash=?'); values.push(await bcrypt.hash(password, 10)); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update.' });
    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, values);
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;


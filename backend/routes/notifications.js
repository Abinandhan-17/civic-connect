const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

/* GET /api/notifications */
router.get('/', verifyToken, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json(rows);
});

/* PATCH /api/notifications/read-all */
router.patch('/read-all', verifyToken, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;

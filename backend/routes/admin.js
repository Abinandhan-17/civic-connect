const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/* GET /api/admin/departments */
router.get('/departments', verifyToken, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM departments');
  res.json(rows);
});

/* GET /api/admin/analytics — aggregated data for charts */
router.get('/analytics', verifyToken, requireAdmin, async (req, res) => {
  const [byStatus] = await pool.query('SELECT status, COUNT(*) count FROM complaints GROUP BY status');
  const [byCategory] = await pool.query(
    `SELECT cat.label, COUNT(*) count FROM complaints c JOIN categories cat ON cat.id=c.category_id GROUP BY cat.label`
  );
  const [byMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') month, COUNT(*) count FROM complaints
     WHERE created_at > (NOW() - INTERVAL 6 MONTH) GROUP BY month ORDER BY month`
  );
  const [byArea] = await pool.query('SELECT area, COUNT(*) count FROM complaints GROUP BY area ORDER BY count DESC LIMIT 8');
  const [[avgResolution]] = await pool.query(
    `SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) avgHours FROM complaints WHERE status='Resolved'`
  );
  const [[userCount]] = await pool.query(`SELECT COUNT(*) count FROM users WHERE role='citizen'`);
  res.json({ byStatus, byCategory, byMonth, byArea, avgResolutionHours: avgResolution.avgHours, totalUsers: userCount.count });
});

/* GET /api/admin/report.csv — export */
router.get('/report.csv', verifyToken, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, u.name AS citizen, c.title, cat.label AS category, c.severity, d.name AS department,
            c.status, c.area, c.created_at, c.updated_at
     FROM complaints c
     JOIN users u ON u.id=c.user_id
     JOIN categories cat ON cat.id=c.category_id
     LEFT JOIN departments d ON d.id=c.department_id
     ORDER BY c.created_at DESC`
  );
  const headers = Object.keys(rows[0] || { id: '', citizen: '', title: '', category: '', severity: '', department: '', status: '', area: '', created_at: '', updated_at: '' });
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="civic-connect-report-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = router;

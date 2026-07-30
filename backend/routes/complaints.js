const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

function genId(prefix) { return `${prefix}-${uuidv4().slice(0, 6).toUpperCase()}`; }

const STATUS_MESSAGES = {
  Verified: id => `Your complaint ${id} has been verified by our team.`,
  Assigned: id => `Complaint ${id} has been assigned to the relevant department.`,
  'In Progress': id => `Work has started on your complaint ${id}.`,
  Resolved: id => `Great news! Your complaint ${id} has been resolved.`
};

/* Haversine distance in meters */
function distMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* GET /api/complaints  (admin: all, with filters | citizen: own only) */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, category, department, q } = req.query;
    let sql = `SELECT c.*, u.name AS user_name FROM complaints c JOIN users u ON u.id=c.user_id WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') { sql += ' AND c.user_id=?'; params.push(req.user.id); }
    if (status) { sql += ' AND c.status=?'; params.push(status); }
    if (category) { sql += ' AND c.category_id=?'; params.push(category); }
    if (department) { sql += ' AND c.department_id=(SELECT id FROM departments WHERE name=?)'; params.push(department); }
    if (q) { sql += ' AND (c.id LIKE ? OR c.title LIKE ? OR u.name LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    sql += ' ORDER BY c.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }); }
});

/* GET /api/complaints/:id */
router.get('/:id', verifyToken, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM complaints WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Complaint not found.' });
  const [history] = await pool.query('SELECT * FROM complaint_history WHERE complaint_id=? ORDER BY created_at ASC', [req.params.id]);
  res.json({ ...rows[0], history });
});

/* POST /api/complaints  (multipart: photo, voice_note) */
router.post('/', verifyToken, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'voice_note', maxCount: 1 }]), async (req, res) => {
  try {
    const { category, title, description, severity, area, latitude, longitude } = req.body;
    const [cats] = await pool.query('SELECT * FROM categories WHERE id=?', [category]);
    if (!cats.length) return res.status(400).json({ message: 'Invalid category.' });

    // duplicate detection: same category, unresolved, within 150m, filed in last 72h
    const [candidates] = await pool.query(
      `SELECT id, latitude, longitude FROM complaints WHERE category_id=? AND status<>'Resolved' AND created_at > (NOW() - INTERVAL 72 HOUR)`,
      [category]
    );
    const duplicates = candidates.filter(c => distMeters(+latitude, +longitude, +c.latitude, +c.longitude) < 150).map(c => c.id);

    const id = genId('CC');
    const photoUrl = req.files?.photo?.[0] ? `/uploads/${req.files.photo[0].filename}` : null;
    const voiceUrl = req.files?.voice_note?.[0] ? `/uploads/${req.files.voice_note[0].filename}` : null;

    await pool.query(
      `INSERT INTO complaints (id,user_id,category_id,title,description,severity,status,department_id,area,latitude,longitude,photo_url,voice_note_url,is_duplicate_of)
       VALUES (?,?,?,?,?,?,'Pending',?,?,?,?,?,?,?)`,
      [id, req.user.id, category, title, description, severity || 'Medium', cats[0].department_id, area, latitude, longitude, photoUrl, voiceUrl, duplicates[0] || null]
    );
    await pool.query('INSERT INTO complaint_history (complaint_id, status, changed_by) VALUES (?,?,?)', [id, 'Pending', req.user.id]);
    await pool.query('INSERT INTO notifications (id,user_id,text,type) VALUES (?,?,?,?)', [
      genId('N'), req.user.id, `Complaint ${id} submitted successfully. Our team will verify it shortly.`, 'success'
    ]);

    res.status(201).json({ id, duplicatesFound: duplicates });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error while creating complaint.' }); }
});

/* PATCH /api/complaints/:id/status  (admin only) { status, department, remark } */
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
    const { status, department, remark } = req.body;
    const [rows] = await pool.query('SELECT * FROM complaints WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Complaint not found.' });

    const updates = ['status=?'], params = [status];
    if (department) {
      const [d] = await pool.query('SELECT id FROM departments WHERE name=?', [department]);
      if (d.length) { updates.push('department_id=?'); params.push(d[0].id); }
    }
    params.push(req.params.id);
    await pool.query(`UPDATE complaints SET ${updates.join(', ')} WHERE id=?`, params);
    await pool.query('INSERT INTO complaint_history (complaint_id, status, changed_by, remark) VALUES (?,?,?,?)', [req.params.id, status, req.user.id, remark || null]);

    if (STATUS_MESSAGES[status]) {
      await pool.query('INSERT INTO notifications (id,user_id,text,type) VALUES (?,?,?,?)', [
        genId('N'), rows[0].user_id, STATUS_MESSAGES[status](req.params.id), status === 'Resolved' ? 'success' : 'info'
      ]);
    }
    res.json({ message: 'Complaint updated.' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }); }
});

/* POST /api/complaints/:id/completion-photo  (admin, multipart) */
router.post('/:id/completion-photo', verifyToken, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  const url = `/uploads/${req.file.filename}`;
  await pool.query('UPDATE complaints SET completion_photo_url=? WHERE id=?', [url, req.params.id]);
  res.json({ url });
});

/* POST /api/complaints/:id/rating  { rating, feedback } */
router.post('/:id/rating', verifyToken, async (req, res) => {
  const { rating, feedback } = req.body;
  await pool.query('UPDATE complaints SET rating=?, feedback=? WHERE id=? AND user_id=?', [rating, feedback || null, req.params.id, req.user.id]);
  res.json({ message: 'Feedback submitted.' });
});

/* DELETE /api/complaints/:id  (admin only — fake/duplicate cleanup) */
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  await pool.query('DELETE FROM complaints WHERE id=?', [req.params.id]);
  res.json({ message: 'Complaint deleted.' });
});

/* GET /api/complaints/stats/summary */
router.get('/stats/summary', verifyToken, async (req, res) => {
  const scope = req.user.role === 'admin' ? '' : 'WHERE user_id=?';
  const params = req.user.role === 'admin' ? [] : [req.user.id];
  const [[row]] = await pool.query(
    `SELECT COUNT(*) total,
     SUM(status='Pending') pending,
     SUM(status IN ('Verified','Assigned','In Progress')) inProgress,
     SUM(status='Resolved') resolved
     FROM complaints ${scope}`, params);
  res.json(row);
});

module.exports = router;

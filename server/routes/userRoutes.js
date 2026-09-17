const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');

// GET /api/users - Get all users
router.get('/', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.birth_date, u.degree,
           u.position, u.gender, u.department_id, u.phone, u.zalo_phone,
           u.role, u.is_active, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.id ASC
  `).all();

  res.json(users);
});

// GET /api/departments - Get all 4 departments
router.get('/departments', authMiddleware, (req, res) => {
  const departments = db.prepare(`
    SELECT d.*, count(u.id) as member_count
    FROM departments d
    LEFT JOIN users u ON d.id = u.department_id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  res.json(departments);
});

// POST /api/users/reset-password - Admin reset password for a user
router.post('/reset-password', authMiddleware, adminOnly, (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'Thiếu thông tin người dùng hoặc mật khẩu mới.' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);

  res.json({ message: 'Đặt lại mật khẩu thành công!' });
});

module.exports = router;

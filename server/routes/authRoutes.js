const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authMiddleware } = require('../auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  const user = db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.username = ?
  `).get(username.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Tài khoản không tồn tại trên hệ thống.' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ error: 'Tài khoản này hiện đang bị tạm khóa.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Mật khẩu không chính xác.' });
  }

  const token = generateToken(user);

  // Exclude password_hash
  delete user.password_hash;

  return res.json({
    message: 'Đăng nhập thành công!',
    token,
    user
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.birth_date, u.degree,
           u.position, u.gender, u.department_id, u.phone, u.zalo_phone,
           u.avatar, u.role, u.is_active, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
  }

  return res.json(user);
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);

  if (!isMatch) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

  return res.json({ message: 'Đổi mật khẩu thành công!' });
});

// POST /api/auth/update-profile
router.post('/update-profile', authMiddleware, (req, res) => {
  const { phone, zalo_phone } = req.body;

  db.prepare(`
    UPDATE users SET phone = ?, zalo_phone = ? WHERE id = ?
  `).run(phone || null, zalo_phone || null, req.user.id);

  return res.json({ message: 'Cập nhật thông tin thành công!' });
});

module.exports = router;

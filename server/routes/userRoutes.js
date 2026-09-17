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

// POST /api/users - Admin create new user
router.post('/', authMiddleware, adminOnly, (req, res) => {
  try {
    const {
      username, password, full_name, birth_date, degree,
      position, gender, department_id, phone, zalo_phone, role
    } = req.body;

    if (!username || !full_name) {
      return res.status(400).json({ error: 'Vui lòng nhập Tên đăng nhập và Họ tên nhân sự.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập này đã tồn tại trong hệ thống.' });
    }

    // Default password if not provided
    const pass = password ? password.trim() : `${cleanUsername}123`;
    const hash = bcrypt.hashSync(pass, 10);

    const info = db.prepare(`
      INSERT INTO users (
        username, password_hash, full_name, birth_date, degree,
        position, gender, department_id, phone, zalo_phone, role, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      cleanUsername,
      hash,
      full_name.trim(),
      birth_date ? birth_date.trim() : null,
      degree ? degree.trim() : null,
      position ? position.trim() : 'GV',
      gender || 'Nữ',
      department_id ? parseInt(department_id) : null,
      phone ? phone.trim() : null,
      zalo_phone ? zalo_phone.trim() : (phone ? phone.trim() : null),
      role || 'lecturer'
    );

    res.json({
      success: true,
      message: 'Thêm nhân sự mới thành công!',
      id: info.lastInsertRowid,
      defaultPassword: pass
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi thêm nhân sự: ' + err.message });
  }
});

// PUT /api/users/:id - Edit user profile
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUser = req.user;
    const isAdmin = currentUser.role === 'admin' || currentUser.username === 'dangutphuong';

    // Only admin or the user themselves can update
    if (!isAdmin && currentUser.id !== targetId) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa tài khoản này.' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng này.' });
    }

    const {
      username, password, full_name, birth_date, degree,
      position, gender, department_id, phone, zalo_phone, role
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Họ và tên không được để trống.' });
    }

    // Check username uniqueness if changed
    let cleanUsername = targetUser.username;
    if (isAdmin && username && username.trim().toLowerCase() !== targetUser.username) {
      cleanUsername = username.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanUsername, targetId);
      if (existing) {
        return res.status(400).json({ error: 'Tên đăng nhập này đã được sử dụng bởi người khác.' });
      }
    }

    // Optional password update
    if (password && password.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, targetId);
    }

    const newRole = isAdmin ? (role || targetUser.role) : targetUser.role;
    const newDept = isAdmin ? (department_id ? parseInt(department_id) : null) : targetUser.department_id;
    const newPhone = phone !== undefined ? (phone && phone.trim() ? phone.trim() : null) : targetUser.phone;
    const newZalo = zalo_phone !== undefined ? (zalo_phone && zalo_phone.trim() ? zalo_phone.trim() : null) : (newPhone || null);

    db.prepare(`
      UPDATE users SET
        username = ?,
        full_name = ?,
        birth_date = ?,
        degree = ?,
        position = ?,
        gender = ?,
        department_id = ?,
        phone = ?,
        zalo_phone = ?,
        role = ?
      WHERE id = ?
    `).run(
      cleanUsername,
      full_name.trim(),
      birth_date ? birth_date.trim() : targetUser.birth_date,
      degree ? degree.trim() : targetUser.degree,
      position ? position.trim() : targetUser.position,
      gender || targetUser.gender,
      newDept,
      newPhone,
      newZalo,
      newRole,
      targetId
    );

    res.json({ success: true, message: 'Cập nhật thông tin nhân sự thành công!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật: ' + err.message });
  }
});

// DELETE /api/users/:id - Admin delete a user safely
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const adminId = req.user.id;

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng này.' });
    }

    if (targetUser.username === 'dangutphuong' || targetUser.id === adminId) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản Quản trị viên chính hoặc tài khoản đang đăng nhập.' });
    }

    // Transaction to safely reassign tasks and delete records
    const deleteTx = db.transaction(() => {
      // 1. Reassign tasks to admin so no task data is lost
      db.prepare('UPDATE tasks SET assigner_id = ? WHERE assigner_id = ?').run(adminId, targetId);
      db.prepare('UPDATE tasks SET assignee_id = ? WHERE assignee_id = ?').run(adminId, targetId);

      // 2. Reassign attachments
      db.prepare('UPDATE task_attachments SET uploader_id = ? WHERE uploader_id = ?').run(adminId, targetId);

      // 3. Clean transfer requests
      db.prepare('DELETE FROM task_transfer_requests WHERE requester_id = ? OR target_user_id = ?').run(targetId, targetId);
      db.prepare('UPDATE task_transfer_requests SET reviewed_by = ? WHERE reviewed_by = ?').run(adminId, targetId);

      // 4. Delete followers
      db.prepare('DELETE FROM task_followers WHERE user_id = ?').run(targetId);

      // 5. Reassign comments
      db.prepare('UPDATE task_comments SET user_id = ? WHERE user_id = ?').run(adminId, targetId);

      // 6. Delete notifications
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(targetId);

      // 7. Delete user
      db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
    });

    deleteTx();

    res.json({ success: true, message: `Đã xóa nhân sự "${targetUser.full_name}" thành công!` });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa nhân sự: ' + err.message });
  }
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

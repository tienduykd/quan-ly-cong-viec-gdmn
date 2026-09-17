const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

// GET /api/notifications
router.get('/', authMiddleware, (req, res) => {
  const notis = db.prepare(`
    SELECT n.*, t.title as task_title
    FROM notifications n
    LEFT JOIN tasks t ON n.task_id = t.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  const unreadCount = db.prepare(`
    SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(req.user.id).count;

  res.json({
    notifications: notis,
    unreadCount
  });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authMiddleware, (req, res) => {
  const notiId = parseInt(req.params.id);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notiId, req.user.id);
  res.json({ success: true });
});

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;

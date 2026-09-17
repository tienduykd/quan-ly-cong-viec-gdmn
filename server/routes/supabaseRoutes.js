const express = require('express');
const router = express.Router();
const supabaseService = require('../supabaseService');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');

// GET /api/supabase/status
router.get('/status', authMiddleware, (req, res) => {
  res.json(supabaseService.getStatus());
});

// POST /api/supabase/save-config
router.post('/save-config', authMiddleware, adminOnly, async (req, res) => {
  const { url, key } = req.body;
  if (!url || !key) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ SUPABASE_URL và SUPABASE_KEY.' });
  }

  const result = await supabaseService.saveConfig(url, key, db);
  if (result.success) {
    res.json({ success: true, message: 'Đã kết nối và lưu cấu hình Supabase thành công!', status: supabaseService.getStatus() });
  } else {
    res.status(400).json({ success: false, error: result.error || 'Kết nối Supabase thất bại.' });
  }
});

// POST /api/supabase/test-connection
router.post('/test-connection', authMiddleware, adminOnly, async (req, res) => {
  const { url, key } = req.body;
  const result = await supabaseService.testConnection(url, key);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// POST /api/supabase/sync-now
router.post('/sync-now', authMiddleware, adminOnly, async (req, res) => {
  const result = await supabaseService.pushToSupabase();
  if (result.success) {
    res.json({ success: true, message: 'Đã sao lưu toàn bộ CSDL và Phiên Zalo lên Supabase thành công!', status: supabaseService.getStatus() });
  } else {
    res.status(400).json({ success: false, error: result.error || 'Đồng bộ thất bại' });
  }
});

// POST /api/supabase/restore-now
router.post('/restore-now', authMiddleware, adminOnly, async (req, res) => {
  const restored = await supabaseService.pullFromSupabase();
  if (restored) {
    res.json({ success: true, message: 'Đã khôi phục CSDL thành công từ Supabase!', status: supabaseService.getStatus() });
  } else {
    res.status(400).json({ success: false, error: supabaseService.lastSyncError || 'Không tìm thấy bản sao lưu hoặc khôi phục thất bại.' });
  }
});

module.exports = router;

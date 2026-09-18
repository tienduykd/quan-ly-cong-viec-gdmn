const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const supabaseService = require('../supabaseService');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(dataDir, 'quanlycongviec.sqlite');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// GET /api/supabase/status
router.get('/status', authMiddleware, (req, res) => {
  res.json(supabaseService.getStatus());
});

// GET /api/supabase/download-db - Tải trực tiếp file CSDL .sqlite về máy tính
router.get('/download-db', authMiddleware, adminOnly, (req, res) => {
  try {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {}

    if (!fs.existsSync(DB_FILE)) {
      return res.status(404).json({ error: 'Không tìm thấy file CSDL.' });
    }

    const filename = `quanlycongviec_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    const fileStream = fs.createReadStream(DB_FILE);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi tải file CSDL: ' + err.message });
  }
});

// POST /api/supabase/upload-db - Nạp file sao lưu .sqlite từ máy tính lên
router.post('/upload-db', authMiddleware, adminOnly, upload.single('database_file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Vui lòng chọn file .sqlite để khôi phục.' });
    }

    const buffer = req.file.buffer;
    const header = buffer.subarray(0, 16).toString('utf8');
    if (!header.startsWith('SQLite format 3')) {
      return res.status(400).json({ error: 'File tải lên không phải là định dạng CSDL SQLite hợp lệ.' });
    }

    fs.writeFileSync(DB_FILE, buffer);
    db.reopen();

    if (supabaseService.client) {
      await supabaseService.pushToSupabase();
    }

    res.json({ success: true, message: 'Đã khôi phục CSDL từ file tải lên thành công! Toàn bộ công việc và nhân sự đã được nạp lại.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khôi phục CSDL: ' + err.message });
  }
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

const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');
const { sendDailyDigest } = require('../cron');
const { postToWebhook } = require('../webhookHelper');

// GET /api/zalo/settings
router.get('/settings', authMiddleware, (req, res) => {
  const webhookUrl = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_webhook_url');
  const enabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_enabled');
  const dailyTime = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_reminder_time');

  const logs = db.prepare(`
    SELECT * FROM zalo_logs 
    ORDER BY sent_at DESC 
    LIMIT 20
  `).all();

  res.json({
    webhookUrl: webhookUrl ? webhookUrl.value : '',
    enabled: enabled ? enabled.value === '1' : false,
    dailyTime: dailyTime ? dailyTime.value : '07:30',
    logs
  });
});

// POST /api/zalo/settings - Admin updates settings
router.post('/settings', authMiddleware, adminOnly, (req, res) => {
  const { webhookUrl, enabled, dailyTime } = req.body;

  const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  updateSetting.run('zalo_webhook_url', webhookUrl !== undefined ? webhookUrl.trim() : '');
  updateSetting.run('zalo_enabled', enabled ? '1' : '0');
  if (dailyTime) {
    updateSetting.run('daily_reminder_time', dailyTime);
  }

  res.json({ message: 'Cập nhật cấu hình Zalo thành công!' });
});

// POST /api/zalo/trigger-digest - Manually trigger daily digest
router.post('/trigger-digest', authMiddleware, adminOnly, async (req, res) => {
  const result = await sendDailyDigest('manual_trigger');
  res.json(result);
});

// POST /api/zalo/test-message - Test webhook message
router.post('/test-message', authMiddleware, adminOnly, async (req, res) => {
  const { message, webhookUrl } = req.body;

  const targetUrl = webhookUrl || db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_webhook_url')?.value;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Chưa cung cấp Webhook URL để kiểm tra.' });
  }

  const content = message || '🔔 [TEST THÔNG BÁO] Kết nối thành công từ Hệ thống Quản lý công việc - Ngành GDMN!';

  try {
    const response = await postToWebhook(targetUrl, content);

    db.prepare(`
      INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
      VALUES ('test', 'webhook_test', ?, 'success', ?)
    `).run(content, JSON.stringify(response.data || {}));

    res.json({
      success: true,
      message: 'Gửi thử nghiệm thành công!',
      responseData: response.data
    });
  } catch (err) {
    db.prepare(`
      INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
      VALUES ('test', 'webhook_test', ?, 'failed', ?)
    `).run(content, err.message);

    res.status(500).json({
      success: false,
      error: 'Gửi thất bại: ' + err.message
    });
  }
});

module.exports = router;

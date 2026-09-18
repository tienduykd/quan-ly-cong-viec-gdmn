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

  const updateSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  if (webhookUrl !== undefined) {
    updateSetting.run('zalo_webhook_url', webhookUrl.trim());
  }
  if (enabled !== undefined) {
    updateSetting.run('zalo_enabled', enabled ? '1' : '0');
  }
  if (dailyTime !== undefined && dailyTime.trim()) {
    updateSetting.run('daily_reminder_time', dailyTime.trim());
  }

  const currentDailyTime = dailyTime ? dailyTime.trim() : (db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_reminder_time')?.value || '07:30');

  res.json({
    message: `Cập nhật cấu hình Zalo thành công! Giờ nhắc tự động: ${currentDailyTime}`,
    dailyTime: currentDailyTime
  });
});

// POST /api/zalo/trigger-digest - Manually trigger daily digest (mode: 'manual_personal' or 'manual_group')
router.post('/trigger-digest', authMiddleware, adminOnly, async (req, res) => {
  const mode = req.body?.mode || 'manual_personal';
  const result = await sendDailyDigest(mode);
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

const DEFAULT_NEW_TASK_TEMPLATE = `🔔 [THÔNG BÁO VIỆC MỚI - NGÀNH GDMN]
Kính gửi {danh_xung} {ho_ten},
{danh_xung} có một công việc mới như sau:
------------------------------------
Người giao việc: {nguoi_gui}
📋 Tên công việc: {ten_cong_viec}
⏳ Hạn hoàn thành: {han_chot}
📊 Mức ưu tiên: {muc_uu_tien}
------------------------------------
Kính nhờ {danh_xung} lưu ý bố trí thời gian thực hiện công việc và cập nhật tiến độ trên hệ thống.
Trân trọng cảm ơn {danh_xung}!`;

const DEFAULT_REMINDER_TEMPLATE = `🔔 [NHẮC NHỞ TIẾN ĐỘ CÔNG VIỆC - NGÀNH GDMN]
Kính gửi {danh_xung} {ho_ten},
{danh_xung} có công việc cần lưu tâm:
------------------------------------
Người giao việc: {nguoi_gui}
📋 Tên công việc: {ten_cong_viec}
⏳ Hạn hoàn thành: {han_chot}
📊 Mức ưu tiên: {muc_uu_tien}
------------------------------------
Kính nhờ {danh_xung} lưu ý bố trí thời gian thực hiện công việc và cập nhật tiến độ trên hệ thống.
Trân trọng cảm ơn {danh_xung}!`;

const DEFAULT_DAILY_DEADLINE_TEMPLATE = `🔔 [NHẮC NHỞ DEADLINE CÔNG VIỆC - NGÀNH GDMN]
Kính gửi {danh_xung} {ho_ten},
Hôm nay {danh_xung} có các công việc đến Deadline, nhờ {danh_xung} lưu tâm:
------------------------------------
{danh_sach_cong_viec}
⏳ Hạn hoàn thành: Hôm nay {han_chot}
------------------------------------
Kính nhờ {danh_xung} lưu ý bố trí thời gian thực hiện công việc và cập nhật tiến độ trên hệ thống.
Trân trọng cảm ơn {danh_xung}!`;

const DEFAULT_GROUP_TEMPLATE = `📢 [BẢN TIN CÔNG VIỆC HÀNG NGÀY - NGÀNH GDMN]
📅 Ngày: {ngay}
------------------------------------
📌 CÔNG VIỆC ĐẾN HẠN HÔM NAY ({so_viec_hom_nay}):
{danh_sach_viec_hom_nay}

⚠️ CÔNG VIỆC QUÁ HẠN CẦN XỬ LÝ GẤP ({so_viec_qua_han}):
{danh_sach_viec_qua_han}
------------------------------------
Kính nhờ Quý Thầy/Cô kiểm tra và cập nhật tiến độ công việc trên hệ thống: https://tienduykd.github.io/quan-ly-cong-viec-gdmn
Chúc Quý Thầy/Cô một ngày làm việc hiệu quả!`;

// GET /api/zalo/templates - Get current message templates
router.get('/templates', authMiddleware, (req, res) => {
  const newTaskRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_template_new_task')
    || db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_template_personal');
  const reminderRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_template_reminder');
  const dailyDeadlineRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_template_daily_deadline');
  const groupRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_template_group');

  res.json({
    newTaskTemplate: newTaskRow && newTaskRow.value ? newTaskRow.value : DEFAULT_NEW_TASK_TEMPLATE,
    reminderTemplate: reminderRow && reminderRow.value ? reminderRow.value : DEFAULT_REMINDER_TEMPLATE,
    dailyDeadlineTemplate: dailyDeadlineRow && dailyDeadlineRow.value ? dailyDeadlineRow.value : DEFAULT_DAILY_DEADLINE_TEMPLATE,
    groupTemplate: groupRow && groupRow.value ? groupRow.value : DEFAULT_GROUP_TEMPLATE,
    // Backward compatibility
    personalTemplate: newTaskRow && newTaskRow.value ? newTaskRow.value : DEFAULT_NEW_TASK_TEMPLATE,
    defaults: {
      newTask: DEFAULT_NEW_TASK_TEMPLATE,
      reminder: DEFAULT_REMINDER_TEMPLATE,
      dailyDeadline: DEFAULT_DAILY_DEADLINE_TEMPLATE,
      group: DEFAULT_GROUP_TEMPLATE
    }
  });
});

// POST /api/zalo/templates - Admin updates templates
router.post('/templates', authMiddleware, adminOnly, (req, res) => {
  const { newTaskTemplate, reminderTemplate, dailyDeadlineTemplate, groupTemplate, personalTemplate } = req.body;

  const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)');
  if (newTaskTemplate !== undefined) {
    updateSetting.run('zalo_template_new_task', newTaskTemplate.trim(), 'Mẫu tin Zalo: Báo việc mới');
    updateSetting.run('zalo_template_personal', newTaskTemplate.trim(), 'Mẫu tin Zalo: Báo việc mới');
  } else if (personalTemplate !== undefined) {
    updateSetting.run('zalo_template_new_task', personalTemplate.trim(), 'Mẫu tin Zalo: Báo việc mới');
    updateSetting.run('zalo_template_personal', personalTemplate.trim(), 'Mẫu tin Zalo: Báo việc mới');
  }

  if (reminderTemplate !== undefined) {
    updateSetting.run('zalo_template_reminder', reminderTemplate.trim(), 'Mẫu tin Zalo: Nhắc nhở tiến độ');
  }
  if (dailyDeadlineTemplate !== undefined) {
    updateSetting.run('zalo_template_daily_deadline', dailyDeadlineTemplate.trim(), 'Mẫu tin Zalo: Nhắc deadline hàng ngày');
  }
  if (groupTemplate !== undefined) {
    updateSetting.run('zalo_template_group', groupTemplate.trim(), 'Mẫu tin Zalo gửi nhóm chung');
  }

  res.json({ message: 'Lưu các mẫu tin nhắn Zalo thành công!' });
});

// POST /api/zalo/templates/reset - Reset template to default
router.post('/templates/reset', authMiddleware, adminOnly, (req, res) => {
  const { type } = req.body; // 'new_task' | 'reminder' | 'daily_deadline' | 'group' | 'all'
  const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)');

  if (type === 'new_task' || type === 'all' || type === 'personal') {
    updateSetting.run('zalo_template_new_task', DEFAULT_NEW_TASK_TEMPLATE, 'Mẫu tin Zalo: Báo việc mới');
    updateSetting.run('zalo_template_personal', DEFAULT_NEW_TASK_TEMPLATE, 'Mẫu tin Zalo: Báo việc mới');
  }
  if (type === 'reminder' || type === 'all') {
    updateSetting.run('zalo_template_reminder', DEFAULT_REMINDER_TEMPLATE, 'Mẫu tin Zalo: Nhắc nhở tiến độ');
  }
  if (type === 'daily_deadline' || type === 'all') {
    updateSetting.run('zalo_template_daily_deadline', DEFAULT_DAILY_DEADLINE_TEMPLATE, 'Mẫu tin Zalo: Nhắc deadline hàng ngày');
  }
  if (type === 'group' || type === 'all') {
    updateSetting.run('zalo_template_group', DEFAULT_GROUP_TEMPLATE, 'Mẫu tin Zalo gửi nhóm chung');
  }

  res.json({
    message: 'Khôi phục mẫu tin mặc định thành công!',
    newTaskTemplate: DEFAULT_NEW_TASK_TEMPLATE,
    reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
    dailyDeadlineTemplate: DEFAULT_DAILY_DEADLINE_TEMPLATE,
    groupTemplate: DEFAULT_GROUP_TEMPLATE
  });
});

module.exports = router;
module.exports.DEFAULT_NEW_TASK_TEMPLATE = DEFAULT_NEW_TASK_TEMPLATE;
module.exports.DEFAULT_REMINDER_TEMPLATE = DEFAULT_REMINDER_TEMPLATE;
module.exports.DEFAULT_DAILY_DEADLINE_TEMPLATE = DEFAULT_DAILY_DEADLINE_TEMPLATE;
module.exports.DEFAULT_GROUP_TEMPLATE = DEFAULT_GROUP_TEMPLATE;

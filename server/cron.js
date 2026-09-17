const cron = require('node-cron');
const axios = require('axios');
const db = require('./db');
const { postToWebhook } = require('./webhookHelper');
const zaloPersonalService = require('./zaloPersonalService');

// Function to generate and send daily digest
async function sendDailyDigest(triggerType = 'cron') {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Get tasks due today
    const dueTodayTasks = db.prepare(`
      SELECT t.id, t.title, t.priority, t.progress, u.full_name as assignee_name, d.name as dept_name
      FROM tasks t
      JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.due_date = ? AND t.status != 'completed' AND t.status != 'cancelled'
      ORDER BY t.priority DESC
    `).all(today);

    // Get overdue tasks
    const overdueTasks = db.prepare(`
      SELECT t.id, t.title, t.due_date, t.priority, t.progress, u.full_name as assignee_name, d.name as dept_name
      FROM tasks t
      JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.due_date < ? AND t.status != 'completed' AND t.status != 'cancelled'
      ORDER BY t.due_date ASC
    `).all(today);

    // Get ongoing tasks
    const inProgressCount = db.prepare(`
      SELECT count(*) as count FROM tasks 
      WHERE status = 'in_progress'
    `).get().count;

    // Compose message
    let message = `📋 [BẢN TIN NHẮC VIỆC ĐẦU NGÀY - NGÀNH GDMN]\n`;
    message += `📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}\n`;
    message += `------------------------------------\n`;

    if (dueTodayTasks.length === 0 && overdueTasks.length === 0) {
      message += `✅ Hôm nay không có công việc nào tới hạn chót hoặc trễ hạn.\n`;
      message += `💪 Hiện có ${inProgressCount} công việc đang trong tiến trình xử lý.\n`;
    } else {
      if (dueTodayTasks.length > 0) {
        message += `⏰ CÔNG VIỆC ĐẾN HẠN HÔM NAY (${dueTodayTasks.length}):\n`;
        dueTodayTasks.forEach((t, i) => {
          const prio = t.priority === 'urgent' ? '🔴 KHẨN CẤP' : (t.priority === 'high' ? '🟠 Cao' : '🔵 Bình thường');
          message += `${i + 1}. [${prio}] ${t.title}\n   👤 Phụ trách: ${t.assignee_name} | Tiến độ: ${t.progress}%\n`;
        });
        message += `\n`;
      }

      if (overdueTasks.length > 0) {
        message += `⚠️ CÔNG VIỆC ĐÃ QUÁ HẠN (${overdueTasks.length}):\n`;
        overdueTasks.forEach((t, i) => {
          message += `${i + 1}. ❗ ${t.title} (Hạn: ${t.due_date})\n   👤 Phụ trách: ${t.assignee_name} | Tiến độ: ${t.progress}%\n`;
        });
        message += `\n`;
      }
    }

    message += `👉 Quý Thầy/Cô vui lòng truy cập hệ thống để cập nhật tiến độ công việc.\n`;
    message += `Chúc Quý Thầy/Cô một ngày làm việc hiệu quả!`;

    // Also insert In-App notifications for assignees of due tasks
    const insertNoti = db.prepare(`
      INSERT INTO notifications (user_id, task_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    dueTodayTasks.forEach(t => {
      const taskObj = db.prepare('SELECT assignee_id FROM tasks WHERE id = ?').get(t.id);
      if (taskObj) {
        insertNoti.run(
          taskObj.assignee_id,
          t.id,
          'Nhắc việc: Hôm nay đến hạn công việc',
          `Công việc "${t.title}" của Thầy/Cô đến hạn hoàn thành hôm nay (${today}). Vui lòng cập nhật tiến độ!`,
          'daily_reminder'
        );
      }
    });

    let zaloResult = { sent: false, note: 'Chưa cấu hình Zalo cá nhân hoặc Webhook.' };

    // 1. Send via Personal Zalo Bot if logged in and enabled
    if (zaloPersonalService.status === 'logged_in' && zaloPersonalService.enabled) {
      try {
        const personalRes = await zaloPersonalService.sendMessage(message);
        if (personalRes.sent) {
          zaloResult = { sent: true, note: 'Đã gửi thành công qua Bot Zalo Cá nhân vào Nhóm GDMN.' };
        }
      } catch (err) {
        console.error('[CRON] Lỗi gửi qua Zalo cá nhân:', err.message);
      }
    }

    // 2. Check Zalo Webhook setting & send if configured
    const webhookSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_webhook_url');
    const enabledSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_enabled');

    if (webhookSetting && webhookSetting.value && enabledSetting && enabledSetting.value === '1') {
      try {
        // Send to Webhook (Zalo, Telegram, Discord, Lark, Slack, etc.)
        const response = await postToWebhook(webhookSetting.value, message);

        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES (?, ?, ?, ?, ?)
        `).run(triggerType, 'group_webhook', message, 'success', JSON.stringify(response.data || {}));

        zaloResult = { sent: true, note: 'Đã gửi thành công tin nhắn đến Group Webhook.' };
      } catch (err) {
        console.error('Lỗi khi gửi webhook:', err.message);
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES (?, ?, ?, ?, ?)
        `).run(triggerType, 'group_webhook', message, 'failed', err.message);

        if (!zaloResult.sent) {
          zaloResult = { sent: false, error: err.message, note: 'Không thể kết nối đến Webhook URL.' };
        }
      }
    }

    return {
      success: true,
      message,
      dueCount: dueTodayTasks.length,
      overdueCount: overdueTasks.length,
      zaloResult
    };
  } catch (error) {
    console.error('Error sending daily digest:', error);
    return { success: false, error: error.message };
  }
}

// Function to send arbitrary message via personal Zalo bot and/or webhook
async function sendZaloMessage(content, messageType = 'task_event', recipient = 'group_webhook') {
  let sentAny = false;

  // 1. Send via Personal Zalo Bot
  if (zaloPersonalService.status === 'logged_in' && zaloPersonalService.enabled) {
    try {
      const personalRes = await zaloPersonalService.sendMessage(content);
      if (personalRes.sent) sentAny = true;
    } catch (e) {}
  }

  // 2. Send via Webhook
  try {
    const webhookSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_webhook_url');
    const enabledSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_enabled');

    if (webhookSetting && webhookSetting.value && enabledSetting && enabledSetting.value === '1') {
      const response = await postToWebhook(webhookSetting.value, content);

      db.prepare(`
        INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
        VALUES (?, ?, ?, 'success', ?)
      `).run(messageType, recipient, content, JSON.stringify(response.data || {}));
      sentAny = true;
    }
  } catch (err) {
    console.error('Lỗi gửi Webhook:', err.message);
    db.prepare(`
      INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
      VALUES (?, ?, ?, 'failed', ?)
    `).run(messageType, recipient, content, err.message);
  }

  return { sent: sentAny };
}

// Function to notify all stakeholders (Assigner, Assignee, Followers) on any task change
async function notifyTaskEvent(taskId, eventTitle, actorName, detail) {
  try {
    const task = db.prepare(`
      SELECT t.*, 
             u_assigner.full_name as assigner_name,
             u_assignee.full_name as assignee_name
      FROM tasks t
      JOIN users u_assigner ON t.assigner_id = u_assigner.id
      JOIN users u_assignee ON t.assignee_id = u_assignee.id
      WHERE t.id = ?
    `).get(taskId);

    if (!task) return;

    const followers = db.prepare(`
      SELECT u.id, u.full_name FROM task_followers tf
      JOIN users u ON tf.user_id = u.id
      WHERE tf.task_id = ?
    `).all(taskId);

    const followerNames = followers.map(f => f.full_name).join(', ') || 'Không có';

    // 1. In-App Notifications for stakeholders
    const insertNoti = db.prepare(`
      INSERT INTO notifications (user_id, task_id, title, message, type)
      VALUES (?, ?, ?, ?, 'task_event')
    `);

    const recipientUserIds = new Set();
    recipientUserIds.add(task.assigner_id);
    recipientUserIds.add(task.assignee_id);
    followers.forEach(f => recipientUserIds.add(f.id));

    recipientUserIds.forEach(uid => {
      insertNoti.run(
        uid,
        taskId,
        eventTitle,
        `${actorName}: ${detail} (Công việc "${task.title}")`
      );
    });

    // 2. Format and send Zalo notification
    let zaloMsg = `🔔 [THÔNG BÁO CÔNG VIỆC - GDMN]\n`;
    zaloMsg += `📌 CV: ${task.title}\n`;
    zaloMsg += `⚡ Sự kiện: ${eventTitle}\n`;
    zaloMsg += `👤 Thực hiện: ${actorName}\n`;
    zaloMsg += `📝 Chi tiết: ${detail}\n`;
    zaloMsg += `------------------------------------\n`;
    zaloMsg += `👉 Người giao việc: ${task.assigner_name}\n`;
    zaloMsg += `👉 Người xử lý chính: ${task.assignee_name}\n`;
    if (followers.length > 0) {
      zaloMsg += `👥 Người theo dõi: ${followerNames}\n`;
    }
    zaloMsg += `⏰ Hạn chót: ${task.due_date} | Tiến độ: ${task.progress}%\n`;
    zaloMsg += `(Đã gửi thông báo tới Người giao việc, Người xử lý chính và các nhân sự theo dõi)`;

    await sendZaloMessage(zaloMsg, 'task_event');
  } catch (err) {
    console.error('Lỗi khi phát thông báo task event:', err);
  }
}

// Setup node-cron scheduler at 07:30 AM every day
function startCronJobs() {
  // Run at 07:30 every day: 30 7 * * *
  cron.schedule('30 7 * * *', () => {
    console.log('[CRON] Đang quét lịch nhắc việc 07:30 sáng...');
    sendDailyDigest('cron');
  });

  console.log('[CRON] Bộ lập lịch nhắc việc tự động 07:30 sáng đã sẵn sàng.');
}

module.exports = {
  startCronJobs,
  sendDailyDigest,
  sendZaloMessage,
  notifyTaskEvent
};

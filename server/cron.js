const cron = require('node-cron');
const axios = require('axios');
const db = require('./db');

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

    // Check Zalo Webhook setting
    const webhookSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_webhook_url');
    const enabledSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_enabled');

    let zaloResult = { sent: false, note: 'Zalo Webhook chưa cấu hình hoặc chưa kích hoạt.' };

    if (webhookSetting && webhookSetting.value && enabledSetting && enabledSetting.value === '1') {
      try {
        // Send to Zalo Webhook (or general webhook bot)
        const response = await axios.post(webhookSetting.value, {
          text: message,
          message: message,
          timestamp: Date.now()
        }, { timeout: 8000 });

        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES (?, ?, ?, ?, ?)
        `).run(triggerType, 'group_webhook', message, 'success', JSON.stringify(response.data || {}));

        zaloResult = { sent: true, note: 'Đã gửi thành công tin nhắn đến Zalo Group Webhook.' };
      } catch (err) {
        console.error('Lỗi khi gửi webhook Zalo:', err.message);
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES (?, ?, ?, ?, ?)
        `).run(triggerType, 'group_webhook', message, 'failed', err.message);

        zaloResult = { sent: false, error: err.message, note: 'Không thể kết nối đến Webhook Zalo URL.' };
      }
    } else {
      // Record log as simulation / ready
      db.prepare(`
        INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
        VALUES (?, ?, ?, ?, ?)
      `).run(triggerType, 'simulated_or_pending_webhook', message, 'success', 'Webhook chưa kích hoạt, bản tin đã được tạo và lưu log thành công.');
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
  sendDailyDigest
};

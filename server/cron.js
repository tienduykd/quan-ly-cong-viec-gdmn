const cron = require('node-cron');
const axios = require('axios');
const db = require('./db');
const { postToWebhook } = require('./webhookHelper');
const zaloPersonalService = require('./zaloPersonalService');
const { getHonorific, formatDateDMY } = require('./formatHelper');

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

    const inProgressCount = db.prepare(`
      SELECT count(*) as count FROM tasks 
      WHERE status = 'in_progress'
    `).get().count;

    // 1. Insert In-App notifications for assignees of due tasks
    const insertNoti = db.prepare(`
      INSERT INTO notifications (user_id, task_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    dueTodayTasks.forEach(t => {
      const taskObj = db.prepare('SELECT t.assignee_id, u.gender FROM tasks t JOIN users u ON t.assignee_id = u.id WHERE t.id = ?').get(t.id);
      if (taskObj) {
        const h = getHonorific(taskObj.gender);
        insertNoti.run(
          taskObj.assignee_id,
          t.id,
          'Nhắc việc: Hôm nay đến hạn công việc',
          `Công việc "${t.title}" của ${h} đến hạn hoàn thành hôm nay (${formatDateDMY(today)}). Vui lòng cập nhật tiến độ!`,
          'daily_reminder'
        );
      }
    });

    let zaloResult = { sent: false, note: '' };

    // =========================================================================
    // CHẾ ĐỘ 1 (MẶC ĐỊNH & TỰ ĐỘNG 07:30 SÁNG): Gửi tin nhắn riêng 1-1 cho người có việc
    // =========================================================================
    if (triggerType === 'cron' || triggerType === 'manual_personal' || triggerType === 'all') {
      const activeTasks = db.prepare(`
        SELECT t.id, t.title, t.priority, t.progress, t.due_date,
               u.id as assignee_id, u.full_name as assignee_name, u.gender as assignee_gender,
               u.phone as assignee_phone, u.zalo_phone as assignee_zalo
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE (t.due_date = ? OR t.due_date < ?) AND t.status != 'completed' AND t.status != 'cancelled'
        ORDER BY t.priority DESC, t.due_date ASC
      `).all(today, today);

      const tasksByUser = {};
      for (const t of activeTasks) {
        if (!tasksByUser[t.assignee_id]) {
          tasksByUser[t.assignee_id] = {
            user: {
              id: t.assignee_id,
              full_name: t.assignee_name,
              gender: t.assignee_gender,
              phone: t.assignee_zalo || t.assignee_phone
            },
            dueToday: [],
            overdue: []
          };
        }
        if (t.due_date === today) {
          tasksByUser[t.assignee_id].dueToday.push(t);
        } else {
          tasksByUser[t.assignee_id].overdue.push(t);
        }
      }

      let personalSentCount = 0;
      if (zaloPersonalService.status === 'logged_in' && zaloPersonalService.enabled) {
        for (const item of Object.values(tasksByUser)) {
          const { user, dueToday, overdue } = item;
          const targetPhone = user.phone ? user.phone.trim() : null;
          if (!targetPhone) continue; // Only send if phone exists

          const honorific = getHonorific(user.gender);
          let personalMsg = `⏰ [NHẮC VIỆC HÔM NAY - NGÀNH GDMN]\n`;
          personalMsg += `Kính gửi ${honorific} ${user.full_name},\n`;
          personalMsg += `Sáng nay (${formatDateDMY(today)}), ${honorific} có công việc cần hoàn thành/theo dõi:\n`;
          personalMsg += `------------------------------------\n`;

          if (dueToday.length > 0) {
            personalMsg += `📌 CÔNG VIỆC ĐẾN HẠN HÔM NAY (${dueToday.length}):\n`;
            dueToday.forEach((t, i) => {
              const prio = t.priority === 'urgent' ? '🔴 KHẨN' : (t.priority === 'high' ? '🟠 Cao' : '🔵 Thường');
              personalMsg += `${i + 1}. [${prio}] ${t.title} (Tiến độ: ${t.progress}%)\n`;
            });
          }

          if (overdue.length > 0) {
            personalMsg += `⚠️ CÔNG VIỆC ĐÃ QUÁ HẠN (${overdue.length}):\n`;
            overdue.forEach((t, i) => {
              personalMsg += `${i + 1}. ❗ ${t.title} (Hạn chót: ${formatDateDMY(t.due_date)} | Tiến độ: ${t.progress}%)\n`;
            });
          }

          personalMsg += `------------------------------------\n`;
          personalMsg += `${honorific} vui lòng truy cập hệ thống để cập nhật tiến độ nhé.\n`;
          personalMsg += `Kính chúc ${honorific} một ngày làm việc thuận lợi và hiệu quả!`;

          try {
            const sendRes = await zaloPersonalService.sendToPhone(targetPhone, personalMsg);
            if (sendRes.sent) personalSentCount++;
          } catch (e) {
            console.warn(`[CRON-DIGEST] Lỗi gửi riêng tới SĐT ${targetPhone}:`, e.message);
          }
        }
      }

      zaloResult = {
        sent: personalSentCount > 0,
        personalSentCount,
        note: `Đã gửi tin nhắn nhắc việc riêng tới ${personalSentCount} giảng viên có việc hôm nay.`
      };
    }

    // =========================================================================
    // CHẾ ĐỘ 2 (CHỈ GỬI KHI BẤM THỦ CÔNG): Gửi bản tin tổng hợp vào Nhóm Zalo GDMN
    // =========================================================================
    if (triggerType === 'manual_group' || triggerType === 'all') {
      const groupTemplateRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_template_group');
      const groupTemplate = (groupTemplateRow && groupTemplateRow.value && groupTemplateRow.value.trim()) ? groupTemplateRow.value : `📢 [BẢN TIN CÔNG VIỆC HÀNG NGÀY - NGÀNH GDMN]
📅 Ngày: {ngay}
------------------------------------
📌 CÔNG VIỆC ĐẾN HẠN HÔM NAY ({so_viec_hom_nay}):
{danh_sach_viec_hom_nay}

⚠️ CÔNG VIỆC QUÁ HẠN CẦN XỬ LÝ GẤP ({so_viec_qua_han}):
{danh_sach_viec_qua_han}
------------------------------------
Kính nhờ Quý Thầy/Cô kiểm tra và cập nhật tiến độ công việc trên hệ thống: https://tienduykd.github.io/quan-ly-cong-viec-gdmn
Chúc Quý Thầy/Cô một ngày làm việc hiệu quả!`;

      const todayStr = formatDateDMY(today);
      let dueListText = '(Không có công việc đến hạn)';
      if (dueTodayTasks.length > 0) {
        dueListText = dueTodayTasks.map((t, i) => {
          const prio = t.priority === 'urgent' ? '🔴 KHẨN CẤP' : (t.priority === 'high' ? '🟠 Cao' : '🔵 Bình thường');
          return `${i + 1}. [${prio}] ${t.title}\n   👤 Phụ trách: ${t.assignee_name} | Tiến độ: ${t.progress}%`;
        }).join('\n');
      }

      let overdueListText = '(Không có công việc quá hạn)';
      if (overdueTasks.length > 0) {
        overdueListText = overdueTasks.map((t, i) => {
          return `${i + 1}. ❗ ${t.title} (Hạn: ${formatDateDMY(t.due_date)})\n   👤 Phụ trách: ${t.assignee_name} | Tiến độ: ${t.progress}%`;
        }).join('\n');
      }

      let groupMsg = groupTemplate
        .replace(/{ngay}/g, todayStr)
        .replace(/{so_viec_hom_nay}/g, dueTodayTasks.length.toString())
        .replace(/{danh_sach_viec_hom_nay}/g, dueListText)
        .replace(/{so_viec_qua_han}/g, overdueTasks.length.toString())
        .replace(/{danh_sach_viec_qua_han}/g, overdueListText);

      // 1. Send to Group via Personal Zalo Bot
      if (zaloPersonalService.status === 'logged_in' && zaloPersonalService.enabled) {
        try {
          const personalRes = await zaloPersonalService.sendMessage(groupMsg);
          if (personalRes.sent) {
            zaloResult = { sent: true, note: 'Đã gửi thành công bản tin vào Nhóm Zalo GDMN.' };
          }
        } catch (err) {
          console.error('[CRON] Lỗi gửi qua Zalo cá nhân vào nhóm:', err.message);
        }
      }

      // 2. Send to Group via Webhook (Telegram / Discord / Lark / Make)
      try {
        const webhookSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_webhook_url');
        const enabledSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_enabled');
        if (webhookSetting && webhookSetting.value && enabledSetting && enabledSetting.value === '1') {
          const whRes = await postToWebhook(webhookSetting.value, groupMsg);
          db.prepare(`
            INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
            VALUES ('daily_digest', 'webhook_group', ?, 'success', ?)
          `).run(groupMsg, JSON.stringify(whRes.data || {}));
          zaloResult.sent = true;
          zaloResult.note = (zaloResult.note ? zaloResult.note + ' | ' : '') + 'Đã gửi bản tin tới Webhook (Telegram/Nhóm).';
        }
      } catch (whErr) {
        console.error('[CRON] Lỗi gửi Webhook vào nhóm:', whErr.message);
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES ('daily_digest', 'webhook_group', ?, 'failed', ?)
        `).run(groupMsg, whErr.message);
      }
    }

    return {
      success: true,
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
             u_assigner.full_name as assigner_name, u_assigner.phone as assigner_phone, u_assigner.zalo_phone as assigner_zalo,
             u_assignee.full_name as assignee_name, u_assignee.phone as assignee_phone, u_assignee.zalo_phone as assignee_zalo
      FROM tasks t
      JOIN users u_assigner ON t.assigner_id = u_assigner.id
      JOIN users u_assignee ON t.assignee_id = u_assignee.id
      WHERE t.id = ?
    `).get(taskId);

    if (!task) return;

    const followers = db.prepare(`
      SELECT u.id, u.full_name, u.phone, u.zalo_phone FROM task_followers tf
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

    // Ghi chú: Thông báo qua Zalo chỉ thực hiện khi người dùng bấm nút "Nhắc Zalo" của công việc
    // hoặc theo lịch nhắc việc đầu ngày 07:30 sáng, không tự động spam Zalo mỗi khi sửa/cập nhật công việc.
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

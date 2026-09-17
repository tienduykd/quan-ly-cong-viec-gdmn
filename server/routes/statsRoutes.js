const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const db = require('../db');
const { authMiddleware } = require('../auth');

// GET /api/stats/dashboard
router.get('/dashboard', authMiddleware, (req, res) => {
  const user = req.user;
  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';
  const today = new Date().toISOString().slice(0, 10);

  // Count totals (Admin sees all, normal user sees their tasks)
  let totalQuery = 'SELECT count(*) as count FROM tasks WHERE 1=1';
  let inProgressQuery = "SELECT count(*) as count FROM tasks WHERE status = 'in_progress'";
  let pendingQuery = "SELECT count(*) as count FROM tasks WHERE status = 'pending_approval'";
  let completedQuery = "SELECT count(*) as count FROM tasks WHERE status = 'completed'";
  let overdueQuery = `SELECT count(*) as count FROM tasks WHERE due_date < '${today}' AND status != 'completed' AND status != 'cancelled'`;

  if (!isAdmin) {
    const filter = ` AND (assigner_id = ${user.id} OR assignee_id = ${user.id} OR id IN (SELECT task_id FROM task_followers WHERE user_id = ${user.id}))`;
    totalQuery += filter;
    inProgressQuery += filter;
    pendingQuery += filter;
    completedQuery += filter;
    overdueQuery += filter;
  }

  const total = db.prepare(totalQuery).get().count;
  const inProgress = db.prepare(inProgressQuery).get().count;
  const pendingApproval = db.prepare(pendingQuery).get().count;
  const completed = db.prepare(completedQuery).get().count;
  const overdue = db.prepare(overdueQuery).get().count;

  // Department statistics
  const deptStats = db.prepare(`
    SELECT d.id, d.name, d.code,
           count(t.id) as total_tasks,
           sum(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
           sum(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
           sum(CASE WHEN t.due_date < ? AND t.status != 'completed' AND t.status != 'cancelled' THEN 1 ELSE 0 END) as overdue_tasks
    FROM departments d
    LEFT JOIN tasks t ON d.id = t.department_id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all(today);

  // Status breakdown
  const statusStats = [
    { name: 'Chưa thực hiện', value: db.prepare("SELECT count(*) as c FROM tasks WHERE status = 'todo'").get().c, color: '#94a3b8' },
    { name: 'Đang thực hiện', value: inProgress, color: '#3b82f6' },
    { name: 'Chờ nghiệm thu', value: pendingApproval, color: '#f59e0b' },
    { name: 'Đã hoàn thành', value: completed, color: '#10b981' },
    { name: 'Quá hạn', value: overdue, color: '#ef4444' }
  ];

  // Priority breakdown
  const priorityStats = [
    { name: 'Khẩn cấp', count: db.prepare("SELECT count(*) as c FROM tasks WHERE priority = 'urgent'").get().c },
    { name: 'Cao', count: db.prepare("SELECT count(*) as c FROM tasks WHERE priority = 'high'").get().c },
    { name: 'Bình thường', count: db.prepare("SELECT count(*) as c FROM tasks WHERE priority = 'medium'").get().c },
    { name: 'Thấp', count: db.prepare("SELECT count(*) as c FROM tasks WHERE priority = 'low'").get().c }
  ];

  // User personal counts
  const myAssignedCount = db.prepare('SELECT count(*) as count FROM tasks WHERE assignee_id = ? AND is_personal = 0').get(user.id).count;
  const myCreatedCount = db.prepare('SELECT count(*) as count FROM tasks WHERE assigner_id = ? AND assignee_id != ?').get(user.id, user.id).count;
  const myPersonalCount = db.prepare('SELECT count(*) as count FROM tasks WHERE assignee_id = ? AND is_personal = 1').get(user.id).count;

  // Pending transfer requests awaiting review (if assigner or admin)
  let pendingTransfers = 0;
  if (isAdmin) {
    pendingTransfers = db.prepare("SELECT count(*) as c FROM task_transfer_requests WHERE status = 'pending'").get().c;
  } else {
    pendingTransfers = db.prepare(`
      SELECT count(*) as c 
      FROM task_transfer_requests ttr
      JOIN tasks t ON ttr.task_id = t.id
      WHERE ttr.status = 'pending' AND t.assigner_id = ?
    `).get(user.id).c;
  }

  res.json({
    summary: {
      total,
      inProgress,
      pendingApproval,
      completed,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      pendingTransfers
    },
    myCounts: {
      assigned: myAssignedCount,
      created: myCreatedCount,
      personal: myPersonalCount
    },
    deptStats,
    statusStats,
    priorityStats
  });
});

// GET /api/stats/export-excel - Export tasks list to Excel
router.get('/export-excel', authMiddleware, (req, res) => {
  const user = req.user;
  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';

  let query = `
    SELECT t.id, t.title, t.category, t.priority, t.status, t.progress,
           t.start_date, t.due_date, t.completed_at,
           u_assigner.full_name as assigner_name,
           u_assignee.full_name as assignee_name,
           d.name as department_name,
           t.kpi_score, t.kpi_evaluation, t.kpi_note
    FROM tasks t
    JOIN users u_assigner ON t.assigner_id = u_assigner.id
    JOIN users u_assignee ON t.assignee_id = u_assignee.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (!isAdmin) {
    query += ' AND (t.assigner_id = ? OR t.assignee_id = ? OR t.id IN (SELECT task_id FROM task_followers WHERE user_id = ?))';
    params.push(user.id, user.id, user.id);
  }

  query += ' ORDER BY t.id ASC';

  const rows = db.prepare(query).all(...params);

  const statusMap = {
    'todo': 'Chưa thực hiện',
    'in_progress': 'Đang thực hiện',
    'pending_approval': 'Chờ nghiệm thu',
    'completed': 'Đã hoàn thành',
    'cancelled': 'Đã hủy'
  };

  const priorityMap = {
    'low': 'Thấp',
    'medium': 'Bình thường',
    'high': 'Cao',
    'urgent': 'Khẩn cấp'
  };

  const excelData = rows.map((r, idx) => ({
    'STT': idx + 1,
    'Mã CV': `CV-${r.id.toString().padStart(4, '0')}`,
    'Tên công việc': r.title,
    'Tổ chuyên môn': r.department_name || 'Toàn ngành',
    'Loại việc': r.category,
    'Mức ưu tiên': priorityMap[r.priority] || r.priority,
    'Người giao': r.assigner_name,
    'Người xử lý chính': r.assignee_name,
    'Ngày bắt đầu': r.start_date,
    'Hạn hoàn thành': r.due_date,
    'Tiến độ': `${r.progress}%`,
    'Trạng thái': statusMap[r.status] || r.status,
    'Ngày hoàn thành': r.completed_at ? r.completed_at.slice(0, 10) : '',
    'Điểm KPI': r.kpi_score || '',
    'Xếp loại': r.kpi_evaluation || '',
    'Ghi chú đánh giá': r.kpi_note || ''
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(excelData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 10 }, // Mã CV
    { wch: 45 }, // Tên công việc
    { wch: 25 }, // Tổ
    { wch: 18 }, // Loại việc
    { wch: 14 }, // Ưu tiên
    { wch: 22 }, // Người giao
    { wch: 22 }, // Người xử lý chính
    { wch: 14 }, // Bắt đầu
    { wch: 14 }, // Hạn chót
    { wch: 10 }, // Tiến độ
    { wch: 16 }, // Trạng thái
    { wch: 16 }, // Ngày hoàn thành
    { wch: 10 }, // KPI
    { wch: 14 }, // Xếp loại
    { wch: 30 }  // Ghi chú
  ];

  xlsx.utils.book_append_sheet(wb, ws, 'Danh sách công việc GDMN');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const filename = `Bao_Cao_Cong_Viec_GDMN_${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;

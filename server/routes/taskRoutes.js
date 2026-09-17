const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authMiddleware } = require('../auth');

// Configure multer file upload
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeBaseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per file
});

// Helper to check if a user has access to view a specific task
function canUserViewTask(user, task) {
  if (user.role === 'admin' || user.username === 'dangutphuong') {
    return true;
  }
  if (task.assigner_id === user.id || task.assignee_id === user.id) {
    return true;
  }
  // Check if follower
  const isFollower = db.prepare(`
    SELECT count(*) as count FROM task_followers WHERE task_id = ? AND user_id = ?
  `).get(task.id, user.id).count > 0;

  return isFollower;
}

// GET /api/tasks - List tasks with permission filtering
router.get('/', authMiddleware, (req, res) => {
  const { status, category, priority, department_id, scope, search } = req.query;
  const user = req.user;
  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';

  let baseQuery = `
    SELECT t.*, 
           u_assigner.full_name as assigner_name,
           u_assignee.full_name as assignee_name,
           d.name as department_name,
           (SELECT count(*) FROM task_followers WHERE task_id = t.id) as follower_count,
           (SELECT count(*) FROM task_attachments WHERE task_id = t.id) as attachment_count,
           (SELECT count(*) FROM task_comments WHERE task_id = t.id) as comment_count,
           (SELECT count(*) FROM task_transfer_requests WHERE task_id = t.id AND status = 'pending') as pending_transfer_count
    FROM tasks t
    JOIN users u_assigner ON t.assigner_id = u_assigner.id
    JOIN users u_assignee ON t.assignee_id = u_assignee.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  // Permission filtering: "Việc của ai người đó xem"
  if (!isAdmin) {
    // Normal user can only see tasks where they are assigner, assignee, or follower
    baseQuery += `
      AND (
        t.assigner_id = ? 
        OR t.assignee_id = ? 
        OR EXISTS (SELECT 1 FROM task_followers tf WHERE tf.task_id = t.id AND tf.user_id = ?)
      )
    `;
    params.push(user.id, user.id, user.id);
  }

  // Scope filtering
  if (scope === 'assigned_to_me') {
    baseQuery += ' AND t.assignee_id = ? AND t.is_personal = 0';
    params.push(user.id);
  } else if (scope === 'created_by_me') {
    baseQuery += ' AND t.assigner_id = ? AND t.assignee_id != ? AND t.is_personal = 0';
    params.push(user.id, user.id);
  } else if (scope === 'following') {
    baseQuery += ' AND EXISTS (SELECT 1 FROM task_followers tf WHERE tf.task_id = t.id AND tf.user_id = ?)';
    params.push(user.id);
  } else if (scope === 'personal') {
    baseQuery += ' AND t.is_personal = 1 AND t.assignee_id = ?';
    params.push(user.id);
  } else if (scope === 'overdue') {
    const today = new Date().toISOString().slice(0, 10);
    baseQuery += " AND t.due_date < ? AND t.status != 'completed' AND t.status != 'cancelled'";
    params.push(today);
  }

  // Status filter
  if (status && status !== 'all') {
    baseQuery += ' AND t.status = ?';
    params.push(status);
  }

  // Category filter
  if (category && category !== 'all') {
    baseQuery += ' AND t.category = ?';
    params.push(category);
  }

  // Priority filter
  if (priority && priority !== 'all') {
    baseQuery += ' AND t.priority = ?';
    params.push(priority);
  }

  // Department filter
  if (department_id && department_id !== 'all') {
    baseQuery += ' AND t.department_id = ?';
    params.push(department_id);
  }

  // Search by title or description
  if (search && search.trim()) {
    baseQuery += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  baseQuery += ' ORDER BY t.created_at DESC';

  const tasks = db.prepare(baseQuery).all(...params);
  res.json(tasks);
});

// POST /api/tasks - Create task with file attachments
router.post('/', authMiddleware, upload.array('files', 10), (req, res) => {
  const {
    title,
    description,
    category,
    priority,
    start_date,
    due_date,
    assignee_id,
    department_id,
    is_personal,
    followers
  } = req.body;

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Tiêu đề và hạn chót hoàn thành là bắt buộc.' });
  }

  const user = req.user;
  const isPersonalNum = (is_personal === 'true' || is_personal === '1' || is_personal === true) ? 1 : 0;
  const targetAssigneeId = isPersonalNum ? user.id : (assignee_id ? parseInt(assignee_id) : user.id);

  try {
    const insertTask = db.prepare(`
      INSERT INTO tasks (
        title, description, category, priority, status, progress,
        start_date, due_date, assigner_id, assignee_id, department_id, is_personal
      ) VALUES (?, ?, ?, ?, 'todo', 0, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertTask.run(
      title.trim(),
      description ? description.trim() : '',
      category || (isPersonalNum ? 'Việc cá nhân' : 'Chuyên môn GDMN'),
      priority || 'medium',
      start_date || new Date().toISOString().slice(0, 10),
      due_date,
      user.id,
      targetAssigneeId,
      department_id ? parseInt(department_id) : null,
      isPersonalNum
    );

    const taskId = result.lastInsertRowid;

    // Handle followers
    if (followers && !isPersonalNum) {
      let followerIds = [];
      try {
        followerIds = typeof followers === 'string' ? JSON.parse(followers) : followers;
      } catch (e) {
        followerIds = [followers];
      }

      const insertFollower = db.prepare('INSERT OR IGNORE INTO task_followers (task_id, user_id) VALUES (?, ?)');
      const insertNoti = db.prepare(`
        INSERT INTO notifications (user_id, task_id, title, message, type)
        VALUES (?, ?, ?, ?, 'task_assigned')
      `);

      followerIds.forEach(fid => {
        const idNum = parseInt(fid);
        if (idNum && idNum !== targetAssigneeId && idNum !== user.id) {
          insertFollower.run(taskId, idNum);
          insertNoti.run(
            idNum,
            taskId,
            'Được thêm vào theo dõi công việc',
            `${user.full_name} đã thêm Thầy/Cô làm người theo dõi công việc "${title}".`
          );
        }
      });
    }

    // Notify assignee if not assigning to self
    if (targetAssigneeId !== user.id && !isPersonalNum) {
      db.prepare(`
        INSERT INTO notifications (user_id, task_id, title, message, type)
        VALUES (?, ?, ?, ?, 'task_assigned')
      `).run(
        targetAssigneeId,
        taskId,
        'Bạn được giao công việc mới',
        `${user.full_name} đã giao cho Thầy/Cô công việc "${title}" (Hạn chót: ${due_date}).`
      );
    }

    // Handle attachments
    if (req.files && req.files.length > 0) {
      const insertAttachment = db.prepare(`
        INSERT INTO task_attachments (
          task_id, uploader_id, filename, original_name, file_path, file_size, file_type, is_result_document
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `);

      req.files.forEach(file => {
        insertAttachment.run(
          taskId,
          user.id,
          file.filename,
          Buffer.from(file.originalname, 'latin1').toString('utf8'), // handle utf8 vietnamese file names
          file.path,
          file.size,
          file.mimetype
        );
      });
    }

    res.status(201).json({
      message: 'Tạo công việc thành công!',
      taskId
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi tạo công việc: ' + error.message });
  }
});

// GET /api/tasks/:id - Get full task details
router.get('/:id', authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = db.prepare(`
    SELECT t.*, 
           u_assigner.full_name as assigner_name,
           u_assigner.position as assigner_position,
           u_assignee.full_name as assignee_name,
           u_assignee.position as assignee_position,
           d.name as department_name
    FROM tasks t
    JOIN users u_assigner ON t.assigner_id = u_assigner.id
    JOIN users u_assignee ON t.assignee_id = u_assignee.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.id = ?
  `).get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  }

  // Check access permission
  if (!canUserViewTask(req.user, task)) {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập vào công việc này.' });
  }

  // Get followers
  const followers = db.prepare(`
    SELECT tf.user_id, u.full_name, u.position, u.degree, d.name as department_name
    FROM task_followers tf
    JOIN users u ON tf.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE tf.task_id = ?
  `).all(taskId);

  // Get attachments
  const attachments = db.prepare(`
    SELECT ta.*, u.full_name as uploader_name
    FROM task_attachments ta
    JOIN users u ON ta.uploader_id = u.id
    WHERE ta.task_id = ?
    ORDER BY ta.created_at ASC
  `).all(taskId);

  // Get comments & progress history
  const comments = db.prepare(`
    SELECT tc.*, u.full_name as author_name, u.position as author_position
    FROM task_comments tc
    JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ?
    ORDER BY tc.created_at ASC
  `).all(taskId);

  // Get transfer requests
  const transferRequests = db.prepare(`
    SELECT ttr.*, 
           u_req.full_name as requester_name,
           u_target.full_name as target_name,
           u_rev.full_name as reviewer_name
    FROM task_transfer_requests ttr
    JOIN users u_req ON ttr.requester_id = u_req.id
    JOIN users u_target ON ttr.target_user_id = u_target.id
    LEFT JOIN users u_rev ON ttr.reviewed_by = u_rev.id
    WHERE ttr.task_id = ?
    ORDER BY ttr.created_at DESC
  `).all(taskId);

  res.json({
    ...task,
    followers,
    attachments,
    comments,
    transferRequests
  });
});

// PUT /api/tasks/:id - Update progress, status, or basic info
router.put('/:id', authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  }

  const user = req.user;
  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';
  const isAssigner = task.assigner_id === user.id;
  const isAssignee = task.assignee_id === user.id;

  if (!isAdmin && !isAssigner && !isAssignee) {
    return res.status(403).json({ error: 'Bạn không có quyền cập nhật công việc này.' });
  }

  const { progress, status, title, description, priority, due_date } = req.body;

  let newProgress = progress !== undefined ? parseInt(progress) : task.progress;
  let newStatus = status || task.status;

  // Auto update status if progress reaches 100%
  if (newProgress === 100 && newStatus !== 'completed') {
    newStatus = 'pending_approval'; // Chờ người giao nghiệm thu
  }

  const completedAt = (newStatus === 'completed' && !task.completed_at) ? new Date().toISOString() : task.completed_at;

  // If assigner or admin, allow editing details
  let newTitle = (isAdmin || isAssigner) && title ? title.trim() : task.title;
  let newDesc = (isAdmin || isAssigner) && description !== undefined ? description : task.description;
  let newPriority = (isAdmin || isAssigner) && priority ? priority : task.priority;
  let newDueDate = (isAdmin || isAssigner) && due_date ? due_date : task.due_date;

  db.prepare(`
    UPDATE tasks 
    SET title = ?, description = ?, priority = ?, due_date = ?,
        progress = ?, status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newTitle, newDesc, newPriority, newDueDate, newProgress, newStatus, completedAt, taskId);

  // Send notification to assigner if completed or pending approval
  if (isAssignee && !isAssigner) {
    if (newStatus === 'pending_approval' || newStatus === 'completed') {
      db.prepare(`
        INSERT INTO notifications (user_id, task_id, title, message, type)
        VALUES (?, ?, ?, ?, 'task_status_changed')
      `).run(
        task.assigner_id,
        taskId,
        'Báo cáo hoàn thành công việc',
        `${user.full_name} đã báo cáo hoàn thành công việc "${task.title}". Vui lòng nghiệm thu & đánh giá.`
      );
    }
  }

  res.json({ message: 'Cập nhật công việc thành công!' });
});

// POST /api/tasks/:id/comments - Add comment or progress note
router.post('/:id/comments', authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });

  if (!canUserViewTask(req.user, task)) {
    return res.status(403).json({ error: 'Bạn không có quyền tham gia công việc này.' });
  }

  const { comment, progress } = req.body;
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Nội dung bình luận không được để trống.' });
  }

  const progressUpdate = progress !== undefined && progress !== null ? parseInt(progress) : null;

  db.prepare(`
    INSERT INTO task_comments (task_id, user_id, comment, progress_update)
    VALUES (?, ?, ?, ?)
  `).run(taskId, req.user.id, comment.trim(), progressUpdate);

  // If progress provided and user is assignee, update task progress
  if (progressUpdate !== null && (req.user.id === task.assignee_id || req.user.role === 'admin')) {
    let newStatus = task.status;
    if (progressUpdate === 100) newStatus = 'pending_approval';
    else if (progressUpdate > 0 && task.status === 'todo') newStatus = 'in_progress';

    db.prepare(`
      UPDATE tasks SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(progressUpdate, newStatus, taskId);
  }

  res.json({ message: 'Đã gửi trao đổi thành công!' });
});

// POST /api/tasks/:id/attachments - Upload additional documents or result submission
router.post('/:id/attachments', authMiddleware, upload.array('files', 10), (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });

  if (!canUserViewTask(req.user, task)) {
    return res.status(403).json({ error: 'Bạn không có quyền thao tác trên công việc này.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Chưa có tệp nào được chọn.' });
  }

  const isResult = (req.body.is_result_document === 'true' || req.body.is_result_document === '1') ? 1 : 0;

  const insertAttachment = db.prepare(`
    INSERT INTO task_attachments (
      task_id, uploader_id, filename, original_name, file_path, file_size, file_type, is_result_document
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  req.files.forEach(file => {
    insertAttachment.run(
      taskId,
      req.user.id,
      file.filename,
      Buffer.from(file.originalname, 'latin1').toString('utf8'),
      file.path,
      file.size,
      file.mimetype,
      isResult
    );
  });

  // If uploading result submission, add log comment
  if (isResult) {
    db.prepare(`
      INSERT INTO task_comments (task_id, user_id, comment)
      VALUES (?, ?, ?)
    `).run(
      taskId,
      req.user.id,
      `📎 Đã nộp ${req.files.length} tệp tài liệu kết quả/sản phẩm công việc.`
    );
  }

  res.json({ message: 'Tải lên tài liệu thành công!' });
});

// POST /api/tasks/:id/transfer - Propose task transfer (only assignee can propose)
router.post('/:id/transfer', authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });

  const user = req.user;
  if (task.assignee_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ người đang trực tiếp xử lý công việc mới có thể đề xuất chuyển giao.' });
  }

  const { target_user_id, reason } = req.body;
  if (!target_user_id || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'Vui lòng chọn người nhận chuyển giao và nhập lý do rõ ràng.' });
  }

  const targetIdNum = parseInt(target_user_id);
  if (targetIdNum === task.assignee_id) {
    return res.status(400).json({ error: 'Người nhận chuyển giao phải khác người đang xử lý hiện tại.' });
  }

  const targetUser = db.prepare('SELECT full_name FROM users WHERE id = ?').get(targetIdNum);
  if (!targetUser) {
    return res.status(400).json({ error: 'Người nhận được chọn không tồn tại.' });
  }

  // Create transfer request
  const result = db.prepare(`
    INSERT INTO task_transfer_requests (task_id, requester_id, target_user_id, reason, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(taskId, user.id, targetIdNum, reason.trim());

  // Notify Assigner (Người giao việc)
  db.prepare(`
    INSERT INTO notifications (user_id, task_id, title, message, type)
    VALUES (?, ?, ?, ?, 'transfer_request')
  `).run(
    task.assigner_id,
    taskId,
    'Đề xuất chuyển giao người xử lý',
    `${user.full_name} đề xuất chuyển công việc "${task.title}" cho Thầy/Cô ${targetUser.full_name}. Lý do: ${reason.trim()}`
  );

  res.json({
    message: 'Đã gửi đề xuất chuyển giao tới Người giao việc để phê duyệt.',
    requestId: result.lastInsertRowid
  });
});

// POST /api/tasks/:id/transfer/:requestId/review - Approve or reject transfer
router.post('/:id/transfer/:requestId/review', authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const requestId = parseInt(req.params.requestId);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });

  const transferReq = db.prepare('SELECT * FROM task_transfer_requests WHERE id = ? AND task_id = ?').get(requestId, taskId);
  if (!transferReq) return res.status(404).json({ error: 'Không tìm thấy yêu cầu chuyển giao này.' });

  const user = req.user;
  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';
  const isAssigner = task.assigner_id === user.id;

  if (!isAdmin && !isAssigner) {
    return res.status(403).json({ error: 'Chỉ Người giao việc hoặc Admin mới có quyền phê duyệt chuyển giao công việc.' });
  }

  const { status, review_note } = req.body; // status: 'approved' or 'rejected'
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Trạng thái xét duyệt phải là approved hoặc rejected.' });
  }

  db.prepare(`
    UPDATE task_transfer_requests 
    SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, review_note || '', user.id, requestId);

  const oldAssignee = db.prepare('SELECT full_name FROM users WHERE id = ?').get(transferReq.requester_id);
  const newAssignee = db.prepare('SELECT full_name FROM users WHERE id = ?').get(transferReq.target_user_id);

  if (status === 'approved') {
    // Update task assignee
    db.prepare('UPDATE tasks SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(transferReq.target_user_id, taskId);

    // Add comment to task history
    db.prepare(`
      INSERT INTO task_comments (task_id, user_id, comment)
      VALUES (?, ?, ?)
    `).run(
      taskId,
      user.id,
      `✅ Đã phê duyệt chuyển giao công việc từ [${oldAssignee.full_name}] sang [${newAssignee.full_name}]. Ghi chú: ${review_note || 'Đồng ý chuyển giao'}`
    );

    // Notify old assignee
    db.prepare(`
      INSERT INTO notifications (user_id, task_id, title, message, type)
      VALUES (?, ?, ?, ?, 'transfer_result')
    `).run(
      transferReq.requester_id,
      taskId,
      'Đề xuất chuyển giao được phê duyệt',
      `Đề xuất chuyển công việc "${task.title}" sang Thầy/Cô ${newAssignee.full_name} đã được ${user.full_name} chấp thuận.`
    );

    // Notify new assignee
    db.prepare(`
      INSERT INTO notifications (user_id, task_id, title, message, type)
      VALUES (?, ?, ?, ?, 'task_assigned')
    `).run(
      transferReq.target_user_id,
      taskId,
      'Tiếp nhận công việc được chuyển giao',
      `Thầy/Cô đã được chuyển giao phụ trách chính công việc "${task.title}" từ Thầy/Cô ${oldAssignee.full_name}.`
    );
  } else {
    // Notify rejected
    db.prepare(`
      INSERT INTO notifications (user_id, task_id, title, message, type)
      VALUES (?, ?, ?, ?, 'transfer_result')
    `).run(
      transferReq.requester_id,
      taskId,
      'Đề xuất chuyển giao bị từ chối',
      `Đề xuất chuyển việc "${task.title}" chưa được chấp thuận. Lý do: ${review_note || 'Không đồng ý'}`
    );
  }

  res.json({ message: status === 'approved' ? 'Đã phê duyệt chuyển giao công việc thành công!' : 'Đã từ chối yêu cầu chuyển giao.' });
});

// POST /api/tasks/:id/evaluate - Evaluate task KPI
router.post('/:id/evaluate', authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });

  const user = req.user;
  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';
  const isAssigner = task.assigner_id === user.id;

  if (!isAdmin && !isAssigner) {
    return res.status(403).json({ error: 'Chỉ Người giao việc hoặc Admin mới có quyền đánh giá hiệu suất công việc.' });
  }

  const { kpi_score, kpi_evaluation, kpi_note } = req.body;

  db.prepare(`
    UPDATE tasks 
    SET kpi_score = ?, kpi_evaluation = ?, kpi_note = ?, status = 'completed', progress = 100,
        completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    kpi_score !== undefined ? parseFloat(kpi_score) : null,
    kpi_evaluation || 'Đạt',
    kpi_note || '',
    taskId
  );

  // Notify assignee
  db.prepare(`
    INSERT INTO notifications (user_id, task_id, title, message, type)
    VALUES (?, ?, ?, ?, 'kpi_evaluated')
  `).run(
    task.assignee_id,
    taskId,
    'Công việc đã được nghiệm thu & đánh giá',
    `${user.full_name} đã đánh giá công việc "${task.title}": Xếp loại ${kpi_evaluation || 'Đạt'} (${kpi_score || ''} điểm).`
  );

  res.json({ message: 'Đánh giá nghiệm thu công việc thành công!' });
});

module.exports = router;

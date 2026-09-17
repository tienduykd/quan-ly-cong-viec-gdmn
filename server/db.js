const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'quanlycongviec.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDb() {
  // 1. Departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      birth_date TEXT,
      degree TEXT,
      position TEXT,
      gender TEXT,
      department_id INTEGER,
      phone TEXT,
      zalo_phone TEXT,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'lecturer', -- 'admin', 'leader', 'lecturer'
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );
  `);

  // 3. System Settings (e.g. Zalo Webhook, cron time)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'Chuyên môn GDMN',
      priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
      status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'pending_approval', 'completed', 'cancelled'
      progress INTEGER NOT NULL DEFAULT 0, -- 0 to 100%
      start_date TEXT,
      due_date TEXT NOT NULL,
      completed_at DATETIME,
      assigner_id INTEGER NOT NULL,
      assignee_id INTEGER NOT NULL,
      department_id INTEGER,
      is_personal INTEGER NOT NULL DEFAULT 0,
      kpi_score REAL DEFAULT NULL,
      kpi_evaluation TEXT DEFAULT NULL,
      kpi_note TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigner_id) REFERENCES users(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );
  `);

  // 5. Task Followers (Người theo dõi: xem được nhưng không xử lý)
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_followers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6. Task Attachments (Tài liệu đính kèm khi tạo hoặc nộp kết quả)
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      uploader_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      is_result_document INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );
  `);

  // 7. Task Transfer Requests (Chuyển người xử lý có phê duyệt của Người giao việc)
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_transfer_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      review_note TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);

  // 8. Task Comments & Progress Updates
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      progress_update INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 9. Notifications (In-App notifications)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // 10. Zalo Message Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS zalo_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      response_data TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();
}

function seedData() {
  // Seed Departments
  const deptCount = db.prepare('SELECT count(*) as count FROM departments').get().count;
  if (deptCount === 0) {
    const insertDept = db.prepare(`
      INSERT INTO departments (name, code, description) VALUES (?, ?, ?)
    `);
    insertDept.run('Tổ Phương pháp', 'PP', 'Tổ Phương pháp giảng dạy chuyên ngành GDMN');
    insertDept.run('Tổ Tâm lý - Giáo dục', 'TLGD', 'Tổ Tâm lý - Giáo dục học Mầm non');
    insertDept.run('Tổ Nghiệp vụ sư phạm (NVSP)', 'NVSP', 'Tổ Nghiệp vụ Sư phạm và Rèn nghề');
    insertDept.run('Tổ Giáo dục Nghệ thuật', 'GDNT', 'Tổ Giáo dục Thể chất & Nghệ thuật');
  }

  // Get department map
  const depts = db.prepare('SELECT id, name FROM departments').all();
  const deptMap = {};
  depts.forEach(d => {
    if (d.name.includes('Phương pháp')) deptMap['PP'] = d.id;
    if (d.name.includes('Tâm lý')) deptMap['TLGD'] = d.id;
    if (d.name.includes('NVSP')) deptMap['NVSP'] = d.id;
    if (d.name.includes('Nghệ thuật')) deptMap['GDNT'] = d.id;
  });

  // Seed 21 Users
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    const rawUsers = [
      // Tổ Phương pháp
      { stt: 1, name: 'Đặng Út Phượng', dob: '04/02/1987', degree: 'Tiến sĩ GDH (GDMN)', pos: 'GĐ, GVC', gender: 'Nữ', dept: 'PP', username: 'dangutphuong', pass: 'phuong123', role: 'admin' },
      { stt: 2, name: 'Nguyễn Công Trường', dob: '01/03/1983', degree: 'Tiến sĩ GD Thể chất', pos: 'PGĐ', gender: 'Nam', dept: 'PP', username: 'nguyencongtruong', pass: 'truong123', role: 'leader' },
      { stt: 3, name: 'Nguyễn Thanh Huyền', dob: '17/07/1986', degree: 'Tiến sĩ Văn học', pos: 'GVC', gender: 'Nữ', dept: 'PP', username: 'nguyenthanhhuyen', pass: 'huyen123', role: 'lecturer' },
      { stt: 4, name: 'Hoàng Thu Huyền', dob: '31/12/1991', degree: 'Thạc sĩ GDMN (NCS)', pos: 'GV', gender: 'Nữ', dept: 'PP', username: 'hoangthuhuyen', pass: 'huyen123', role: 'lecturer' },
      { stt: 5, name: 'Dương Thị Thanh Thảo', dob: '22/04/1976', degree: 'Thạc sĩ Sinh học', pos: 'GVC', gender: 'Nữ', dept: 'PP', username: 'duongthithanhthao', pass: 'thao123', role: 'lecturer' },

      // Tổ Tâm lý - Giáo dục
      { stt: 6, name: 'Nguyễn Thị Huyền', dob: '20/11/1979', degree: 'Tiến sĩ Giáo dục học', pos: 'PGĐ, GV', gender: 'Nữ', dept: 'TLGD', username: 'nguyenthihuyen', pass: 'huyen123', role: 'leader' },
      { stt: 7, name: 'Đặng Lan Phương', dob: '13/05/1970', degree: 'Tiến sĩ GDH (GDMN)', pos: 'GVC', gender: 'Nữ', dept: 'TLGD', username: 'danglanphuong', pass: 'phuong123', role: 'lecturer' },
      { stt: 8, name: 'Nguyễn Thị Thúy Hạnh', dob: '19/07/1970', degree: 'Tiến sĩ Tâm lí học', pos: 'GVC', gender: 'Nữ', dept: 'TLGD', username: 'nguyenthithuyhanh', pass: 'hanh123', role: 'lecturer' },
      { stt: 9, name: 'Vũ Thúy Hoàn', dob: '08/08/1977', degree: 'Tiến sĩ Tâm lí học', pos: 'GVC', gender: 'Nữ', dept: 'TLGD', username: 'vuthuyhoan', pass: 'hoan123', role: 'lecturer' },
      { stt: 10, name: 'Cao Thị Lan Hương', dob: '18/06/1988', degree: 'Thạc sĩ GDMN', pos: 'GV', gender: 'Nữ', dept: 'TLGD', username: 'caothilanhuong', pass: 'huong123', role: 'lecturer' },

      // Tổ Nghiệp vụ sư phạm (NVSP)
      { stt: 11, name: 'Lê Thị Hòa', dob: '30/10/1988', degree: 'Thạc sĩ GDMN (NCS)', pos: 'PGĐ, GV', gender: 'Nữ', dept: 'NVSP', username: 'lethihoa', pass: 'hoa123', role: 'leader' },
      { stt: 12, name: 'Đinh Lan Anh', dob: '18/11/1995', degree: 'Thạc sĩ GDMN (NCS)', pos: 'GV', gender: 'Nữ', dept: 'NVSP', username: 'dinhlananh', pass: 'anh123', role: 'lecturer' },
      { stt: 13, name: 'Nguyễn Lệ Thương', dob: '01/12/1975', degree: 'Thạc sĩ GDMN', pos: 'GV', gender: 'Nữ', dept: 'NVSP', username: 'nguyenlethuong', pass: 'thuong123', role: 'lecturer' },
      { stt: 14, name: 'Nguyễn Thị Vinh', dob: '30/12/1984', degree: 'Thạc sĩ GDMN', pos: 'GV', gender: 'Nữ', dept: 'NVSP', username: 'nguyenthivinh', pass: 'vinh123', role: 'lecturer' },
      { stt: 15, name: 'Nguyễn Thị Yến', dob: '09/10/1976', degree: 'Thạc sĩ GDMN', pos: 'GV', gender: 'Nữ', dept: 'NVSP', username: 'nguyenthiyen', pass: 'yen123', role: 'lecturer' },

      // Tổ Giáo dục Nghệ thuật
      { stt: 16, name: 'Hà Thị Cẩm Nhung', dob: '22/07/1980', degree: 'Thạc sĩ GDMN', pos: 'Phó khoa SP, GV', gender: 'Nữ', dept: 'GDNT', username: 'hathicamnhung', pass: 'nhung123', role: 'leader' },
      { stt: 17, name: 'Đỗ Thị Mai An', dob: '17/06/1975', degree: 'Thạc sĩ Văn hóa học', pos: 'GV', gender: 'Nữ', dept: 'GDNT', username: 'dothimaian', pass: 'an123', role: 'lecturer' },
      { stt: 18, name: 'Ngô Thanh Hương', dob: '28/07/1985', degree: 'Thạc sĩ Văn hóa học', pos: 'GV', gender: 'Nữ', dept: 'GDNT', username: 'ngothanhhuong', pass: 'huong123', role: 'lecturer' },
      { stt: 19, name: 'Lê Thanh Huyền', dob: '08/06/1987', degree: 'Thạc sĩ LL và PPDH BM Âm nhạc', pos: 'GV, NT', gender: 'Nữ', dept: 'GDNT', username: 'lethanhhuyen', pass: 'huyen123', role: 'leader' },
      { stt: 20, name: 'Hà Trọng Kiều', dob: '14/06/1970', degree: 'Thạc sĩ LL và PPDH BM Âm nhạc', pos: 'GV', gender: 'Nam', dept: 'GDNT', username: 'hatrongkieu', pass: 'kieu123', role: 'lecturer' },
      { stt: 21, name: 'Trần Thị Mẫn', dob: '03/01/1983', degree: 'Thạc sĩ LL và PPDH BM Âm nhạc', pos: 'GV', gender: 'Nữ', dept: 'GDNT', username: 'tranthiman', pass: 'man123', role: 'lecturer' }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (
        username, password_hash, full_name, birth_date, degree,
        position, gender, department_id, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saltRounds = 10;
    rawUsers.forEach(u => {
      const hash = bcrypt.hashSync(u.pass, saltRounds);
      const deptId = deptMap[u.dept] || null;
      insertUser.run(
        u.username,
        hash,
        u.name,
        u.dob,
        u.degree,
        u.pos,
        u.gender,
        deptId,
        u.role
      );
    });
    console.log('Successfully seeded 21 users for GDMN program!');
  }

  // Seed default settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)
  `);
  insertSetting.run('zalo_webhook_url', '', 'URL Webhook Zalo Bot để gửi tin nhắn vào nhóm chung');
  insertSetting.run('zalo_enabled', '0', '1 để kích hoạt tự động gửi tin nhắn Zalo, 0 để tắt');
  insertSetting.run('daily_reminder_time', '07:30', 'Giờ nhắc việc tự động mỗi sáng (HH:mm)');
  insertSetting.run('app_name', 'Phần mềm hỗ trợ quản lý công việc - Ngành GDMN', 'Tên chính thức của phần mềm');

  // Seed realistic tasks for GDMN
  const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get().count;
  if (taskCount === 0) {
    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('dangutphuong');
    const user2 = db.prepare('SELECT id FROM users WHERE username = ?').get('nguyencongtruong');
    const user3 = db.prepare('SELECT id FROM users WHERE username = ?').get('nguyenthanhhuyen');
    const user4 = db.prepare('SELECT id FROM users WHERE username = ?').get('lethanhhuyen');

    if (adminUser && user2 && user3) {
      const insertTask = db.prepare(`
        INSERT INTO tasks (
          title, description, category, priority, status, progress,
          start_date, due_date, assigner_id, assignee_id, department_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const t1 = insertTask.run(
        'Rà soát và cập nhật đề cương chi tiết các học phần chuyên ngành GDMN HK1',
        'Các giảng viên phụ trách môn tiến hành rà soát chuẩn đầu ra (CLO) đối sánh với PLO của CTĐT ngành GDMN, cập nhật tài liệu tham khảo và hình thức đánh giá.',
        'Chuyên môn GDMN',
        'high',
        'in_progress',
        60,
        new Date().toISOString().slice(0, 10),
        new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        adminUser.id,
        user2.id,
        1
      );

      const insertFollower = db.prepare('INSERT OR IGNORE INTO task_followers (task_id, user_id) VALUES (?, ?)');
      insertFollower.run(t1.lastInsertRowid, user3.id);
      if (user4) insertFollower.run(t1.lastInsertRowid, user4.id);

      const t2 = insertTask.run(
        'Lập kế hoạch phân công hướng dẫn Thực tập Sư phạm tại các trường mầm non liên kết',
        'Liên hệ với các trường Mầm non thực hành để lên danh sách giảng viên hướng dẫn và lịch đi thực tế rèn nghề của sinh viên khóa K46.',
        'Rèn NVSP',
        'urgent',
        'todo',
        15,
        new Date().toISOString().slice(0, 10),
        new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        adminUser.id,
        user3.id,
        3
      );
      if (user2) insertFollower.run(t2.lastInsertRowid, user2.id);

      insertTask.run(
        'Tổng hợp minh chứng tự đánh giá CTĐT Mầm non phục vụ kiểm định chất lượng',
        'Hoàn thiện hồ sơ minh chứng tiêu chuẩn 3 và tiêu chuẩn 5 cho đợt khảo sát chính thức của Trung tâm KĐCLGD.',
        'Việc cá nhân',
        'high',
        'in_progress',
        40,
        new Date().toISOString().slice(0, 10),
        new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        adminUser.id,
        adminUser.id,
        1
      );
    }
  }
}

initDb();

module.exports = db;

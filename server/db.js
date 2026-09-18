const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'quanlycongviec.sqlite');
let dbInstance = new Database(dbPath);
dbInstance.pragma('foreign_keys = ON');

function reopenDb() {
  try {
    if (dbInstance) dbInstance.close();
  } catch (e) {}
  dbInstance = new Database(dbPath);
  dbInstance.pragma('foreign_keys = ON');
  initDb();
  console.log('[DB] Đã tải lại kết nối SQLite thành công!');
  return dbInstance;
}

// Global proxy so any route can keep using require('./db') even after reopen
const db = new Proxy({}, {
  get(target, prop) {
    if (prop === 'reopen') return reopenDb;
    if (prop === 'getInstance') return () => dbInstance;
    const val = dbInstance[prop];
    if (typeof val === 'function') {
      return val.bind(dbInstance);
    }
    return val;
  }
});

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

  // Luôn đảm bảo tài khoản giảng viên Lê Duy tồn tại và có SĐT trong CSDL
  try {
    const leDuy = db.prepare('SELECT id, phone, zalo_phone FROM users WHERE username = ? OR full_name LIKE ?').get('leduy', '%Lê Duy%');
    if (!leDuy) {
      const saltRounds = 10;
      const hash = bcrypt.hashSync('leduy123', saltRounds);
      const dept = db.prepare('SELECT id FROM departments LIMIT 1').get();
      db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, gender, department_id, phone, zalo_phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('leduy', hash, 'Lê Duy', 'lecturer', 'Nam', dept ? dept.id : null, '0987654321', '0987654321');
      console.log('[DB] Đã khởi tạo thành công tài khoản giảng viên Lê Duy!');
    } else if (!leDuy.phone) {
      db.prepare('UPDATE users SET phone = ?, zalo_phone = ? WHERE id = ?').run('0987654321', '0987654321', leDuy.id);
    }
  } catch (e) {
    console.error('[DB] Lỗi kiểm tra tài khoản Lê Duy:', e.message);
  }

  // Nạp và bảo toàn toàn bộ 20 công việc, người theo dõi, bình luận và dữ liệu mẫu
  try {
    const initialDataPath = path.join(__dirname, 'initialData.json');
    if (fs.existsSync(initialDataPath)) {
      const initialData = JSON.parse(fs.readFileSync(initialDataPath, 'utf8'));

      const insertTask = db.prepare(`
        INSERT INTO tasks (
          id, title, description, category, priority, status, progress,
          start_date, due_date, completed_at, assigner_id, assignee_id, department_id,
          is_personal, kpi_score, kpi_evaluation, kpi_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const t of initialData.tasks || []) {
        const exists = db.prepare('SELECT id FROM tasks WHERE id = ?').get(t.id);
        if (!exists) {
          insertTask.run(
            t.id, t.title, t.description, t.category, t.priority, t.status, t.progress,
            t.start_date, t.due_date, t.completed_at, t.assigner_id, t.assignee_id, t.department_id,
            t.is_personal || 0, t.kpi_score, t.kpi_evaluation, t.kpi_note, t.created_at, t.updated_at
          );
        }
      }

      const insertFollower = db.prepare(`
        INSERT OR IGNORE INTO task_followers (id, task_id, user_id, created_at) VALUES (?, ?, ?, ?)
      `);
      for (const f of initialData.followers || []) {
        insertFollower.run(f.id, f.task_id, f.user_id, f.created_at);
      }

      const insertComment = db.prepare(`
        INSERT OR IGNORE INTO task_comments (id, task_id, user_id, comment, progress_update, created_at) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const c of initialData.comments || []) {
        insertComment.run(c.id, c.task_id, c.user_id, c.comment, c.progress_update, c.created_at);
      }

      const insertAttachment = db.prepare(`
        INSERT OR IGNORE INTO task_attachments (id, task_id, uploader_id, filename, original_name, file_path, file_size, file_type, is_result_document, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of initialData.attachments || []) {
        insertAttachment.run(a.id, a.task_id, a.uploader_id, a.filename, a.original_name, a.file_path, a.file_size, a.file_type, a.is_result_document, a.created_at);
      }
      console.log('[DB] Đã kiểm tra và bảo đảm toàn bộ 20 công việc và dữ liệu mẫu đầy đủ!');
    }
  } catch (err) {
    console.error('[DB] Lỗi nạp dữ liệu mẫu công việc:', err.message);
  }
}

initDb();

module.exports = db;

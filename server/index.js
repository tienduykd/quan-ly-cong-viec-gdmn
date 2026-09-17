const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const supabaseService = require('./supabaseService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Automatic Supabase Auto-Sync on any mutating API call
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!req.path.includes('/supabase/')) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          supabaseService.scheduleAutoSync(3000);
        }
      });
    }
  }
  next();
});

// Static uploads folder for file attachments
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check & Anti-Sleep Ping
app.get(['/ping', '/api/ping', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'alive',
    appName: 'Phần mềm hỗ trợ quản lý công việc - Ngành GDMN',
    time: new Date().toISOString()
  });
});

async function startServer() {
  // 1. Initialize Supabase Sync Service
  supabaseService.init();

  // 2. If Supabase is configured, pull latest DB & Zalo session BEFORE opening DB!
  if (supabaseService.client) {
    try {
      console.log('[SERVER] Đang kiểm tra và tải CSDL mới nhất từ Supabase Cloud...');
      const pulled = await supabaseService.pullFromSupabase();
      if (pulled) {
        console.log('[SERVER] Đã đồng bộ khôi phục dữ liệu mới nhất từ Supabase Cloud thành công!');
      }
    } catch (err) {
      console.error('[SUPABASE] Khởi động khôi phục thất bại:', err.message);
    }
  }

  // 3. Initialize DB module (opens freshly pulled SQLite file)
  const db = require('./db');
  if (!supabaseService.client) {
    supabaseService.init(db);
    if (supabaseService.client) {
      try {
        const pulled = await supabaseService.pullFromSupabase();
        if (pulled) {
          db.reopen();
        }
      } catch (err) {}
    }
  }

  // 4. Load routes
  const authRoutes = require('./routes/authRoutes');
  const taskRoutes = require('./routes/taskRoutes');
  const userRoutes = require('./routes/userRoutes');
  const notificationRoutes = require('./routes/notificationRoutes');
  const statsRoutes = require('./routes/statsRoutes');
  const zaloRoutes = require('./routes/zaloRoutes');
  const zaloPersonalRoutes = require('./routes/zaloPersonalRoutes');
  const supabaseRoutes = require('./routes/supabaseRoutes');

  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/zalo', zaloRoutes);
  app.use('/api/zalo-personal', zaloPersonalRoutes);
  app.use('/api/supabase', supabaseRoutes);

  // Serve frontend dist if exists
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Start background cron scheduler (07:30 daily reminders)
  const { startCronJobs } = require('./cron');
  startCronJobs();

  // 6. Start anti-sleep keep alive worker for cloud deployment
  const { startKeepAlive } = require('./keepAlive');
  startKeepAlive();

  // 7. Initialize personal Zalo bot session (run AFTER pulling session from Supabase)
  const zaloPersonalService = require('./zaloPersonalService');
  try {
    await zaloPersonalService.init();
    console.log('[ZALO-PERSONAL] Khởi tạo phiên Zalo xong. Trạng thái:', zaloPersonalService.status);
  } catch (err) {
    console.error('[ZALO-PERSONAL] Khởi tạo thất bại:', err.message);
  }

  // 8. Start HTTP server
  app.listen(PORT, () => {
    console.log(`[SERVER] Hệ thống Quản lý công việc GDMN đang chạy tại http://localhost:${PORT}`);
  });
}

// Graceful shutdown: flush changes to Supabase before process exits
const gracefulShutdown = async () => {
  console.log('[SERVER] Đang dừng máy chủ, đồng bộ CSDL lên Supabase...');
  try {
    await supabaseService.pushToSupabase();
  } catch (e) {}
  process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();

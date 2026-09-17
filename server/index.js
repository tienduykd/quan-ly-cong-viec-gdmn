const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure db initialization
require('./db');

const { startCronJobs } = require('./cron');
const { startKeepAlive } = require('./keepAlive');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const zaloRoutes = require('./routes/zaloRoutes');
const zaloPersonalRoutes = require('./routes/zaloPersonalRoutes');
const zaloPersonalService = require('./zaloPersonalService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder for file attachments
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/zalo', zaloRoutes);
app.use('/api/zalo-personal', zaloPersonalRoutes);

// Health check & Anti-Sleep Ping
app.get(['/ping', '/api/ping', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'alive',
    appName: 'Phần mềm hỗ trợ quản lý công việc - Ngành GDMN',
    time: new Date().toISOString()
  });
});

// Serve frontend dist if exists
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start background cron scheduler (07:30 daily reminders)
startCronJobs();

// Start anti-sleep keep alive worker for cloud deployment
startKeepAlive();

// Initialize personal Zalo bot session if saved
zaloPersonalService.init().catch(err => {
  console.error('[ZALO-PERSONAL] Khởi tạo thất bại:', err.message);
});

// Listen
app.listen(PORT, () => {
  console.log(`[SERVER] Hệ thống Quản lý công việc GDMN đang chạy tại http://localhost:${PORT}`);
});

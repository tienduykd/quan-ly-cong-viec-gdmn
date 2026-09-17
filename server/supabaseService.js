const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'gdmn-database';
const DB_FILE = path.join(__dirname, '..', 'data', 'quanlycongviec.sqlite');
const SESSION_FILE = path.join(__dirname, 'zalo_session.json');

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = process.env.SUPABASE_URL || '';
    this.key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    this.status = 'unconfigured';
    this.lastSyncAt = null;
    this.lastSyncError = null;
    this.lastSyncAction = null;
    this.debounceTimer = null;
    this.isSyncing = false;
    this.backupInterval = null;
  }

  init(dbInstance = null) {
    if (!this.url) this.url = process.env.SUPABASE_URL || '';
    if (!this.key) this.key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    // Check config file if exists
    const configPath = path.join(__dirname, '..', 'data', 'supabase_config.json');
    if ((!this.url || !this.key) && fs.existsSync(configPath)) {
      try {
        const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (conf.url && !this.url) this.url = conf.url;
        if (conf.key && !this.key) this.key = conf.key;
      } catch (e) {}
    }

    if ((!this.url || !this.key) && dbInstance) {
      try {
        const urlRow = dbInstance.prepare('SELECT value FROM settings WHERE key = ?').get('supabase_url');
        if (urlRow && urlRow.value) this.url = urlRow.value;
        const keyRow = dbInstance.prepare('SELECT value FROM settings WHERE key = ?').get('supabase_key');
        if (keyRow && keyRow.value) this.key = keyRow.value;
      } catch (e) {}
    }

    if (this.url && this.key) {
      try {
        this.client = createClient(this.url.trim(), this.key.trim(), {
          auth: { persistSession: false }
        });
        this.status = 'configured';
        console.log('[SUPABASE] Đã cấu hình Supabase Client với URL:', this.url);

        if (!this.backupInterval) {
          this.backupInterval = setInterval(() => {
            if (this.client) {
              this.pushToSupabase().catch(e => console.error('[SUPABASE-CRON]', e.message));
            }
          }, 10 * 60 * 1000);
        }
      } catch (err) {
        this.status = 'error';
        this.lastSyncError = err.message;
        console.error('[SUPABASE] Lỗi khởi tạo client:', err.message);
      }
    } else {
      this.status = 'unconfigured';
      console.log('[SUPABASE] Chưa cấu hình SUPABASE_URL hoặc SUPABASE_KEY.');
    }
  }

  async testConnection(testUrl = null, testKey = null) {
    const url = (testUrl || this.url || '').trim();
    const key = (testKey || this.key || '').trim();
    if (!url || !key) {
      return { success: false, error: 'Vui lòng cung cấp SUPABASE_URL và SUPABASE_KEY.' };
    }

    try {
      const client = createClient(url, key, { auth: { persistSession: false } });

      let bucketFound = false;
      let createBucketErr = null;

      // 1. Try listing buckets (works with service_role key)
      try {
        const { data: buckets, error: listBucketsErr } = await client.storage.listBuckets();
        if (!listBucketsErr && buckets) {
          bucketFound = buckets.some(b => b.name === BUCKET_NAME);
          if (!bucketFound) {
            const { error: createErr } = await client.storage.createBucket(BUCKET_NAME, { public: false });
            if (!createErr) {
              bucketFound = true;
            } else {
              createBucketErr = createErr.message;
            }
          }
        } else if (listBucketsErr) {
          createBucketErr = listBucketsErr.message;
        }
      } catch (e) {
        createBucketErr = e.message;
      }

      // 2. Direct check on bucket BUCKET_NAME
      const { data: files, error: listErr } = await client.storage.from(BUCKET_NAME).list('', { limit: 1 });
      if (listErr) {
        const isNotFound = listErr.message?.toLowerCase().includes('not found') || listErr.statusCode === 404 || listErr.statusCode === '404';
        if (isNotFound) {
          try {
            const { error: cErr } = await client.storage.createBucket(BUCKET_NAME, { public: false });
            if (!cErr) {
              bucketFound = true;
            } else {
              createBucketErr = cErr.message;
            }
          } catch (e) {
            createBucketErr = e.message;
          }

          if (!bucketFound) {
            return {
              success: false,
              error: `Chưa có bucket "${BUCKET_NAME}" trên Supabase và không thể tự động tạo (${createBucketErr || listErr.message}). Vui lòng vào Supabase Dashboard > mục Storage > bấm "New bucket" > đặt tên là "${BUCKET_NAME}" (hoặc dùng khóa service_role bí mật).`
            };
          }
        } else {
          return {
            success: false,
            error: `Lỗi truy cập bucket "${BUCKET_NAME}": ${listErr.message}. Khuyến nghị sử dụng khóa "service_role" (Secret key) của Supabase để có đầy đủ quyền lưu trữ CSDL.`
          };
        }
      } else {
        bucketFound = true;
      }

      return {
        success: true,
        message: `Kết nối tới Supabase Storage thành công! Bucket "${BUCKET_NAME}" đã sẵn sàng.`,
        bucketFound: true,
        bucketName: BUCKET_NAME
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async pullFromSupabase() {
    if (!this.client) return false;
    try {
      console.log(`[SUPABASE] Đang kiểm tra bản sao lưu từ bucket "${BUCKET_NAME}"...`);
      const { data: files, error } = await this.client.storage.from(BUCKET_NAME).list();
      if (error) {
        console.error('[SUPABASE] Lỗi kiểm tra bucket:', error.message);
        this.lastSyncError = error.message;
        return false;
      }

      let restoredDb = false;
      const dbFile = files?.find(f => f.name === 'quanlycongviec.sqlite');
      if (dbFile) {
        console.log(`[SUPABASE] Tìm thấy bản CSDL trên Cloud (${(dbFile.metadata?.size ? (dbFile.metadata.size / 1024).toFixed(1) : '---')} KB), đang tải về...`);
        const { data: blob, error: dlErr } = await this.client.storage.from(BUCKET_NAME).download('quanlycongviec.sqlite');
        if (!dlErr && blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          const dataDir = path.dirname(DB_FILE);
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          fs.writeFileSync(DB_FILE, buffer);
          console.log('[SUPABASE] Khôi phục CSDL quanlycongviec.sqlite thành công!');
          restoredDb = true;
        }
      }

      const sessionFile = files?.find(f => f.name === 'zalo_session.json');
      if (sessionFile) {
        console.log('[SUPABASE] Tìm thấy phiên Zalo trên Cloud, đang tải về...');
        const { data: sBlob, error: sErr } = await this.client.storage.from(BUCKET_NAME).download('zalo_session.json');
        if (!sErr && sBlob) {
          const buffer = Buffer.from(await sBlob.arrayBuffer());
          fs.writeFileSync(SESSION_FILE, buffer);
          console.log('[SUPABASE] Khôi phục phiên zalo_session.json thành công!');
        }
      }

      this.lastSyncAt = new Date().toISOString();
      this.lastSyncAction = 'pull';
      this.status = 'connected';
      return restoredDb;
    } catch (err) {
      console.error('[SUPABASE] Lỗi khi kéo dữ liệu từ Supabase:', err.message);
      this.lastSyncError = err.message;
      return false;
    }
  }

  async pushToSupabase() {
    if (!this.client) return { success: false, error: 'Chưa cấu hình Supabase.' };
    if (this.isSyncing) return { success: true, syncing: true };

    this.isSyncing = true;
    try {
      console.log(`[SUPABASE] Đang đồng bộ CSDL và phiên Zalo lên bucket "${BUCKET_NAME}"...`);

      // Ensure bucket exists if possible
      try {
        const { data: buckets } = await this.client.storage.listBuckets();
        const hasBucket = buckets?.some(b => b.name === BUCKET_NAME);
        if (!hasBucket) {
          await this.client.storage.createBucket(BUCKET_NAME, { public: false });
        }
      } catch (e) {}

      let uploadErrors = [];

      if (fs.existsSync(DB_FILE)) {
        // Flush SQLite WAL transactions to database file before upload
        try {
          const db = require('./db');
          db.pragma('wal_checkpoint(TRUNCATE)');
        } catch (e) {}

        const dbBuffer = fs.readFileSync(DB_FILE);
        const { error: dbErr } = await this.client.storage.from(BUCKET_NAME).upload('quanlycongviec.sqlite', dbBuffer, {
          upsert: true,
          contentType: 'application/x-sqlite3'
        });
        if (dbErr) {
          console.error('[SUPABASE] Lỗi upload DB:', dbErr.message);
          const isNotFound = dbErr.message?.toLowerCase().includes('not found') || dbErr.statusCode === 404 || dbErr.statusCode === '404';
          if (isNotFound) {
            uploadErrors.push(`Chưa có bucket "${BUCKET_NAME}" trên Supabase. Vui lòng vào Supabase Dashboard > mục Storage > bấm "New bucket" > đặt tên là "${BUCKET_NAME}" rồi bấm lưu lại`);
          } else {
            uploadErrors.push(`Lỗi lưu CSDL: ${dbErr.message}`);
          }
        } else {
          console.log('[SUPABASE] Đã sao lưu quanlycongviec.sqlite lên Supabase thành công!');
        }
      }

      if (fs.existsSync(SESSION_FILE)) {
        const sessionBuffer = fs.readFileSync(SESSION_FILE);
        const { error: sErr } = await this.client.storage.from(BUCKET_NAME).upload('zalo_session.json', sessionBuffer, {
          upsert: true,
          contentType: 'application/json'
        });
        if (sErr) {
          console.error('[SUPABASE] Lỗi upload phiên Zalo:', sErr.message);
          uploadErrors.push(`Lỗi lưu phiên Zalo: ${sErr.message}`);
        } else {
          console.log('[SUPABASE] Đã sao lưu zalo_session.json lên Supabase thành công!');
        }
      }

      if (uploadErrors.length > 0) {
        this.lastSyncError = uploadErrors.join('; ');
        this.status = 'error';
        return { success: false, error: this.lastSyncError };
      }

      this.lastSyncAt = new Date().toISOString();
      this.lastSyncAction = 'push';
      this.lastSyncError = null;
      this.status = 'connected';
      return { success: true, syncedAt: this.lastSyncAt };
    } catch (err) {
      console.error('[SUPABASE] Lỗi đẩy dữ liệu lên Supabase:', err.message);
      this.lastSyncError = err.message;
      this.status = 'error';
      return { success: false, error: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  scheduleAutoSync(delayMs = 2500) {
    if (!this.client) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.pushToSupabase().catch(e => console.error('[SUPABASE-AUTO-SYNC]', e.message));
    }, delayMs);
  }

  async saveConfig(url, key, dbInstance = null) {
    this.url = (url || '').trim();
    this.key = (key || '').trim();

    // Save to local config file
    try {
      const configPath = path.join(__dirname, '..', 'data', 'supabase_config.json');
      fs.writeFileSync(configPath, JSON.stringify({ url: this.url, key: this.key }, null, 2), 'utf8');
    } catch (e) {}

    if (dbInstance) {
      try {
        dbInstance.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('supabase_url', this.url);
        dbInstance.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('supabase_key', this.key);
      } catch (e) {
        console.error('[SUPABASE] Lỗi lưu settings vào DB:', e.message);
      }
    }

    this.init(dbInstance);

    if (this.client) {
      const testRes = await this.testConnection();
      if (!testRes.success) {
        return testRes;
      }
      const pushRes = await this.pushToSupabase();
      if (!pushRes.success) {
        return { success: false, error: pushRes.error || 'Kết nối thành công nhưng không thể sao lưu CSDL vào bucket. Vui lòng kiểm tra quyền hoặc dùng khóa service_role.' };
      }
      return { success: true, message: 'Đã lưu cấu hình và sao lưu CSDL lên Supabase thành công!' };
    }

    return { success: true, message: 'Đã lưu cấu hình Supabase.' };
  }

  getStatus() {
    let maskedUrl = '';
    if (this.url) {
      try {
        const u = new URL(this.url);
        maskedUrl = u.origin;
      } catch (e) {
        maskedUrl = this.url.substring(0, 15) + '...';
      }
    }

    return {
      status: this.status,
      isConfigured: !!(this.url && this.key),
      url: maskedUrl,
      bucket: BUCKET_NAME,
      lastSyncAt: this.lastSyncAt,
      lastSyncAction: this.lastSyncAction,
      lastSyncError: this.lastSyncError
    };
  }
}

const supabaseService = new SupabaseService();
module.exports = supabaseService;

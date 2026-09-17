const fs = require('fs');
const path = require('path');
const { Zalo, LoginQRCallbackEventType, ThreadType } = require('zca-js');
const db = require('./db');

const SESSION_FILE = path.join(__dirname, 'zalo_session.json');

class ZaloPersonalService {
  constructor() {
    this.api = null;
    this.status = 'disconnected'; // 'disconnected' | 'restoring' | 'generating_qr' | 'qr_ready' | 'scanned' | 'logging_in' | 'logged_in' | 'expired' | 'error'
    this.qrImage = null;
    this.qrExpiresAt = null;
    this.error = null;
    this.userInfo = null;
    this.groups = [];
    this.targetGroupId = '';
    this.enabled = true;
    this.currentLoginPromise = null;
    this.isRestoring = false;
    this.restorePromise = null;
  }

  async init() {
    // Load settings & cached info from DB
    try {
      const groupRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_group_id');
      if (groupRow) this.targetGroupId = groupRow.value;
      const enabledRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_enabled');
      if (enabledRow) this.enabled = enabledRow.value === '1';

      // Load cached user info and groups
      const userRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_user_info');
      if (userRow && userRow.value) {
        try { this.userInfo = JSON.parse(userRow.value); } catch (e) {}
      }
      const groupsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_groups');
      if (groupsRow && groupsRow.value) {
        try { this.groups = JSON.parse(groupsRow.value); } catch (e) {}
      }
    } catch (e) {
      console.error('[ZALO-PERSONAL] Lỗi đọc cài đặt:', e.message);
    }

    // Try to restore session
    await this.restoreSession();
  }

  hasSavedSession() {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_session');
      if (row && row.value && row.value.trim().length > 10) return true;
    } catch (e) {}
    if (fs.existsSync(SESSION_FILE)) {
      try {
        const stats = fs.statSync(SESSION_FILE);
        if (stats.size > 10) return true;
      } catch (e) {}
    }
    return false;
  }

  async restoreSession() {
    if (this.status === 'logged_in' && this.api) return true;
    if (this.isRestoring) {
      return this.restorePromise;
    }

    this.isRestoring = true;
    this.restorePromise = (async () => {
      try {
        let sessionData = null;

        // 1. Try DB first (persists on container restarts)
        try {
          const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_session');
          if (row && row.value) {
            sessionData = JSON.parse(row.value);
          }
        } catch (e) {
          console.error('[ZALO-PERSONAL] Lỗi đọc session từ DB:', e.message);
        }

        // 2. Try file if DB didn't have it
        if (!sessionData && fs.existsSync(SESSION_FILE)) {
          try {
            const raw = fs.readFileSync(SESSION_FILE, 'utf8');
            if (raw && raw.trim()) {
              sessionData = JSON.parse(raw);
              // Backfill DB from file
              try {
                db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_session', raw);
              } catch (e) {}
            }
          } catch (e) {
            console.error('[ZALO-PERSONAL] Lỗi đọc session từ file:', e.message);
          }
        }

        if (!sessionData || !sessionData.cookie) {
          console.log('[ZALO-PERSONAL] Chưa có phiên đăng nhập Zalo cá nhân.');
          this.status = 'disconnected';
          return false;
        }

        console.log('[ZALO-PERSONAL] Tìm thấy phiên đăng nhập đã lưu, đang khôi phục kết nối...');
        this.status = 'restoring';

        const zalo = new Zalo({ logging: false });
        // NOTE: zca-js expects zalo.login(credentials), where credentials is { cookie, imei, userAgent }
        this.api = await zalo.login(sessionData);
        this.status = 'logged_in';
        console.log('[ZALO-PERSONAL] Khôi phục phiên Zalo cá nhân thành công!');

        // Sync back to file if missing
        if (!fs.existsSync(SESSION_FILE)) {
          try {
            fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), 'utf8');
          } catch (e) {}
        }

        // Refresh account info & groups in background
        this.loadAccountInfo().catch(e => console.error('[ZALO-PERSONAL] AccountInfo refresh:', e.message));
        this.loadGroups().catch(e => console.error('[ZALO-PERSONAL] Groups refresh:', e.message));

        return true;
      } catch (err) {
        console.error('[ZALO-PERSONAL] Khôi phục phiên Zalo thất bại (có thể session hết hạn):', err.message);
        this.status = 'disconnected';
        this.api = null;
        return false;
      } finally {
        this.isRestoring = false;
      }
    })();

    return this.restorePromise;
  }

  async loadAccountInfo() {
    if (!this.api) return;
    try {
      const info = await this.api.fetchAccountInfo();
      const profile = info?.profile || info?.data || info || {};
      this.userInfo = {
        uid: String(profile.userId || profile.uid || ''),
        name: profile.displayName || profile.zaloName || profile.username || 'Tài khoản Zalo Cá nhân',
        avatar: profile.avatar || ''
      };
      console.log('[ZALO-PERSONAL] Đã tải thông tin tài khoản:', this.userInfo.name, 'UID:', this.userInfo.uid);
      try {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_user_info', JSON.stringify(this.userInfo));
      } catch (e) {}
    } catch (e) {
      console.error('[ZALO-PERSONAL] Lỗi tải thông tin tài khoản:', e.message);
      if (!this.userInfo) {
        this.userInfo = { name: 'Tài khoản Zalo Cá nhân', uid: '' };
      }
    }
  }

  async loadGroups() {
    if (!this.api) return [];
    try {
      console.log('[ZALO-PERSONAL] Đang tải danh sách nhóm Zalo...');
      const res = await this.api.getAllGroups();
      
      // getAllGroups returns { version, gridVerMap: { [groupId]: string } }
      const gridVerMap = res?.gridVerMap || res?.data?.gridVerMap || {};
      const groupIds = Object.keys(gridVerMap);
      console.log(`[ZALO-PERSONAL] Tìm thấy ${groupIds.length} nhóm trong tài khoản.`);

      if (groupIds.length > 0) {
        const groupList = [];
        // Batch in chunks of 40 to avoid URL/payload size limits
        for (let i = 0; i < groupIds.length; i += 40) {
          const chunk = groupIds.slice(i, i + 40);
          try {
            const infoRes = await this.api.getGroupInfo(chunk);
            const gridMap = infoRes?.gridInfoMap || infoRes?.data?.gridInfoMap || {};
            for (const [id, g] of Object.entries(gridMap)) {
              groupList.push({
                id: String(g.groupId || g.grid || id),
                name: g.name || `Nhóm ${id}`,
                memberCount: g.totalMember || (Array.isArray(g.memIds) ? g.memIds.length : 0),
                avatar: g.avatar || ''
              });
            }
          } catch (chunkErr) {
            console.error('[ZALO-PERSONAL] Lỗi getGroupInfo batch:', chunkErr.message);
            // Fallback for this chunk so user can still select group by ID
            for (const id of chunk) {
              groupList.push({
                id: String(id),
                name: `Nhóm Zalo (${id})`,
                memberCount: 0,
                avatar: ''
              });
            }
          }
        }

        // Sort groups alphabetically by name
        groupList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
        this.groups = groupList;
      } else if (res?.data && res.data.gridInfoMap) {
        this.groups = Object.values(res.data.gridInfoMap).map(g => ({
          id: String(g.grid || g.groupId || g.id),
          name: g.name || 'Nhóm không tên',
          memberCount: g.totalMember || 0,
          avatar: g.avatar || ''
        }));
      } else {
        this.groups = [];
      }

      console.log(`[ZALO-PERSONAL] Đã đồng bộ ${this.groups.length} nhóm Zalo.`);
      try {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_groups', JSON.stringify(this.groups));
      } catch (e) {}
      return this.groups;
    } catch (e) {
      console.error('[ZALO-PERSONAL] Lỗi tải danh sách nhóm:', e.message);
      return this.groups || [];
    }
  }

  async startQRLogin() {
    if (this.status === 'logged_in' && this.api) {
      return { status: 'logged_in', userInfo: this.userInfo };
    }

    this.status = 'generating_qr';
    this.qrImage = null;
    this.error = null;

    const zalo = new Zalo({ logging: false });

    // Execute loginQR
    this.currentLoginPromise = zalo.loginQR(
      {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      (event) => {
        if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
          this.status = 'qr_ready';
          this.qrImage = `data:image/png;base64,${event.data.image}`;
          this.qrExpiresAt = Date.now() + 90000;
          console.log('[ZALO-PERSONAL] Mã QR đã sẵn sàng để quét.');
        } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
          this.status = 'scanned';
          console.log('[ZALO-PERSONAL] Người dùng đã quét mã, đang chờ xác nhận trên điện thoại...');
        } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
          this.status = 'expired';
          this.qrImage = null;
          console.log('[ZALO-PERSONAL] Mã QR đã hết hạn.');
        } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
          this.status = 'logging_in';
          try {
            const dataStr = JSON.stringify(event.data, null, 2);
            fs.writeFileSync(SESSION_FILE, dataStr, 'utf8');
            db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_session', dataStr);
            console.log('[ZALO-PERSONAL] Đã lưu thông tin phiên vào File và SQLite DB.');
          } catch (err) {
            console.error('[ZALO-PERSONAL] Lỗi ghi file/db session:', err.message);
          }
        }
      }
    )
      .then(async (api) => {
        this.api = api;
        this.status = 'logged_in';
        this.qrImage = null;
        this.error = null;
        console.log('[ZALO-PERSONAL] Đăng nhập Zalo cá nhân thành công!');
        try {
          await this.loadAccountInfo();
          await this.loadGroups();
        } catch (e) {
          console.error('[ZALO-PERSONAL] Lỗi sau khi đăng nhập:', e.message);
        }
        return { status: 'logged_in', userInfo: this.userInfo };
      })
      .catch((err) => {
        console.error('[ZALO-PERSONAL] Lỗi đăng nhập QR:', err.message);
        this.status = 'error';
        this.error = err.message;
        this.qrImage = null;
        throw err;
      });

    return { status: this.status, qrImage: this.qrImage };
  }

  async logout() {
    this.api = null;
    this.status = 'disconnected';
    this.userInfo = null;
    this.groups = [];
    this.qrImage = null;
    if (fs.existsSync(SESSION_FILE)) {
      try {
        fs.unlinkSync(SESSION_FILE);
      } catch (e) {}
    }
    try {
      db.prepare("DELETE FROM settings WHERE key IN ('zalo_personal_session', 'zalo_personal_user_info', 'zalo_personal_groups')").run();
    } catch (e) {}
    return { success: true };
  }

  setTargetGroup(groupId) {
    this.targetGroupId = String(groupId || '').trim();
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_group_id', this.targetGroupId);
    } catch (e) {}
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_enabled', this.enabled ? '1' : '0');
    } catch (e) {}
  }

  async findUserByPhone(phoneNumber) {
    if (!this.api || this.status !== 'logged_in') return null;
    try {
      const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
      const user = await this.api.findUser(cleanPhone);
      return user; // { uid, display_name, zalo_name, avatar }
    } catch (err) {
      console.warn(`[ZALO-PERSONAL] Không tìm thấy user với SĐT ${phoneNumber}:`, err.message);
      return null;
    }
  }

  async sendToPhone(phoneNumber, message) {
    if (!this.api || this.status !== 'logged_in') {
      return { sent: false, note: 'Tài khoản Zalo cá nhân chưa đăng nhập.' };
    }
    try {
      const user = await this.findUserByPhone(phoneNumber);
      if (!user || !user.uid) {
        return { sent: false, note: `Không tìm thấy tài khoản Zalo với SĐT ${phoneNumber}` };
      }
      const response = await this.api.sendMessage(
        { msg: message },
        user.uid.toString(),
        ThreadType.User
      );
      try {
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES ('personal_direct', ?, ?, 'success', ?)
        `).run(`phone:${phoneNumber} (uid:${user.uid})`, message, JSON.stringify(response || {}));
      } catch (e) {}
      return { sent: true, response, user };
    } catch (err) {
      console.error(`[ZALO-PERSONAL] Lỗi gửi tin tới SĐT ${phoneNumber}:`, err.message);
      try {
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES ('personal_direct', ?, ?, 'failed', ?)
        `).run(`phone:${phoneNumber}`, message, err.message);
      } catch (e) {}
      return { sent: false, error: err.message };
    }
  }

  async sendMessage(message, overrideTarget = null) {
    if (!this.api || this.status !== 'logged_in') {
      return { sent: false, note: 'Tài khoản Zalo cá nhân chưa đăng nhập.' };
    }

    if (!this.enabled && !overrideTarget) {
      return { sent: false, note: 'Gửi qua Zalo cá nhân đang bị tắt.' };
    }

    const rawTarget = (overrideTarget || this.targetGroupId || '').toString().trim();
    if (!rawTarget) {
      return { sent: false, note: 'Chưa chọn hoặc chưa nhập ID Nhóm Zalo nhận tin nhắn.' };
    }

    // Check if rawTarget is a phone number (e.g. 10 digits starting with 0 or +84)
    if (/^(\+?84|0)[3|5|7|8|9][0-9]{8}$/.test(rawTarget)) {
      return this.sendToPhone(rawTarget, message);
    }

    try {
      const isDirectUser = rawTarget.startsWith('u:') || rawTarget.startsWith('user:');
      const targetId = isDirectUser ? rawTarget.replace(/^(u:|user:)/, '').trim() : rawTarget;
      const threadType = isDirectUser ? ThreadType.User : ThreadType.Group;

      console.log(`[ZALO-PERSONAL] Đang gửi tin nhắn tới ${isDirectUser ? 'User' : 'Group'} ID: ${targetId}`);

      const response = await this.api.sendMessage(
        { msg: message },
        targetId,
        threadType
      );

      console.log(`[ZALO-PERSONAL] Gửi thành công tới ${targetId}:`, response);

      // Record log in zalo_logs
      try {
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES ('personal_zalo', ?, ?, 'success', ?)
        `).run(`${isDirectUser ? 'user' : 'group'}:${targetId}`, message, JSON.stringify(response || {}));
      } catch (e) {}

      return { sent: true, response };
    } catch (err) {
      console.error('[ZALO-PERSONAL] Lỗi gửi tin nhắn Zalo:', err.message);
      try {
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES ('personal_zalo', ?, ?, 'failed', ?)
        `).run(`target:${rawTarget}`, message, err.message);
      } catch (e) {}

      return { sent: false, error: err.message };
    }
  }

  getStatus() {
    return {
      status: this.status,
      hasSavedSession: this.hasSavedSession(),
      qrImage: this.qrImage,
      qrExpiresAt: this.qrExpiresAt,
      error: this.error,
      userInfo: this.userInfo,
      groups: this.groups,
      targetGroupId: this.targetGroupId,
      enabled: this.enabled
    };
  }
}

const zaloPersonalService = new ZaloPersonalService();

module.exports = zaloPersonalService;

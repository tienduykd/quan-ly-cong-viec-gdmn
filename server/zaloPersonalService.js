const fs = require('fs');
const path = require('path');
const { Zalo, LoginQRCallbackEventType, ThreadType } = require('zca-js');
const db = require('./db');

const SESSION_FILE = path.join(__dirname, 'zalo_session.json');

class ZaloPersonalService {
  constructor() {
    this.api = null;
    this.status = 'disconnected'; // 'disconnected' | 'generating_qr' | 'qr_ready' | 'scanned' | 'logged_in' | 'expired' | 'error'
    this.qrImage = null;
    this.qrExpiresAt = null;
    this.error = null;
    this.userInfo = null;
    this.groups = [];
    this.targetGroupId = '';
    this.enabled = true;
    this.currentLoginPromise = null;
  }

  async init() {
    // Load settings from DB
    try {
      const groupRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_group_id');
      if (groupRow) this.targetGroupId = groupRow.value;
      const enabledRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('zalo_personal_enabled');
      if (enabledRow) this.enabled = enabledRow.value === '1';
    } catch (e) {
      console.error('[ZALO-PERSONAL] Lỗi đọc cài đặt:', e.message);
    }

    // Try to restore session from file
    if (fs.existsSync(SESSION_FILE)) {
      try {
        console.log('[ZALO-PERSONAL] Tìm thấy phiên đăng nhập đã lưu, đang khôi phục kết nối...');
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        const zalo = new Zalo({ logging: false });
        this.api = await zalo.loginCookie(sessionData);
        this.status = 'logged_in';
        console.log('[ZALO-PERSONAL] Khôi phục phiên Zalo cá nhân thành công!');
        await this.loadAccountInfo();
        await this.loadGroups();
      } catch (err) {
        console.error('[ZALO-PERSONAL] Khôi phục phiên Zalo thất bại (có thể session hết hạn):', err.message);
        this.status = 'disconnected';
        this.api = null;
      }
    } else {
      console.log('[ZALO-PERSONAL] Chưa có phiên đăng nhập Zalo cá nhân.');
    }
  }

  async loadAccountInfo() {
    if (!this.api) return;
    try {
      const info = await this.api.fetchAccountInfo();
      if (info && info.data) {
        this.userInfo = {
          uid: info.data.userId || info.data.uid || '',
          name: info.data.name || info.data.displayName || 'Tài khoản Zalo Cá nhân',
          avatar: info.data.avatar || info.data.thumb || ''
        };
      }
    } catch (e) {
      this.userInfo = { name: 'Tài khoản Zalo Cá nhân' };
    }
  }

  async loadGroups() {
    if (!this.api) return [];
    try {
      const res = await this.api.getAllGroups();
      if (res && res.data && res.data.gridInfoMap) {
        // gridInfoMap is an object map of groupId -> groupInfo
        this.groups = Object.values(res.data.gridInfoMap).map(g => ({
          id: g.grid || g.groupId || g.id,
          name: g.name || 'Nhóm không tên',
          memberCount: g.totalMember || (g.memIds ? g.memIds.length : 0)
        }));
      } else if (Array.isArray(res?.data)) {
        this.groups = res.data.map(g => ({
          id: g.grid || g.groupId || g.id,
          name: g.name || 'Nhóm không tên',
          memberCount: g.totalMember || 0
        }));
      }
      return this.groups;
    } catch (e) {
      console.error('[ZALO-PERSONAL] Lỗi tải danh sách nhóm:', e.message);
      return [];
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
            fs.writeFileSync(SESSION_FILE, JSON.stringify(event.data, null, 2), 'utf8');
            console.log('[ZALO-PERSONAL] Đã lưu thông tin phiên vào', SESSION_FILE);
          } catch (err) {
            console.error('[ZALO-PERSONAL] Lỗi ghi file session:', err.message);
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
        await this.loadAccountInfo();
        await this.loadGroups();
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
    return { success: true };
  }

  setTargetGroup(groupId) {
    this.targetGroupId = groupId;
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_group_id', groupId);
    } catch (e) {}
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('zalo_personal_enabled', this.enabled ? '1' : '0');
    } catch (e) {}
  }

  async sendMessage(message, overrideGroupId = null) {
    if (!this.api || this.status !== 'logged_in') {
      return { sent: false, note: 'Tài khoản Zalo cá nhân chưa đăng nhập.' };
    }

    if (!this.enabled && !overrideGroupId) {
      return { sent: false, note: 'Gửi qua Zalo cá nhân đang bị tắt.' };
    }

    const groupId = overrideGroupId || this.targetGroupId;
    if (!groupId) {
      return { sent: false, note: 'Chưa chọn Nhóm Zalo nhận tin nhắn.' };
    }

    try {
      const response = await this.api.sendMessage(
        { msg: message },
        groupId.toString(),
        ThreadType.Group
      );

      // Record log in zalo_logs
      try {
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES ('personal_zalo', ?, ?, 'success', ?)
        `).run(`group:${groupId}`, message, JSON.stringify(response || {}));
      } catch (e) {}

      return { sent: true, response };
    } catch (err) {
      console.error('[ZALO-PERSONAL] Lỗi gửi tin nhắn vào nhóm:', err.message);
      try {
        db.prepare(`
          INSERT INTO zalo_logs (message_type, recipient, content, status, response_data)
          VALUES ('personal_zalo', ?, ?, 'failed', ?)
        `).run(`group:${groupId}`, message, err.message);
      } catch (e) {}

      return { sent: false, error: err.message };
    }
  }

  getStatus() {
    return {
      status: this.status,
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

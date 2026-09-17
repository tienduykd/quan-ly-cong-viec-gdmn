const express = require('express');
const router = express.Router();
const zaloPersonalService = require('../zaloPersonalService');
const { authMiddleware, adminOnly } = require('../auth');

// GET /api/zalo-personal/status
router.get('/status', authMiddleware, async (req, res) => {
  const status = zaloPersonalService.getStatus();
  res.json(status);
});

// POST /api/zalo-personal/start-qr
router.post('/start-qr', authMiddleware, adminOnly, async (req, res) => {
  try {
    zaloPersonalService.startQRLogin().catch(err => {
      console.error('[ROUTE] Error in startQRLogin:', err.message);
    });

    // Give it a brief moment to generate the QR if fast
    await new Promise(r => setTimeout(r, 1200));

    res.json(zaloPersonalService.getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/zalo-personal/refresh-groups
router.post('/refresh-groups', authMiddleware, adminOnly, async (req, res) => {
  try {
    const groups = await zaloPersonalService.loadGroups();
    await zaloPersonalService.loadAccountInfo();
    res.json({
      success: true,
      groups,
      userInfo: zaloPersonalService.userInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/zalo-personal/select-group
router.post('/select-group', authMiddleware, adminOnly, (req, res) => {
  const { groupId } = req.body;
  if (!groupId || !groupId.trim()) {
    return res.status(400).json({ error: 'Vui lòng chọn hoặc nhập ID Nhóm Zalo.' });
  }
  zaloPersonalService.setTargetGroup(groupId.trim());
  res.json({ success: true, message: 'Đã lưu nhóm Zalo nhận thông báo thành công!' });
});

// POST /api/zalo-personal/toggle-enabled
router.post('/toggle-enabled', authMiddleware, adminOnly, (req, res) => {
  const { enabled } = req.body;
  zaloPersonalService.setEnabled(enabled);
  res.json({ success: true, enabled: zaloPersonalService.enabled });
});

// POST /api/zalo-personal/test-send
router.post('/test-send', authMiddleware, adminOnly, async (req, res) => {
  const { message, groupId, phone } = req.body;
  const content = message || '🔔 [TEST THÔNG BÁO] Kết nối thành công từ Bot Zalo Cá nhân - Phần mềm Quản lý công việc GDMN!';

  let result;
  if (phone) {
    result = await zaloPersonalService.sendToPhone(phone, content);
  } else {
    result = await zaloPersonalService.sendMessage(content, groupId);
  }

  if (result.sent) {
    res.json({ success: true, message: 'Đã gửi tin nhắn thử nghiệm Zalo thành công!' });
  } else {
    res.status(400).json({ success: false, error: result.error || result.note || 'Gửi thất bại' });
  }
});

// POST /api/zalo-personal/logout
router.post('/logout', authMiddleware, adminOnly, async (req, res) => {
  await zaloPersonalService.logout();
  res.json({ success: true, message: 'Đã đăng xuất tài khoản Zalo cá nhân.' });
});

module.exports = router;

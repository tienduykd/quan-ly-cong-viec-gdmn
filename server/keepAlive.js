const axios = require('axios');

/**
 * Anti-Sleep (Chống ngủ đông) Service for Render / Free Cloud Hosting
 * Free instances on Render spin down after 15 minutes of inactivity.
 * This background service performs a periodic HTTP ping every 12 minutes
 * to keep the service warm and responsive 24/7.
 */
function startKeepAlive() {
  const INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

  const getTargetUrl = () => {
    return process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  };

  const currentUrl = getTargetUrl();
  console.log('[ANTI-SLEEP] Dịch vụ chống ngủ đông (Keep-Alive) đã khởi động.');
  if (currentUrl) {
    console.log(`[ANTI-SLEEP] Đang giám sát và duy trì hoạt động cho: ${currentUrl}`);
  } else {
    console.log('[ANTI-SLEEP] Chờ biến môi trường RENDER_EXTERNAL_URL hoặc APP_URL được thiết lập.');
  }

  // Self-ping interval
  setInterval(async () => {
    const target = getTargetUrl();
    if (!target) return;

    try {
      const pingUrl = target.endsWith('/') ? `${target}api/health` : `${target}/api/health`;
      const startTime = Date.now();
      const response = await axios.get(pingUrl, {
        headers: { 'User-Agent': 'GDMN-AntiSleep-Worker/1.0' },
        timeout: 15000
      });
      const latency = Date.now() - startTime;
      console.log(`[ANTI-SLEEP] Self-ping thành công lúc ${new Date().toLocaleTimeString('vi-VN')} (${latency}ms) - Hệ thống duy trì hoạt động liên tục.`);
    } catch (error) {
      console.warn(`[ANTI-SLEEP] Self-ping thử lại lúc ${new Date().toLocaleTimeString('vi-VN')}: ${error.message}`);
    }
  }, INTERVAL_MS);
}

module.exports = { startKeepAlive };

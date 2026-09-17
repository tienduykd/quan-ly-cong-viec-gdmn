const axios = require('axios');

/**
 * Universal webhook poster supporting Zalo bot gateways, Telegram, Discord, Lark, Slack, n8n, Make.com
 */
async function postToWebhook(webhookUrl, content) {
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    throw new Error('Chưa cung cấp Webhook URL hợp lệ.');
  }

  const url = webhookUrl.trim();

  // 1. Telegram Bot URL: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>
  if (url.includes('api.telegram.org')) {
    try {
      const parsed = new URL(url);
      const chatId = parsed.searchParams.get('chat_id');
      if (chatId) {
        return await axios.post(url, { chat_id: chatId, text: content }, { timeout: 10000 });
      }
    } catch (e) {}
    return await axios.post(url, { text: content }, { timeout: 10000 });
  }

  // 2. Lark / Feishu Bot Webhook
  if (url.includes('open.feishu.cn') || url.includes('open.larksuite.com')) {
    return await axios.post(url, {
      msg_type: 'text',
      content: { text: content }
    }, { timeout: 10000 });
  }

  // 3. Discord Webhook
  if (url.includes('discord.com/api/webhooks')) {
    return await axios.post(url, {
      content: content
    }, { timeout: 10000 });
  }

  // 4. Slack Webhook
  if (url.includes('hooks.slack.com')) {
    return await axios.post(url, {
      text: content
    }, { timeout: 10000 });
  }

  // 5. Standard Zalo Bot / n8n / Make.com / Webhook.site
  return await axios.post(url, {
    text: content,
    message: content,
    content: content,
    timestamp: Date.now()
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });
}

module.exports = { postToWebhook };

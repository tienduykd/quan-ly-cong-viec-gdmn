import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  HelpCircle,
  Sparkles,
  ExternalLink,
  History
} from 'lucide-react';
import { apiRequest } from '../api';

export default function ZaloView({ currentUser }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState('07:30');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testContent, setTestContent] = useState('🔔 [TEST] Kiểm tra kết nối từ Phần mềm Quản lý công việc - Ngành GDMN tới Zalo Group thành công!');

  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'dangutphuong';

  const loadZaloSettings = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/zalo/settings');
      setWebhookUrl(data.webhookUrl || '');
      setEnabled(data.enabled || false);
      setDailyTime(data.dailyTime || '07:30');
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZaloSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/zalo/settings', {
        method: 'POST',
        body: JSON.stringify({
          webhookUrl,
          enabled,
          dailyTime
        })
      });
      setMessage('Lưu cấu hình Zalo thành công!');
      loadZaloSettings();
    } catch (err) {
      setError('Lỗi lưu cấu hình: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerDigest = async () => {
    setTriggering(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/zalo/trigger-digest', { method: 'POST' });
      if (res.success) {
        setMessage(`Đã gửi bản tin điểm việc hôm nay thành công! (${res.dueCount} việc đến hạn, ${res.overdueCount} việc quá hạn). Ghi chú: ${res.zaloResult?.note || ''}`);
        loadZaloSettings();
      } else {
        setError('Gửi thất bại: ' + res.error);
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleTestMessage = async () => {
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/zalo/test-message', {
        method: 'POST',
        body: JSON.stringify({
          message: testContent,
          webhookUrl
        })
      });
      setMessage('Đã gửi tin nhắn thử nghiệm thành công tới Webhook Zalo!');
      loadZaloSettings();
    } catch (err) {
      setError('Lỗi gửi thử: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Tích hợp Nhắc việc Tự động qua Zalo
            </h2>
            <p className="text-xs text-slate-500">
              Gửi thông báo công việc đến hạn và quá hạn vào Nhóm Zalo ngành GDMN vào mỗi sáng (07:30)
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Guide Card */}
      <div className="bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 p-5 rounded-2xl border border-blue-200/60 space-y-3">
        <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          Cách thức hoạt động của tính năng Nhắc việc Zalo
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          Phần mềm hỗ trợ <strong>tự động quét cơ sở dữ liệu vào lúc 07:30 mỗi sáng</strong> để tổng hợp các công việc:
          <br />• <strong>Việc đến hạn trong ngày</strong> (kèm tên người phụ trách và tiến độ hiện tại).
          <br />• <strong>Việc đã trễ hạn</strong> (để đôn đốc thực hiện).
          <br />Sau đó, hệ thống sẽ tự động phát bản tin vào nhóm Zalo chung của toàn bộ giảng viên ngành GDMN thông qua cơ chế <strong>Zalo Webhook / Bot</strong>.
        </p>
      </div>

      {/* Configuration Form & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            Cấu hình Webhook Zalo
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                URL Webhook Nhóm Zalo / Bot
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://chat.zalo.me/api/webhook/... hoặc webhook bot"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                (Dán Webhook URL của Zalo Bot hoặc Webhook tích hợp nhóm).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Giờ nhắc tự động
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    disabled={!isAdmin}
                    value={dailyTime}
                    onChange={(e) => setDailyTime(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Trạng thái gửi
                </label>
                <label className="flex items-center gap-2 cursor-pointer mt-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span>Kích hoạt tự động</span>
                </label>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            )}
          </form>

          {/* Test connection */}
          {isAdmin && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Thử nghiệm gửi tin nhắn Zalo:</label>
              <input
                type="text"
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50"
              />
              <button
                type="button"
                onClick={handleTestMessage}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {testing ? 'Đang gửi...' : 'Gửi tin nhắn kiểm tra'}
              </button>
            </div>
          )}
        </div>

        {/* Live Preview Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Mẫu Bản tin Điểm việc Đầu ngày sẽ gửi qua Zalo
            </h3>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
{`📋 [BẢN TIN NHẮC VIỆC ĐẦU NGÀY - NGÀNH GDMN]
📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}
------------------------------------
⏰ CÔNG VIỆC ĐẾN HẠN HÔM NAY (1):
1. [🟠 Cao] Rà soát và cập nhật đề cương chi tiết HK1
   👤 Phụ trách: Nguyễn Công Trường | Tiến độ: 60%

⚠️ CÔNG VIỆC ĐÃ QUÁ HẠN:
(Không có công việc quá hạn)

👉 Quý Thầy/Cô vui lòng truy cập hệ thống để cập nhật tiến độ công việc.
Chúc Quý Thầy/Cô một ngày làm việc hiệu quả!`}
            </div>
          </div>

          {isAdmin && (
            <div className="p-4 bg-teal-50 border border-teal-200/80 rounded-xl space-y-2">
              <p className="text-xs font-bold text-teal-950">Chủ động phát bản tin ngay lập tức</p>
              <p className="text-[11px] text-teal-800">
                Ngoài lịch hẹn tự động 07:30 sáng, Cô có thể nhấn nút dưới đây để quét và gửi bản tin điểm việc ngay bây giờ.
              </p>
              <button
                type="button"
                onClick={handleTriggerDigest}
                disabled={triggering}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {triggering ? 'Đang gửi bản tin...' : 'Gửi ngay bản tin điểm việc hôm nay'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zalo Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Nhật ký tin nhắn Zalo đã gửi (Logs)</h3>
          </div>
          <span className="text-xs text-slate-400">Gần nhất 20 tin</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Loại tin nhắn</th>
                <th className="py-3 px-4">Nội dung tin</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Chưa có nhật ký gửi tin nào.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.sent_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {log.message_type === 'cron' ? '⏰ Tự động (07:30)' :
                       log.message_type === 'manual_trigger' ? '👉 Thủ công Admin' : 'Kiểm tra (Test)'}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="truncate text-slate-700 font-mono text-[11px]">{log.content}</p>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Thành công
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          Thất bại
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

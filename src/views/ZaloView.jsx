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
  History,
  QrCode,
  Smartphone,
  UserCheck,
  RefreshCw,
  LogOut,
  Users,
  Check,
  FileText,
  RotateCcw,
  Edit3,
  Save,
  MessageCircle,
  Bell
} from 'lucide-react';
import { apiRequest, formatVietnamDateTime } from '../api';

export default function ZaloView({ currentUser }) {
  const [activeChannelTab, setActiveChannelTab] = useState('personal'); // 'personal' | 'webhook'
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState('07:30');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggeringPersonal, setTriggeringPersonal] = useState(false);
  const [triggeringGroup, setTriggeringGroup] = useState(false);
  const [triggeringWebhook, setTriggeringWebhook] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testContent, setTestContent] = useState('🔔 [TEST] Kiểm tra kết nối từ Phần mềm Quản lý công việc - Ngành GDMN tới Zalo Group thành công!');
  const [guideTab, setGuideTab] = useState('telegram');

  // Templates state
  const [newTaskTemplate, setNewTaskTemplate] = useState('');
  const [reminderTemplate, setReminderTemplate] = useState('');
  const [dailyDeadlineTemplate, setDailyDeadlineTemplate] = useState('');
  const [groupTemplate, setGroupTemplate] = useState('');
  const [templateTab, setTemplateTab] = useState('new_task'); // 'new_task' | 'reminder' | 'daily_deadline' | 'group'
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [previewGender, setPreviewGender] = useState('female'); // 'female' | 'male'

  // Personal Zalo state
  const [personalStatus, setPersonalStatus] = useState('loading');
  const [personalQrImage, setPersonalQrImage] = useState(null);
  const [personalUserInfo, setPersonalUserInfo] = useState(null);
  const [personalGroups, setPersonalGroups] = useState([]);
  const [personalTargetGroupId, setPersonalTargetGroupId] = useState('');
  const [personalEnabled, setPersonalEnabled] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [testingPersonal, setTestingPersonal] = useState(false);
  const [refreshingGroups, setRefreshingGroups] = useState(false);

  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'dangutphuong';

  const loadPersonalStatus = async () => {
    try {
      const data = await apiRequest('/zalo-personal/status');
      setPersonalStatus(data.status);
      setPersonalQrImage(data.qrImage);
      setPersonalUserInfo(data.userInfo);
      setPersonalGroups(data.groups || []);
      setPersonalTargetGroupId(data.targetGroupId || '');
      setPersonalEnabled(data.enabled !== false);
    } catch (e) {
      console.error(e);
      setPersonalStatus('disconnected');
    }
  };

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

  const loadTemplates = async () => {
    try {
      const data = await apiRequest('/zalo/templates');
      setNewTaskTemplate(data.newTaskTemplate || data.personalTemplate || '');
      setReminderTemplate(data.reminderTemplate || '');
      setDailyDeadlineTemplate(data.dailyDeadlineTemplate || '');
      setGroupTemplate(data.groupTemplate || '');
    } catch (err) {
      console.error('Lỗi khi tải mẫu tin Zalo:', err);
    }
  };

  useEffect(() => {
    loadZaloSettings();
    loadPersonalStatus();
    loadTemplates();
  }, []);

  // Poll for QR scan / confirmation if actively logging in or restoring
  useEffect(() => {
    let interval = null;
    if (['generating_qr', 'qr_ready', 'scanned', 'logging_in', 'restoring'].includes(personalStatus)) {
      interval = setInterval(() => {
        loadPersonalStatus();
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [personalStatus]);

  const handleSaveSettings = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/zalo/settings', {
        method: 'POST',
        body: JSON.stringify({
          webhookUrl,
          enabled,
          dailyTime
        })
      });
      setMessage(res.message || `Đã cập nhật giờ nhắc việc tự động thành ${dailyTime}!`);
      await loadZaloSettings();
    } catch (err) {
      setError('Lỗi lưu cấu hình: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerDigest = async (mode = 'manual_personal') => {
    if (mode === 'manual_group') {
      setTriggeringGroup(true);
    } else {
      setTriggeringPersonal(true);
    }
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/zalo/trigger-digest', {
        method: 'POST',
        body: JSON.stringify({ mode })
      });
      if (res.success) {
        setMessage(`Đã gửi thành công! (${res.dueCount} việc đến hạn, ${res.overdueCount} việc quá hạn). Ghi chú: ${res.zaloResult?.note || ''}`);
        loadZaloSettings();
      } else {
        setError('Gửi thất bại: ' + (res.error || 'Vui lòng kiểm tra lại kết nối Zalo.'));
      }
    } catch (err) {
      setError('Lỗi gửi: ' + err.message);
    } finally {
      if (mode === 'manual_group') {
        setTriggeringGroup(false);
      } else {
        setTriggeringPersonal(false);
      }
    }
  };

  const handleTriggerWebhookDigest = async () => {
    setTriggeringWebhook(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/zalo/trigger-digest', {
        method: 'POST',
        body: JSON.stringify({ mode: 'manual_group' })
      });
      if (res.success) {
        setMessage(`Đã gửi thành công! (${res.dueCount} việc đến hạn, ${res.overdueCount} việc quá hạn). Ghi chú: ${res.zaloResult?.note || ''}`);
        loadZaloSettings();
      } else {
        setError('Gửi thất bại: ' + (res.error || 'Vui lòng kiểm tra lại Webhook.'));
      }
    } catch (err) {
      setError('Lỗi gửi: ' + err.message);
    } finally {
      setTriggeringWebhook(false);
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

  const handleStartPersonalQR = async () => {
    setLoadingPersonal(true);
    setMessage('');
    setError('');
    try {
      const data = await apiRequest('/zalo-personal/start-qr', { method: 'POST' });
      setPersonalStatus(data.status);
      setPersonalQrImage(data.qrImage);
      setMessage('Đang khởi tạo mã QR đăng nhập Zalo cá nhân. Vui lòng hướng điện thoại để quét mã bên dưới.');
    } catch (err) {
      setError('Lỗi tạo mã QR: ' + err.message);
    } finally {
      setLoadingPersonal(false);
    }
  };

  const handleSelectPersonalGroup = async (groupId) => {
    setPersonalTargetGroupId(groupId);
    try {
      await apiRequest('/zalo-personal/select-group', {
        method: 'POST',
        body: JSON.stringify({ groupId })
      });
      setMessage('Đã lưu nhóm Zalo nhận thông báo thành công!');
    } catch (err) {
      setError('Lỗi lưu nhóm: ' + err.message);
    }
  };

  const handleTogglePersonalEnabled = async (enabledVal) => {
    setPersonalEnabled(enabledVal);
    try {
      await apiRequest('/zalo-personal/toggle-enabled', {
        method: 'POST',
        body: JSON.stringify({ enabled: enabledVal })
      });
      setMessage(enabledVal ? 'Đã kích hoạt tự động gửi qua Zalo cá nhân!' : 'Đã tắt tự động gửi qua Zalo cá nhân.');
    } catch (err) {
      setError('Lỗi cập nhật: ' + err.message);
    }
  };

  const handleRefreshGroups = async () => {
    setRefreshingGroups(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/zalo-personal/refresh-groups', { method: 'POST' });
      setPersonalGroups(res.groups || []);
      if (res.userInfo) setPersonalUserInfo(res.userInfo);
      setMessage(`Đã đồng bộ lại danh sách nhóm! Tìm thấy ${res.groups?.length || 0} nhóm Zalo.`);
    } catch (err) {
      setError('Lỗi tải lại danh sách nhóm: ' + err.message);
    } finally {
      setRefreshingGroups(false);
    }
  };

  const handleTestPersonalSend = async () => {
    setTestingPersonal(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/zalo-personal/test-send', {
        method: 'POST',
        body: JSON.stringify({
          message: '🔔 [TEST THÔNG BÁO] Kết nối thành công từ Bot Zalo Cá nhân - Phần mềm Quản lý công việc GDMN!',
          groupId: personalTargetGroupId
        })
      });
      setMessage('Đã gửi tin nhắn thử nghiệm thành công vào nhóm Zalo!');
      loadZaloSettings();
    } catch (err) {
      setError('Lỗi gửi thử nghiệm: ' + err.message);
    } finally {
      setTestingPersonal(false);
    }
  };

  const handlePersonalLogout = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất tài khoản Zalo cá nhân khỏi hệ thống?')) return;
    try {
      await apiRequest('/zalo-personal/logout', { method: 'POST' });
      setMessage('Đã đăng xuất tài khoản Zalo cá nhân.');
      loadPersonalStatus();
    } catch (err) {
      setError('Lỗi đăng xuất: ' + err.message);
    }
  };

  const handleSaveTemplates = async () => {
    setSavingTemplates(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/zalo/templates', {
        method: 'POST',
        body: JSON.stringify({
          newTaskTemplate,
          reminderTemplate,
          dailyDeadlineTemplate,
          groupTemplate
        })
      });
      setMessage('Lưu các mẫu tin nhắn Zalo thành công!');
    } catch (err) {
      setError('Lỗi khi lưu mẫu tin nhắn: ' + err.message);
    } finally {
      setSavingTemplates(false);
    }
  };

  const handleResetTemplate = async (type) => {
    const labels = {
      new_task: 'Mẫu 1: Báo việc mới',
      reminder: 'Mẫu 2: Nhắc nhở việc',
      daily_deadline: 'Mẫu 3: Nhắc Deadline hàng ngày',
      group: 'Mẫu 4: Bản tin nhóm chung'
    };
    const label = labels[type] || 'mẫu tin này';
    if (!window.confirm(`Bạn có chắc muốn khôi phục ${label} về định dạng mặc định ban đầu?`)) {
      return;
    }
    try {
      const res = await apiRequest('/zalo/templates/reset', {
        method: 'POST',
        body: JSON.stringify({ type })
      });
      if (type === 'new_task' || type === 'all') setNewTaskTemplate(res.newTaskTemplate || res.personalTemplate);
      if (type === 'reminder' || type === 'all') setReminderTemplate(res.reminderTemplate);
      if (type === 'daily_deadline' || type === 'all') setDailyDeadlineTemplate(res.dailyDeadlineTemplate);
      if (type === 'group' || type === 'all') setGroupTemplate(res.groupTemplate);
      setMessage(`Đã khôi phục ${label} về mẫu mặc định!`);
    } catch (err) {
      setError('Lỗi khôi phục mẫu: ' + err.message);
    }
  };

  const handleInsertTag = (tag) => {
    if (templateTab === 'new_task') {
      setNewTaskTemplate(prev => (prev ? prev + ' ' + tag : tag));
    } else if (templateTab === 'reminder') {
      setReminderTemplate(prev => (prev ? prev + ' ' + tag : tag));
    } else if (templateTab === 'daily_deadline') {
      setDailyDeadlineTemplate(prev => (prev ? prev + ' ' + tag : tag));
    } else {
      setGroupTemplate(prev => (prev ? prev + ' ' + tag : tag));
    }
  };

  const getNewTaskPreview = (gender = 'female') => {
    const isMale = gender === 'male';
    const honorific = isMale ? 'Thầy' : 'Cô';
    const name = isMale ? 'Nguyễn Công Trường' : 'Huỳnh Thị Thúy Diễm';
    const sender = 'Đặng Út Phượng';
    return (newTaskTemplate || '')
      .replace(/{danh_xung}/g, honorific)
      .replace(/{ho_ten}/g, name)
      .replace(/{nguoi_gui}/g, sender)
      .replace(/{ten_cong_viec}/g, 'Báo cáo kiểm định chất lượng CTĐT Giáo dục Mầm non')
      .replace(/{han_chot}/g, '25-09-2026')
      .replace(/{muc_uu_tien}/g, '🔴 KHẨN CẤP')
      .replace(/{tien_do}/g, '0');
  };

  const getReminderPreview = (gender = 'female') => {
    const isMale = gender === 'male';
    const honorific = isMale ? 'Thầy' : 'Cô';
    const name = isMale ? 'Nguyễn Công Trường' : 'Huỳnh Thị Thúy Diễm';
    const sender = 'Đặng Út Phượng';
    return (reminderTemplate || '')
      .replace(/{danh_xung}/g, honorific)
      .replace(/{ho_ten}/g, name)
      .replace(/{nguoi_gui}/g, sender)
      .replace(/{ten_cong_viec}/g, 'Báo cáo kiểm định chất lượng CTĐT Giáo dục Mầm non')
      .replace(/{han_chot}/g, '25-09-2026')
      .replace(/{muc_uu_tien}/g, '🔴 KHẨN CẤP')
      .replace(/{tien_do}/g, '45');
  };

  const getDailyDeadlinePreview = (gender = 'female') => {
    const isMale = gender === 'male';
    const honorific = isMale ? 'Thầy' : 'Cô';
    const name = isMale ? 'Nguyễn Công Trường' : 'Huỳnh Thị Thúy Diễm';
    const sampleTasks = `📋 Tên công việc: Báo cáo kiểm định chất lượng CTĐT Giáo dục Mầm non [🔴 KHẨN CẤP]`;
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    return (dailyDeadlineTemplate || '')
      .replace(/{danh_xung}/g, honorific)
      .replace(/{ho_ten}/g, name)
      .replace(/{danh_sach_cong_viec}/g, sampleTasks)
      .replace(/{ten_cong_viec}/g, sampleTasks)
      .replace(/{han_chot}/g, todayStr);
  };

  const getGroupPreview = () => {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const dueSample = `1. [🔴 KHẨN CẤP] Rà soát đề cương HK1\n   👤 Phụ trách: Thầy Nguyễn Công Trường | Tiến độ: 60%\n2. [🟠 Cao] Kế hoạch thực tập SP mầm non\n   👤 Phụ trách: Cô Huỳnh Thị Thúy Diễm | Tiến độ: 80%`;
    const overdueSample = `1. ❗ Báo cáo tự đánh giá TC 3 (Hạn: 15-09-2026)\n   👤 Phụ trách: Cô Lê Thanh Huyền | Tiến độ: 50%`;
    return (groupTemplate || '')
      .replace(/{ngay}/g, todayStr)
      .replace(/{so_viec_hom_nay}/g, '2')
      .replace(/{danh_sach_viec_hom_nay}/g, dueSample)
      .replace(/{so_viec_qua_han}/g, '1')
      .replace(/{danh_sach_viec_qua_han}/g, overdueSample);
  };

  const getMessageTypeBadge = (type) => {
    switch (type) {
      case 'remind_personal':
      case 'personal_direct':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">💬 Nhắc riêng (1-1)</span>;
      case 'manual_personal':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">💬 Nhắc riêng loạt</span>;
      case 'manual_group':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">📢 Nhóm GDMN</span>;
      case 'cron':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">⏰ Tự động ({dailyTime || '07:30'})</span>;
      case 'test':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">🧪 Kiểm tra</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
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
              Tự động gửi tin nhắn Zalo nhắc việc đến hạn vào mỗi sáng ({dailyTime || '07:30'})
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

      {/* Channel Switcher */}
      <div className="flex border border-slate-200 p-1 bg-slate-100/80 rounded-2xl w-full sm:w-fit gap-1">
        <button
          type="button"
          onClick={() => setActiveChannelTab('personal')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeChannelTab === 'personal'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4 text-blue-600" />
          <span>Tài khoản Zalo Cá nhân (Quét mã QR tự động)</span>
          {personalStatus === 'logged_in' ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveChannelTab('webhook')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeChannelTab === 'webhook'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-teal-600" />
          <span>Webhook Nhóm (Telegram / Make / Discord)</span>
          {enabled ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          ) : null}
        </button>
      </div>

      {/* CHANNEL 1: TÀI KHOẢN ZALO CÁ NHÂN */}
      {activeChannelTab === 'personal' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  Bot Tự động gửi qua Tài khoản Zalo Cá nhân
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đăng nhập 1 lần duy nhất bằng điện thoại, hệ thống sẽ tự động gửi bản tin và nhắc việc vào nhóm Zalo
                </p>
              </div>

              <div>
                {personalStatus === 'logged_in' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đã kết nối Zalo
                  </span>
                ) : personalStatus === 'scanned' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 animate-pulse">
                    Đã quét - Chờ bấm Xác nhận trên điện thoại
                  </span>
                ) : personalStatus === 'qr_ready' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Chờ quét mã QR...
                  </span>
                ) : personalStatus === 'loading' || personalStatus === 'restoring' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đang kiểm tra kết nối...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                    Chưa kết nối
                  </span>
                )}
              </div>
            </div>

            {/* If LOADING or RESTORING */}
            {personalStatus === 'loading' || personalStatus === 'restoring' ? (
              <div className="p-10 text-center bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    {personalStatus === 'restoring' ? 'Đang khôi phục kết nối Zalo cá nhân...' : 'Đang kiểm tra trạng thái phiên Zalo...'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Hệ thống đang tự động đồng bộ kết nối, vui lòng chờ trong giây lát</p>
                </div>
              </div>
            ) : personalStatus !== 'logged_in' ? (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2">
                  <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Hướng dẫn đăng nhập bằng Zalo cá nhân:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 text-[12px]">
                    <li>Nhấn nút <strong>"Tạo mã QR đăng nhập Zalo"</strong> bên dưới.</li>
                    <li>Mở ứng dụng <strong>Zalo trên điện thoại</strong>, chọn biểu tượng <strong>Quét mã QR</strong> ở góc trên bên phải.</li>
                    <li>Hướng camera vào mã QR hiển thị trên màn hình.</li>
                    <li>Bấm nút <strong>"Xác nhận đăng nhập"</strong> (hoặc Đồng ý đăng nhập trên máy tính) trên điện thoại.</li>
                  </ol>
                </div>

                {!personalQrImage ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Chưa có mã QR nào đang hoạt động</h4>
                      <p className="text-xs text-slate-400 mt-1">Bấm nút bên dưới để sinh mã QR đăng nhập tức thì</p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleStartPersonalQR}
                        disabled={loadingPersonal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                      >
                        <QrCode className="w-4 h-4" />
                        {loadingPersonal ? 'Đang khởi tạo mã...' : 'Tạo mã QR đăng nhập Zalo ngay'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-4 max-w-sm mx-auto shadow-inner">
                    <div className="relative inline-block bg-white p-3 rounded-2xl border-2 border-blue-200 shadow-md">
                      <img
                        src={personalQrImage}
                        alt="Mã QR Zalo"
                        className="w-56 h-56 rounded-xl object-contain mx-auto"
                      />
                      {personalStatus === 'scanned' && (
                        <div className="absolute inset-0 bg-slate-900/85 rounded-2xl flex flex-col items-center justify-center text-white p-4 space-y-2 animate-in fade-in">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
                          <p className="text-xs font-bold">Đã nhận diện quét mã!</p>
                          <p className="text-[11px] text-slate-300">Vui lòng nhấn Xác nhận trên điện thoại...</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        {personalStatus === 'scanned'
                          ? '👉 Vui lòng nhấn "Xác nhận đăng nhập" trên điện thoại'
                          : '⚡ Quét mã bằng ứng dụng Zalo trên điện thoại'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Mã có hiệu lực trong 90 giây. Hệ thống tự động phát hiện ngay khi bạn xác nhận!
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleStartPersonalQR}
                          disabled={loadingPersonal}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Làm mới mã QR
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* If ALREADY logged in */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Account Profile Card */}
                  <div className="p-5 bg-gradient-to-br from-blue-50/50 to-teal-50/50 border border-blue-200/60 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      {personalUserInfo?.avatar ? (
                        <img
                          src={personalUserInfo.avatar}
                          alt="Avatar"
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                          <UserCheck className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{personalUserInfo?.name || 'Tài khoản Zalo Cá nhân'}</h4>
                        <p className="text-xs text-slate-500 font-mono">UID: {personalUserInfo?.uid || '---'}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100">
                      ✅ Phiên đăng nhập đã được lưu trữ an toàn. Máy chủ sẽ dùng tài khoản này để <strong>tự động gửi tin nhắn nhắc việc lúc {dailyTime || '07:30'} sáng</strong> và thông báo khi có công việc mới.
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handlePersonalLogout}
                        className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold transition"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Đăng xuất tài khoản Zalo này
                      </button>
                    )}
                  </div>

                  {/* Group Selection Card */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-teal-600" />
                          Chọn Nhóm Zalo nhận thông báo:
                        </label>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={handleRefreshGroups}
                            disabled={refreshingGroups}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition disabled:opacity-50"
                            title="Tải lại danh sách nhóm Zalo mới nhất"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingGroups ? 'animate-spin' : ''}`} />
                            <span>{refreshingGroups ? 'Đang quét nhóm...' : 'Làm mới nhóm'}</span>
                          </button>
                        )}
                      </div>

                      <select
                        disabled={!isAdmin}
                        value={personalTargetGroupId}
                        onChange={(e) => handleSelectPersonalGroup(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">-- Chọn nhóm Zalo của ngành GDMN --</option>
                        {personalGroups.map(g => (
                          <option key={g.id} value={g.id}>
                            👥 {g.name} ({g.memberCount} thành viên)
                          </option>
                        ))}
                      </select>

                      {personalGroups.length === 0 ? (
                        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
                          <div className="font-semibold flex items-center gap-1">
                            <span>⚠️ Chưa thấy danh sách nhóm Zalo.</span>
                          </div>
                          <p>
                            Hãy nhấn nút <strong>"Làm mới nhóm"</strong> ở trên, hoặc bạn có thể <strong>dán trực tiếp ID nhóm Zalo</strong> vào ô bên dưới để lưu.
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1">
                          (Đã đồng bộ {personalGroups.length} nhóm Zalo mà tài khoản của bạn đang tham gia).
                        </p>
                      )}

                      {/* Manual Group ID input */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Hoặc nhập / dán trực tiếp ID Nhóm Zalo:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            disabled={!isAdmin}
                            value={personalTargetGroupId}
                            onChange={(e) => setPersonalTargetGroupId(e.target.value)}
                            placeholder="Nhập ID Nhóm Zalo (ví dụ: 123456789...)"
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-teal-500"
                          />
                          <button
                            type="button"
                            disabled={!isAdmin || !personalTargetGroupId}
                            onClick={() => handleSelectPersonalGroup(personalTargetGroupId)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                          >
                            Lưu ID
                          </button>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 pt-1">
                      <input
                        type="checkbox"
                        disabled={!isAdmin}
                        checked={personalEnabled}
                        onChange={(e) => handleTogglePersonalEnabled(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span>Kích hoạt tự động gửi qua tài khoản Zalo này</span>
                    </label>

                    {isAdmin && (
                      <div className="pt-2 space-y-1.5">
                        <button
                          type="button"
                          onClick={handleTestPersonalSend}
                          disabled={testingPersonal || !personalTargetGroupId}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {testingPersonal ? 'Đang gửi thử...' : 'Gửi tin nhắn thử nghiệm vào nhóm Zalo'}
                        </button>
                        {!personalTargetGroupId && (
                          <p className="text-[11px] text-amber-600 text-center font-medium">
                            * Vui lòng chọn một nhóm Zalo hoặc nhập ID nhóm ở trên để bật nút gửi thử nghiệm.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notification Modes: Mode 1 (Default & Automated 1-1) and Mode 2 (Manual Group Broadcast) */}
                {isAdmin && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        Cơ chế thông báo nhắc việc Zalo (2 Chế độ):
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* MODE 1: Private 1-1 Direct Messages */}
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-3 shadow-xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Chế độ 1 (Mặc định & Tự động)
                            </span>
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                              <Clock className="w-3 h-3 text-emerald-700" />
                              <input
                                type="time"
                                disabled={!isAdmin}
                                value={dailyTime}
                                onChange={(e) => setDailyTime(e.target.value)}
                                className="bg-transparent font-bold text-xs text-emerald-800 focus:outline-none"
                                title="Giờ tự động quét và gửi tin hàng ngày (Giờ Việt Nam)"
                              />
                            </div>
                          </div>
                          <h4 className="font-bold text-sm text-slate-800">💬 Nhắc Deadline hàng ngày (1-1 riêng từng người)</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Mỗi sáng lúc <strong>{dailyTime || '07:30'}</strong>, hệ thống tự động lọc các giảng viên có việc đến hạn hoàn thành hôm đó và <strong>gửi tin nhắn Zalo riêng (1-1)</strong> vào số điện thoại từng người (chỉ ai có việc đến hạn hôm đó mới nhận). <em>Không gửi vào nhóm chung</em>.
                          </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
                            title="Lưu giờ gửi nhắc tự động hàng ngày"
                          >
                            {saving ? 'Đang lưu...' : 'Lưu giờ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerDigest('manual_personal')}
                            disabled={triggeringPersonal}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {triggeringPersonal ? 'Đang gửi...' : 'Gửi thử ngay (Thủ công)'}
                          </button>
                        </div>
                      </div>

                      {/* MODE 2: Manual Group Announcement */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3 shadow-xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              Chế độ 2 (Phát nhóm - Chỉ thủ công)
                            </span>
                            <span className="text-[11px] font-semibold text-blue-700">Khi Admin bấm</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-800">📢 Bản tin tổng hợp vào Nhóm GDMN</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Gửi bản tin tổng hợp toàn bộ công việc trong ngày vào nhóm chat Zalo chung. <strong>Chỉ phát khi Quản trị viên chủ động bấm nút</strong> (hoàn toàn không tự động gửi để tránh spam nhóm).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTriggerDigest('manual_group')}
                          disabled={triggeringGroup || !personalTargetGroupId}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {triggeringGroup ? 'Đang phát bản tin nhóm...' : 'Phát bản tin vào Nhóm Zalo GDMN (Thủ công)'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHANNEL 2: WEBHOOK ĐA NỀN TẢNG (TELEGRAM / MAKE / DISCORD / OA) */}
      {activeChannelTab === 'webhook' && (
        <div className="space-y-6">
          {/* Guide Card & Webhook Tutorial */}
          <div className="bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 p-5 rounded-2xl border border-blue-200/60 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Hướng dẫn thiết lập Webhook gửi thông báo tự động
              </h3>
              <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                Hỗ trợ Zalo / Telegram / Make / Lark / Discord
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Hệ thống sẽ <strong>tự động gửi thông báo khi có bất kỳ sự kiện nào phát sinh</strong> (giao việc mới, sửa việc, đổi tiến độ, bình luận, thêm tài liệu...) và <strong>tổng hợp bản tin nhắc việc lúc {dailyTime || '07:30'} mỗi sáng</strong>.
            </p>

            {/* Guide Tabs */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-blue-100 space-y-3">
              <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2.5">
                <button
                  type="button"
                  onClick={() => setGuideTab('telegram')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    guideTab === 'telegram'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ⭐ Cách 1: Telegram Bot (Khuyên dùng - 1 Phút)
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('zalo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    guideTab === 'zalo'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cách 2: Zalo Bot Gateway / Zalo OA
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('make')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    guideTab === 'make'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cách 3: Cầu nối Make.com / n8n (Miễn phí)
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('other')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    guideTab === 'other'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cách 4: Discord / Lark / Slack
                </button>
              </div>

              {guideTab === 'telegram' && (
                <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  <p className="font-semibold text-blue-900">
                    🚀 Lý do nên dùng: Telegram hoàn toàn miễn phí, không giới hạn tin nhắn, thiết lập trong 1 phút và thông báo tức thì trên điện thoại!
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                    <li>
                      Mở ứng dụng Telegram, tìm <strong>@BotFather</strong>, gửi lệnh <code>/newbot</code> để tạo bot và copy <strong>Bot Token</strong> (Ví dụ: <code>7123456789:AAFx...</code>).
                    </li>
                    <li>
                      Tạo một Nhóm Telegram (ví dụ: "Nhóm GDMN - Nhắc Việc"), mời con bot vừa tạo vào nhóm.
                    </li>
                    <li>
                      Lấy <strong>Chat ID</strong> của nhóm (mời thêm bot <code>@RawDataBot</code> vào nhóm để xem Chat ID, thường có dấu trừ như <code>-1001987654321</code>, xong có thể xóa RawDataBot).
                    </li>
                    <li>
                      Dán URL vào ô cấu hình Webhook theo mẫu:
                      <div className="mt-1 p-2 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-lg break-all select-all">
                        https://api.telegram.org/bot&lt;BOT_TOKEN&gt;/sendMessage?chat_id=&lt;CHAT_ID&gt;
                      </div>
                    </li>
                    <li>Nhấn nút <strong>"Lưu cấu hình"</strong> và bấm <strong>"Gửi tin nhắn kiểm tra"</strong> để nhận thông báo ngay!</li>
                  </ol>
                </div>
              )}

              {guideTab === 'zalo' && (
                <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  <p className="font-semibold text-blue-900">
                    💬 Cơ chế Zalo Bot: Zalo không có sẵn tính năng tạo Webhook trực tiếp trong nhóm chat cá nhân, do đó cần một cổng kết nối (Gateway) hoặc Zalo Official Account (OA).
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                    <li>
                      <strong>Nếu dùng Zalo OA:</strong> Tạo Webhook URL trên Zalo Developers Platform để nhận thông báo và gửi tin ZNS/Tư vấn.
                    </li>
                    <li>
                      <strong>Nếu dùng Zalo Bot Gateway (tự dựng hoặc dịch vụ ngoài):</strong> Sử dụng bot chạy thư viện Node.js <code>zca-js</code> hoặc Python Zalo Bot, webhook URL dạng:
                      <div className="mt-1 p-2 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-lg break-all select-all">
                        https://your-bot-server.com/api/zalo-group-webhook
                      </div>
                    </li>
                    <li>Phần mềm sẽ tự động gửi gói tin JSON gồm <code>text</code> và <code>message</code> đến URL này mỗi khi có thông báo.</li>
                  </ul>
                </div>
              )}

              {guideTab === 'make' && (
                <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  <p className="font-semibold text-blue-900">
                    ⚡ Dùng Make.com (Integromat) hoặc n8n làm cầu nối trung gian:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                    <li>Đăng ký tài khoản miễn phí tại <strong>Make.com</strong>.</li>
                    <li>Tạo một kịch bản mới (Scenario), chọn module đầu vào là <strong>Custom Webhook</strong>.</li>
                    <li>Copy đường dẫn Webhook do Make cấp (dạng <code>https://hook.eu1.make.com/...</code>) và dán vào ô Webhook URL ở bên dưới.</li>
                    <li>Kết nối module tiếp theo của Make với Zalo / Gmail / Sheet tùy nhu cầu của Thầy/Cô.</li>
                  </ol>
                </div>
              )}

              {guideTab === 'other' && (
                <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  <p className="font-semibold text-blue-900">
                    🔔 Discord / Lark / Feishu / Slack Webhook:
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Nếu nhóm sử dụng Discord, Lark hoặc Slack, chỉ cần vào phần <strong>Tích hợp (Integrations) &rarr; Webhooks</strong>, copy link Webhook (ví dụ <code>https://discord.com/api/webhooks/...</code> hoặc <code>https://open.larksuite.com/...</code>) và dán vào ô bên dưới. Hệ thống đã tích hợp sẵn bộ phân giải định dạng tự động cho từng nền tảng.
                  </p>
                </div>
              )}
            </div>
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
                  <label className="block text-xs font-bold text-slate-700">Thử nghiệm gửi tin nhắn Webhook:</label>
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
                    Ngoài lịch hẹn tự động {dailyTime || '07:30'} sáng, Cô có thể nhấn nút dưới đây để quét và gửi bản tin điểm việc ngay bây giờ.
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerWebhookDigest}
                    disabled={triggeringWebhook}
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {triggeringWebhook ? 'Đang gửi bản tin...' : 'Gửi ngay bản tin điểm việc hôm nay'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: QUẢN LÝ MẪU TIN NHẮN ZALO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Quản lý Mẫu Tin Nhắn Zalo
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tùy chỉnh nội dung tin nhắn gửi vào Zalo cá nhân hoặc nhóm chung. Zalo sẽ tự động sử dụng mẫu này khi gửi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleResetTemplate(templateTab)}
              disabled={!isAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              title="Khôi phục mẫu tin này về định dạng mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveTemplates}
                disabled={savingTemplates}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingTemplates ? 'Đang lưu...' : 'Lưu mẫu tin'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Template Type Tabs */}
        <div className="flex flex-wrap border border-slate-200 p-1 bg-slate-100/80 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setTemplateTab('new_task')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              templateTab === 'new_task'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-teal-600" />
            <span>1. Báo việc mới</span>
          </button>
          <button
            type="button"
            onClick={() => setTemplateTab('reminder')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              templateTab === 'reminder'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>2. Nhắc nhở việc</span>
          </button>
          <button
            type="button"
            onClick={() => setTemplateTab('daily_deadline')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              templateTab === 'daily_deadline'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Nhắc Deadline hàng ngày ({dailyTime || '07:30'})</span>
          </button>
          <button
            type="button"
            onClick={() => setTemplateTab('group')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              templateTab === 'group'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>4. Bản tin nhóm chung</span>
          </button>
        </div>

        {/* TAB 1: BÁO VIỆC MỚI */}
        {templateTab === 'new_task' && (
          <div className="space-y-4">
            <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Mẫu tin Báo việc mới:</strong>
                <span>
                  Được hệ thống tự động gửi ngay sau khi giao việc mới hoặc khi bấm nút "Báo việc mới" (bên trái) ở cột Gửi thông báo. Thẻ <code className="font-mono bg-teal-100 px-1 py-0.5 rounded">{'{danh_xung}'}</code> sẽ tự động đổi thành <strong>Thầy</strong> hoặc <strong>Cô</strong> theo giới tính.
                </span>
              </div>
            </div>

            {/* Quick insert tag buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Bấm vào để chèn thẻ dữ liệu vào mẫu tin:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{danh_xung}', label: 'Thầy/Cô' },
                  { tag: '{ho_ten}', label: 'Họ tên nhân sự' },
                  { tag: '{nguoi_gui}', label: 'Người giao việc' },
                  { tag: '{ten_cong_viec}', label: 'Tên việc' },
                  { tag: '{han_chot}', label: 'Hạn chót' },
                  { tag: '{muc_uu_tien}', label: 'Mức ưu tiên' },
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleInsertTag(item.tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-lg text-xs font-mono transition text-slate-700"
                    title={`Chèn ${item.tag}`}
                  >
                    <span className="font-bold text-teal-600">+</span> {item.tag} <span className="text-[10px] text-slate-400">({item.label})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nội dung mẫu Báo việc mới:
                </label>
                <textarea
                  disabled={!isAdmin}
                  rows={12}
                  value={newTaskTemplate}
                  onChange={(e) => setNewTaskTemplate(e.target.value)}
                  placeholder="Nhập nội dung mẫu tin nhắn báo việc mới..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Xem trước kết quả hiển thị trên Zalo:
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewGender('female')}
                      className={`px-2 py-0.5 rounded transition ${previewGender === 'female' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      Ví dụ: Cô Diễm (Nữ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewGender('male')}
                      className={`px-2 py-0.5 rounded transition ${previewGender === 'male' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      Ví dụ: Thầy Trường (Nam)
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner overflow-y-auto max-h-[300px]">
                  {getNewTaskPreview(previewGender)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NHẮC NHỞ VIỆC */}
        {templateTab === 'reminder' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Mẫu tin Nhắc nhở tiến độ:</strong>
                <span>
                  Được dùng khi bấm nút "Nhắc nhở" (bên phải) ở cột Gửi thông báo để nhắc riêng cá nhân phụ trách về công việc đang thực hiện.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Bấm vào để chèn thẻ dữ liệu vào mẫu tin:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{danh_xung}', label: 'Thầy/Cô' },
                  { tag: '{ho_ten}', label: 'Họ tên nhân sự' },
                  { tag: '{nguoi_gui}', label: 'Người giao việc' },
                  { tag: '{ten_cong_viec}', label: 'Tên việc' },
                  { tag: '{han_chot}', label: 'Hạn chót' },
                  { tag: '{muc_uu_tien}', label: 'Mức ưu tiên' },
                  { tag: '{tien_do}', label: 'Tiến độ (%)' },
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleInsertTag(item.tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-lg text-xs font-mono transition text-slate-700"
                    title={`Chèn ${item.tag}`}
                  >
                    <span className="font-bold text-blue-600">+</span> {item.tag} <span className="text-[10px] text-slate-400">({item.label})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nội dung mẫu Nhắc nhở tiến độ:
                </label>
                <textarea
                  disabled={!isAdmin}
                  rows={12}
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  placeholder="Nhập nội dung mẫu tin nhắn nhắc nhở việc..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Xem trước kết quả hiển thị trên Zalo:
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewGender('female')}
                      className={`px-2 py-0.5 rounded transition ${previewGender === 'female' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
                    >
                      Ví dụ: Cô Diễm (Nữ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewGender('male')}
                      className={`px-2 py-0.5 rounded transition ${previewGender === 'male' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
                    >
                      Ví dụ: Thầy Trường (Nam)
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner overflow-y-auto max-h-[300px]">
                  {getReminderPreview(previewGender)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NHẮC DEADLINE HÀNG NGÀY (TỰ ĐỘNG) */}
        {templateTab === 'daily_deadline' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Mẫu tin Nhắc Deadline hàng ngày (Chế độ tự động):</strong>
                <span>
                  Hàng ngày vào lúc {dailyTime || '07:30'}, Zalo tự động gửi tin nhắn mẫu này tới <strong>riêng từng cá nhân</strong> có công việc đến hạn hoàn thành trong ngày hôm đó (chỉ ai có việc đến hạn hôm đó mới nhận). <em>Không gửi vào nhóm chung</em>.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Bấm vào để chèn thẻ dữ liệu vào mẫu tin:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{danh_xung}', label: 'Thầy/Cô' },
                  { tag: '{ho_ten}', label: 'Họ tên nhân sự' },
                  { tag: '{danh_sach_cong_viec}', label: 'Danh sách công việc đến hạn' },
                  { tag: '{han_chot}', label: 'Hạn hoàn thành (Hôm nay)' },
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleInsertTag(item.tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-xs font-mono transition text-slate-700"
                    title={`Chèn ${item.tag}`}
                  >
                    <span className="font-bold text-emerald-600">+</span> {item.tag} <span className="text-[10px] text-slate-400">({item.label})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nội dung mẫu Nhắc Deadline hàng ngày:
                </label>
                <textarea
                  disabled={!isAdmin}
                  rows={12}
                  value={dailyDeadlineTemplate}
                  onChange={(e) => setDailyDeadlineTemplate(e.target.value)}
                  placeholder="Nhập nội dung mẫu tin nhắn nhắc deadline hàng ngày..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Xem trước kết quả hiển thị trên Zalo:
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewGender('female')}
                      className={`px-2 py-0.5 rounded transition ${previewGender === 'female' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      Ví dụ: Cô Diễm (Nữ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewGender('male')}
                      className={`px-2 py-0.5 rounded transition ${previewGender === 'male' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      Ví dụ: Thầy Trường (Nam)
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner overflow-y-auto max-h-[300px]">
                  {getDailyDeadlinePreview(previewGender)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MẪU GỬI NHÓM CHUNG */}
        {templateTab === 'group' && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Bản tin nhóm ngành GDMN:</strong>
                <span>
                  Được dùng khi Quản trị viên bấm nút "Phát bản tin vào Nhóm Zalo GDMN" để thông báo tổng kết các việc đến hạn và quá hạn trong ngày.
                </span>
              </div>
            </div>

            {/* Quick insert tag buttons for group */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Bấm vào để chèn thẻ dữ liệu vào mẫu tin:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{ngay}', label: 'Ngày hiện tại' },
                  { tag: '{so_viec_hom_nay}', label: 'Số việc đến hạn' },
                  { tag: '{danh_sach_viec_hom_nay}', label: 'Danh sách việc đến hạn' },
                  { tag: '{so_viec_qua_han}', label: 'Số việc quá hạn' },
                  { tag: '{danh_sach_viec_qua_han}', label: 'Danh sách việc quá hạn' },
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleInsertTag(item.tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-xs font-mono transition text-slate-700"
                    title={`Chèn ${item.tag}`}
                  >
                    <span className="font-bold text-indigo-600">+</span> {item.tag} <span className="text-[10px] text-slate-400">({item.label})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nội dung mẫu tin nhắn nhóm:
                </label>
                <textarea
                  disabled={!isAdmin}
                  rows={12}
                  value={groupTemplate}
                  onChange={(e) => setGroupTemplate(e.target.value)}
                  placeholder="Nhập nội dung mẫu tin nhắn gửi nhóm..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Xem trước bản tin nhóm:
                </label>
                <div className="flex-1 bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner overflow-y-auto max-h-[300px]">
                  {getGroupPreview()}
                </div>
              </div>
            </div>
          </div>
        )}
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

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs relative">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-bold shadow-sm">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Loại tin nhắn</th>
                <th className="py-3 px-4">Người nhận / SĐT / Nhóm</th>
                <th className="py-3 px-4">Nội dung tin</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Chưa có nhật ký gửi tin nào.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {formatVietnamDateTime(log.sent_at)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {getMessageTypeBadge(log.message_type)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {log.recipient || '---'}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="truncate text-slate-700 font-mono text-[11px]" title={log.content}>
                        {log.content}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Thành công
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800" title={log.response_data || ''}>
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

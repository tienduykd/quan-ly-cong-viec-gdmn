import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  KeyRound,
  Link,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  Server,
  FileCheck,
  Sparkles,
  HardDrive,
  FileDown,
  Upload
} from 'lucide-react';
import { apiRequest, formatVietnamDateTime } from '../api';

export default function SupabaseView({ currentUser }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [statusInfo, setStatusInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.username === 'dangutphuong');

  const fetchStatus = async () => {
    try {
      const data = await apiRequest('/supabase/status');
      setStatusInfo(data);
      if (data.url && !url) {
        setUrl(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    if (!url || !key) {
      setError('Vui lòng nhập đầy đủ SUPABASE_URL và SUPABASE_KEY.');
      return;
    }
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/supabase/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url, key })
      });
      if (res.success) {
        setMessage(`Kết nối thành công! Bucket lưu trữ "${res.bucketName || 'gdmn-database'}" đã sẵn sàng.`);
      } else {
        setError('Kết nối thất bại: ' + res.error);
      }
    } catch (err) {
      setError('Lỗi kiểm tra kết nối: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!url || !key) {
      setError('Vui lòng nhập đầy đủ SUPABASE_URL và SUPABASE_KEY.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/supabase/save-config', {
        method: 'POST',
        body: JSON.stringify({ url, key })
      });
      if (res.success) {
        setMessage('Đã lưu cấu hình và kích hoạt tự động đồng bộ lên Supabase Cloud thành công!');
        setStatusInfo(res.status);
      } else {
        setError('Lưu cấu hình thất bại: ' + res.error);
      }
    } catch (err) {
      setError('Lỗi lưu cấu hình: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/supabase/sync-now', { method: 'POST' });
      if (res.success) {
        setMessage('Đã sao lưu toàn bộ CSDL và Phiên đăng nhập Zalo lên Supabase Cloud thành công!');
        setStatusInfo(res.status);
      } else {
        setError('Sao lưu thất bại: ' + res.error);
      }
    } catch (err) {
      setError('Lỗi sao lưu: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreNow = async () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục CSDL từ Supabase Cloud? Dữ liệu hiện tại sẽ được thay thế bằng bản sao lưu mới nhất trên Cloud.')) return;
    setRestoring(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest('/supabase/restore-now', { method: 'POST' });
      if (res.success) {
        setMessage('Khôi phục CSDL từ Supabase Cloud thành công! Toàn bộ công việc và phiên Zalo đã sẵn sàng.');
        setStatusInfo(res.status);
      } else {
        setError('Khôi phục thất bại: ' + res.error);
      }
    } catch (err) {
      setError('Lỗi khôi phục: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleDownloadBackup = () => {
    const token = localStorage.getItem('token');
    setMessage('Đang chuẩn bị file sao lưu CSDL...');
    fetch('/api/supabase/download-db', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Không thể tải file sao lưu từ máy chủ.');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `quanlycongviec_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setMessage('Đã tải bản sao lưu CSDL (.sqlite) về máy tính thành công!');
      })
      .catch(err => setError(err.message));
  };

  const handleUploadBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm(`Bạn có chắc muốn nạp file sao lưu "${file.name}"? CSDL hiện tại trên hệ thống sẽ được thay thế hoàn toàn bằng file này.`)) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('database_file', file);
    setRestoring(true);
    setError('');
    setMessage('Đang nạp file sao lưu và làm mới CSDL...');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/supabase/upload-db', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nạp CSDL thất bại');
      setMessage(data.message || 'Đã khôi phục CSDL thành công!');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Lưu trữ Dữ liệu Vĩnh viễn qua Supabase Cloud
            </h2>
            <p className="text-xs text-slate-500">
              Tự động sao lưu CSDL và Phiên Zalo lên đám mây, chống mất dữ liệu khi máy chủ khởi động lại
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {statusInfo && (
          <div>
            {statusInfo.status === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                🟢 Đã kết nối Supabase Cloud (Tự động đồng bộ)
              </span>
            ) : statusInfo.isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Đã nạp cấu hình (Sẵn sàng đồng bộ)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                Chưa cấu hình Supabase Cloud
              </span>
            )}
          </div>
        )}
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

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-2">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Tự động đồng bộ sau 3s</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Mỗi khi tạo/sửa việc, đổi tiến độ, bình luận hay quét QR Zalo, CSDL sẽ tự động đồng bộ ngay lên Supabase.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-2">
            <RefreshCw className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Tự phục hồi khi khởi động</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Mỗi khi Render khởi động lại hay ngủ đông thức dậy, máy chủ tự động kéo bản sao lưu mới nhất về.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Bảo toàn phiên Zalo 100%</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Phiên đăng nhập Zalo cá nhân được lưu an toàn trong đám mây, không còn bị out ra khi refresh trang.
          </p>
        </div>
      </div>

      {/* Local File Backup & Restore (Offline Protection) */}
      <div className="bg-white border border-teal-200/80 rounded-2xl p-5 shadow-sm space-y-3 bg-gradient-to-r from-teal-50/40 via-white to-emerald-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sao lưu & Khôi phục CSDL Dự phòng (.sqlite)</h3>
              <p className="text-[11px] text-slate-500">Tải file database về máy tính cá nhân để lưu giữ an toàn, hoặc nạp lại khi cần thiết</p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-lg">
            Dự phòng 1 chạm
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Tải file CSDL (.sqlite) về máy tính
          </button>

          <label className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4 text-teal-600" />
            {restoring ? 'Đang nạp file...' : 'Khôi phục CSDL từ file máy tính'}
            <input
              type="file"
              accept=".sqlite,.db"
              onChange={handleUploadBackup}
              disabled={restoring}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Setup Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-600" />
              Thông tin kết nối Supabase Project
            </h3>
            <span className="text-[11px] text-slate-400">Gói Supabase Miễn phí 100%</span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-slate-400" />
                SUPABASE_URL (Project URL):
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxxxxxx.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Lấy tại: <strong>Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                SUPABASE_KEY (Khuyên dùng khóa service_role / Secret):
              </label>
              <input
                type="password"
                disabled={!isAdmin}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-amber-700 mt-1 font-medium">
                ⭐ Khuyên dùng khóa <strong>service_role (Secret key)</strong> tại <strong>Project Settings &gt; API</strong> để máy chủ có toàn quyền lưu trữ CSDL mà không bị chặn bởi bảo mật RLS.
              </p>
            </div>

            {isAdmin && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình & Kích hoạt'}
                </button>
              </div>
            )}
          </form>

          {/* Manual Backup / Restore Controls */}
          {statusInfo && statusInfo.isConfigured && (
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Thao tác Thủ công (Khi cần thiết)
              </h4>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  {syncing ? 'Đang sao lưu...' : 'Sao lưu lên Cloud ngay'}
                </button>

                <button
                  type="button"
                  onClick={handleRestoreNow}
                  disabled={restoring}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4" />
                  {restoring ? 'Đang khôi phục...' : 'Khôi phục từ Cloud'}
                </button>
              </div>
              {statusInfo.lastSyncAt && (
                <p className="text-[11px] text-slate-400">
                  Lần đồng bộ gần nhất: <strong>{formatVietnamDateTime(statusInfo.lastSyncAt)}</strong> ({statusInfo.lastSyncAction === 'push' ? 'Sao lưu lên' : 'Kéo về'})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right 1 col: Tutorial / Guide */}
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            Hướng dẫn thiết lập Supabase (Vĩnh viễn)
          </div>

          <ol className="list-decimal list-inside space-y-2.5 text-slate-600 leading-relaxed">
            <li>
              Truy cập trang chủ <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> và đăng nhập bằng Google hoặc GitHub.
            </li>
            <li>
              Bấm <strong>"New project"</strong>, đặt tên (ví dụ: <code>gdmn-tasks</code>), chọn mật khẩu CSDL bất kỳ và chọn khu vực (Region: <code>Singapore</code>).
            </li>
            <li>
              Chờ khoảng 1-2 phút để Supabase khởi tạo xong.
            </li>
            <li>
              Vào biểu tượng <strong>Storage</strong> (ở thanh menu bên trái) &gt; bấm nút <strong>"New bucket"</strong> &gt; gõ tên: <code className="font-bold text-emerald-800">gdmn-database</code> &gt; bấm <strong>Save</strong>.
            </li>
            <li>
              Vào biểu tượng bánh răng <strong>Project Settings</strong> (góc dưới bên trái) &gt; chọn mục <strong>API</strong>.
            </li>
            <li>
              Sao chép <strong>Project URL</strong> và khóa <strong>service_role (Secret key)</strong> (nhấn <em>Reveal</em> để hiện khóa bí mật, không dùng khóa anon) rồi dán vào 2 ô bên cạnh và bấm <strong>Lưu cấu hình & Kích hoạt</strong>.
            </li>
          </ol>

          {/* CRITICAL RENDER GUIDE */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-[11px] text-amber-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1 text-amber-950">
              <span>⚠️ Đảm bảo vĩnh viễn trên Render:</span>
            </p>
            <p className="leading-relaxed">
              Vì Render sử dụng máy chủ tạm thời (sẽ reset CSDL khi cập nhật phiên bản mới), để hệ thống <strong>vĩnh viễn không bao giờ bị mất cấu hình hay phiên Zalo</strong>, hãy thêm 2 biến này vào Render:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700 font-mono text-[10px]">
              <li>Vào <strong>dashboard.render.com</strong> &gt; Chọn dịch vụ</li>
              <li>Chọn thẻ <strong>Environment</strong> &gt; Add:</li>
              <li className="font-bold text-slate-900">SUPABASE_URL = [Project URL]</li>
              <li className="font-bold text-slate-900">SUPABASE_KEY = [Khóa service_role]</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

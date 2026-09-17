import React, { useState } from 'react';
import { X, User, Phone, Lock, Shield, Check, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

export default function UserProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const [phone, setPhone] = useState(user.phone || '');
  const [zaloPhone, setZaloPhone] = useState(user.zalo_phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSavingProfile(true);

    try {
      await apiRequest('/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify({ phone, zalo_phone: zaloPhone })
      });
      setMessage('Cập nhật số điện thoại thành công!');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setMessage('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-300" />
            <h3 className="font-bold text-base">Thông tin Cá nhân & Đổi Mật khẩu</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User info card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Họ và tên:</span>
              <strong className="text-slate-800 text-sm">{user.full_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tên đăng nhập (Username):</span>
              <code className="text-teal-700 font-bold">{user.username}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trình độ & Học vị:</span>
              <span className="text-slate-700 font-medium">{user.degree || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Chức vụ:</span>
              <span className="text-slate-700 font-medium">{user.position || 'Giảng viên'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tổ chuyên môn:</span>
              <span className="text-teal-700 font-semibold">{user.department_name || 'Toàn ngành GDMN'}</span>
            </div>
          </div>

          {/* SĐT & Zalo update */}
          <form onSubmit={handleUpdateProfile} className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-600" />
              Thông tin liên hệ & Zalo cá nhân
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số điện thoại:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">SĐT đăng ký Zalo:</label>
                <input
                  type="text"
                  value={zaloPhone}
                  onChange={(e) => setZaloPhone(e.target.value)}
                  placeholder="0912..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="text-right">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition"
              >
                {savingProfile ? 'Đang lưu...' : 'Lưu SĐT'}
              </button>
            </div>
          </form>

          {/* Change password */}
          <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-teal-600" />
              Đổi mật khẩu
            </h4>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mật khẩu hiện tại:</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mật khẩu mới:</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Xác nhận mật khẩu mới:</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="text-right">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
              >
                {savingPassword ? 'Đang đổi...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

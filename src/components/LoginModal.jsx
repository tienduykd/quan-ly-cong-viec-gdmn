import React, { useState } from 'react';
import { LogIn, GraduationCap, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { apiRequest, setAuthToken, setStoredUser } from '../api';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('dangutphuong');
  const [password, setPassword] = useState('phuong123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      setAuthToken(data.token);
      setStoredUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (uname, pass) => {
    setUsername(uname);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-teal-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white text-center relative">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/20">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">HỆ THỐNG QUẢN LÝ CÔNG VIỆC</h1>
          <p className="text-teal-100 text-sm mt-1 font-medium">Chương trình Đào tạo Ngành GDMN</p>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vd: dangutphuong"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl shadow-md shadow-teal-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập vào hệ thống'}
            </button>
          </form>

          {/* Quick Login Chips for Demo & Ease of testing */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              Chọn tài khoản đăng nhập nhanh:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('dangutphuong', 'phuong123')}
                className={`text-left p-2.5 rounded-xl border transition text-xs flex items-center justify-between ${
                  username === 'dangutphuong'
                    ? 'border-teal-500 bg-teal-50 text-teal-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <div>
                    <span className="font-semibold text-teal-800">Đặng Út Phượng</span>
                    <span className="text-[11px] text-slate-500 ml-1.5">(Admin - Giám đốc CTĐT)</span>
                  </div>
                </div>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-mono">phuong123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nguyencongtruong', 'truong123')}
                className={`text-left p-2.5 rounded-xl border transition text-xs flex items-center justify-between ${
                  username === 'nguyencongtruong'
                    ? 'border-teal-500 bg-teal-50 text-teal-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <span className="font-semibold text-slate-800">Nguyễn Công Trường</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">(PGĐ, GVC)</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">truong123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nguyenthanhhuyen', 'huyen123')}
                className={`text-left p-2.5 rounded-xl border transition text-xs flex items-center justify-between ${
                  username === 'nguyenthanhhuyen'
                    ? 'border-teal-500 bg-teal-50 text-teal-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <span className="font-semibold text-slate-800">Nguyễn Thanh Huyền</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">(Giảng viên chính)</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">huyen123</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Mật khẩu mặc định của tất cả 21 giảng viên: <code>[tên]+123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

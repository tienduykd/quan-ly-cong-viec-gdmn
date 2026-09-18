import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Users,
  MessageSquare,
  Bell,
  PlusCircle,
  LogOut,
  User,
  Shield,
  Check,
  ChevronDown,
  Database,
  Cloud
} from 'lucide-react';
import { apiRequest, formatVietnamDateTime } from '../api';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, onOpenCreateTask, onOpenProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const notiRef = useRef(null);
  const userRef = useRef(null);
  const adminRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Lỗi khi tải thông báo:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notiRef.current && !notiRef.current.contains(event.target)) {
        setShowNotiDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (adminRef.current && !adminRef.current.contains(event.target)) {
        setShowAdminDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'PUT' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadSingle = async (noti) => {
    try {
      if (!noti.is_read) {
        await apiRequest(`/notifications/${noti.id}/read`, { method: 'PUT' });
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === noti.id ? ({ ...n, is_read: 1 }) : n));
      }
      setShowNotiDropdown(false);
      setActiveTab('tasks');
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'tasks', label: 'Công việc', icon: CheckSquare },
    { id: 'stats', label: 'Báo cáo & KPI', icon: BarChart3 }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="w-full max-w-[1780px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & App Name - Simplified as requested */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none flex-shrink-0"
            onClick={() => {
              setActiveTab('dashboard');
              setShowAdminDropdown(false);
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight whitespace-nowrap">
              Quản lý công việc GDMN
            </span>
          </div>

          {/* Navigation Tabs - Dàn trên 1 dòng với nút khối to đẹp */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowAdminDropdown(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition shadow-xs ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-2 ring-teal-600/20'
                      : 'text-slate-700 hover:text-teal-700 hover:bg-teal-50/70 bg-slate-50 border border-slate-200/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-teal-600'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Quản trị Menu (Gom Danh sách giảng viên & Cấu hình Zalo) */}
            {isAdmin && (
              <div className="relative" ref={adminRef}>
                <button
                  onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition shadow-xs ${
                    activeTab === 'users' || activeTab === 'zalo' || activeTab === 'supabase'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-2 ring-teal-600/20'
                      : 'text-slate-700 hover:text-teal-700 hover:bg-teal-50/70 bg-slate-50 border border-slate-200/80'
                  }`}
                >
                  <Shield className={`w-4 h-4 ${activeTab === 'users' || activeTab === 'zalo' || activeTab === 'supabase' ? 'text-white' : 'text-teal-600'}`} />
                  <span>Quản trị</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdminDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showAdminDropdown && (
                  <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Quản trị hệ thống
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('users');
                        setShowAdminDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center gap-2.5 transition rounded-xl ${
                        activeTab === 'users' ? 'bg-teal-50 text-teal-800 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold">Danh sách giảng viên</p>
                        <p className="text-[10px] font-normal text-slate-400">Hồ sơ, SĐT Zalo & Giới tính</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('zalo');
                        setShowAdminDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center gap-2.5 transition rounded-xl ${
                        activeTab === 'zalo' ? 'bg-teal-50 text-teal-800 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold">Cấu hình Zalo</p>
                        <p className="text-[10px] font-normal text-slate-400">Kết nối Bot & Mẫu tin nhắn</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('supabase');
                        setShowAdminDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center gap-2.5 transition rounded-xl ${
                        activeTab === 'supabase' ? 'bg-teal-50 text-teal-800 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold">Lưu trữ Cloud (Supabase)</p>
                        <p className="text-[10px] font-normal text-slate-400">Đồng bộ CSDL & Giữ phiên Zalo</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Actions (Đã bỏ nút Giao việc/Thêm việc theo yêu cầu) */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notiRef}>
              <button
                onClick={() => setShowNotiDropdown(!showNotiDropdown)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                title="Thông báo"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotiDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-teal-600" />
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Thông báo</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        Chưa có thông báo nào.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleReadSingle(n)}
                          className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition flex gap-3 ${
                            !n.is_read ? 'bg-teal-50/50' : ''
                          }`}
                        >
                          <div className="mt-1">
                            <span className={`w-2 h-2 rounded-full block ${!n.is_read ? 'bg-teal-500' : 'bg-transparent'}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                            <p className="text-[12px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {formatVietnamDateTime(n.created_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs">
                  {user.full_name ? user.full_name.split(' ').slice(-1)[0][0] : 'U'}
                </div>
                <div className="hidden lg:block">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-800 max-w-[130px] truncate block">
                      {user.full_name}
                    </span>
                    {isAdmin && <Shield className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 block max-w-[130px] truncate">
                    {user.position || user.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500">{user.degree || ''} - {user.position || ''}</p>
                    <p className="text-[11px] text-teal-600 font-medium mt-0.5">
                      {user.department_name || 'Toàn ngành GDMN'}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Thông tin cá nhân & Đổi mật khẩu
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'dashboard' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tổng quan</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'tasks' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Công việc</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'stats' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Báo cáo</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeTab === 'users' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Danh sách GV</span>
              </button>
              <button
                onClick={() => setActiveTab('zalo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeTab === 'zalo' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Cấu hình Zalo</span>
              </button>
              <button
                onClick={() => setActiveTab('supabase')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeTab === 'supabase' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Lưu Cloud</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

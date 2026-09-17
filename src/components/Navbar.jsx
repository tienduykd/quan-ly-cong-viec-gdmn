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
  ChevronDown
} from 'lucide-react';
import { apiRequest } from '../api';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, onOpenCreateTask, onOpenProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notiRef = useRef(null);
  const userRef = useRef(null);

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
    { id: 'stats', label: 'Thống kê & KPI', icon: BarChart3 },
    { id: 'users', label: 'Nhân sự (21)', icon: Users },
    { id: 'zalo', label: 'Nhắc việc Zalo', icon: MessageSquare, badge: 'Auto' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-base leading-tight tracking-tight">
                  Quản lý Công việc
                </span>
                <span className="text-[11px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                  Ngành GDMN
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Hệ thống điều hành CTĐT Giáo dục Mầm non
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-200/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Create Task Button */}
            <button
              onClick={onOpenCreateTask}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-teal-600/20 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Giao việc / Thêm việc</span>
            </button>

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
                              {new Date(n.created_at).toLocaleString('vi-VN')}
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
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

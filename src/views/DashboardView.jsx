import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Send,
  FileSpreadsheet,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { apiRequest } from '../api';

export default function DashboardView({ user, onSelectTask, onOpenCreateTask, onViewTasksTab, refreshTrigger }) {
  const [stats, setStats] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zaloTriggering, setZaloTriggering] = useState(false);
  const [zaloMessage, setZaloMessage] = useState('');

  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';

  const loadDashboardData = async (silent = false) => {
    if (!silent && !stats) setLoading(true);
    try {
      const [statsData, allTasksData] = await Promise.all([
        apiRequest('/stats/dashboard'),
        apiRequest('/tasks')
      ]);

      setStats(statsData);

      const today = new Date().toISOString().slice(0, 10);
      const dueToday = allTasksData.filter(
        t => t.due_date === today && t.status !== 'completed' && t.status !== 'cancelled'
      );
      const overdue = allTasksData.filter(
        t => t.due_date < today && t.status !== 'completed' && t.status !== 'cancelled'
      );

      setTodayTasks(dueToday);
      setOverdueTasks(overdue);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, refreshTrigger]);

  const handleTriggerZaloDigest = async () => {
    setZaloTriggering(true);
    setZaloMessage('');
    try {
      const res = await apiRequest('/zalo/trigger-digest', { method: 'POST' });
      if (res.success) {
        setZaloMessage(`✅ Đã tạo & gửi bản tin điểm việc hôm nay thành công! (${res.dueCount} việc đến hạn, ${res.overdueCount} việc quá hạn)`);
      } else {
        setZaloMessage('❌ Có lỗi: ' + (res.error || 'Chưa gửi được'));
      }
    } catch (err) {
      setZaloMessage('❌ Lỗi gửi: ' + err.message);
    } finally {
      setZaloTriggering(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await apiRequest('/stats/export-excel');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_Cao_Cong_Viec_GDMN_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Lỗi xuất Excel: ' + err.message);
    }
  };

  const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-teal-200 mb-3 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Ngành Giáo dục Mầm non • Năm học 2026 - 2027</span>
          </div>
          {/* Banner Salutation */}
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Kính chào {user.gender === 'Nam' ? 'Thầy' : 'Cô'} {user.full_name}!
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm mt-1 leading-relaxed">
            {isAdmin
              ? `Chào mừng ${user.gender === 'Nam' ? 'Thầy' : 'Cô'} đến với trung tâm điều hành & quản lý công việc ngành GDMN. Dưới đây là bức tranh tổng thể về tiến độ của các Tổ chuyên môn.`
              : `Chào mừng ${user.gender === 'Nam' ? 'Thầy' : 'Cô'}. Theo dõi tiến độ các nhiệm vụ chuyên môn và rèn nghề được phân công.`}
          </p>

          {/* Quick Action Buttons in Banner */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={onOpenCreateTask}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-900/30 transition active:translate-y-px"
            >
              <PlusCircle className="w-4 h-4" />
              Giao việc / Thêm việc
            </button>

            {isAdmin && (
              <button
                onClick={handleTriggerZaloDigest}
                disabled={zaloTriggering}
                className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl backdrop-blur-sm border border-white/20 transition active:translate-y-px"
              >
                <Send className="w-3.5 h-3.5 text-teal-200" />
                {zaloTriggering ? 'Đang gửi bản tin...' : 'Gửi nhắc việc hôm nay qua Zalo'}
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition active:translate-y-px"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Xuất Báo cáo Excel
            </button>
          </div>

          {zaloMessage && (
            <div className="mt-4 p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-xs text-white">
              {zaloMessage}
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Tổng công việc</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800">{stats.summary.total}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hoàn thành: {stats.summary.completionRate}%
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Đang thực hiện</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-blue-600">{stats.summary.inProgress}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Tiến độ đang chạy</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Chờ nghiệm thu</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-600">{stats.summary.pendingApproval}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Đã hoàn thành 100%</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Đã hoàn thành</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-600">{stats.summary.completed}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Đã nghiệm thu</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-600">Quá hạn xử lý</span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-red-600">{stats.summary.overdue}</span>
              <p className="text-[11px] text-red-500 mt-0.5 font-medium">Cần nhắc nhở gấp</p>
            </div>
          </div>
        </div>
      )}

      {/* Urgent / Overdue Tasks Alert Section */}
      {(todayTasks.length > 0 || overdueTasks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider">
                    Việc đã quá hạn ({overdueTasks.length})
                  </h3>
                </div>
                <button
                  onClick={() => onViewTasksTab('overdue')}
                  className="text-[11px] text-red-700 hover:underline font-semibold flex items-center gap-0.5"
                >
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {overdueTasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="p-3 bg-white rounded-xl border border-red-200 hover:shadow-sm cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-800 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Phụ trách: <strong>{t.assignee_name}</strong> • Hạn chót: <span className="text-red-600 font-bold">{t.due_date}</span>
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-red-600 whitespace-nowrap bg-red-50 px-2 py-1 rounded-lg">
                      {t.progress}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Today */}
          {todayTasks.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Đến hạn hôm nay ({todayTasks.length})
                  </h3>
                </div>
                <button
                  onClick={() => onViewTasksTab('all')}
                  className="text-[11px] text-amber-700 hover:underline font-semibold flex items-center gap-0.5"
                >
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {todayTasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="p-3 bg-white rounded-xl border border-amber-200 hover:shadow-sm cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-800 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Phụ trách: <strong>{t.assignee_name}</strong> • Tiến độ: {t.progress}%
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 whitespace-nowrap bg-amber-100 px-2 py-1 rounded-lg">
                      Hôm nay
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Breakdown */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
              <span>Khối lượng công việc theo 4 Tổ chuyên môn</span>
              <span className="text-xs font-normal text-slate-400">Toàn ngành GDMN</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.deptStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_tasks" name="Tổng số việc" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completed_tasks" name="Đã hoàn thành" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="overdue_tasks" name="Quá hạn" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Task Status Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Trạng thái công việc</h3>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {stats.statusStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
              {stats.statusStats.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-bold text-slate-800">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

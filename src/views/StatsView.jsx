import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Award,
  TrendingUp,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownToLine
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { apiRequest } from '../api';

export default function StatsView({ user }) {
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, tasksData] = await Promise.all([
        apiRequest('/stats/dashboard'),
        apiRequest('/users'),
        apiRequest('/tasks')
      ]);
      setStats(statsData);
      setUsersList(usersData || []);
      setAllTasks(tasksData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Compute lecturer leaderboard
  const lecturerPerformance = usersList.map(u => {
    const assignedTasks = allTasks.filter(t => t.assignee_id === u.id);
    const completedTasks = assignedTasks.filter(t => t.status === 'completed');
    const inProgressTasks = assignedTasks.filter(t => t.status === 'in_progress');
    const overdueTasks = assignedTasks.filter(
      t => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date < new Date().toISOString().slice(0, 10)
    );

    const kpiTasks = completedTasks.filter(t => t.kpi_score !== null);
    const avgKpi = kpiTasks.length > 0
      ? (kpiTasks.reduce((acc, cur) => acc + cur.kpi_score, 0) / kpiTasks.length).toFixed(1)
      : '---';

    return {
      ...u,
      totalAssigned: assignedTasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      overdue: overdueTasks.length,
      avgKpi
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Thống kê & Đánh giá Hiệu suất</h2>
          <p className="text-xs text-slate-500">
            Báo cáo tiến độ và KPI phục vụ kiểm định và tổng kết chương trình đào tạo GDMN
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 self-start sm:self-auto"
        >
          <ArrowDownToLine className="w-4 h-4" />
          Xuất Báo cáo Excel đầy đủ (.xlsx)
        </button>
      </div>

      {/* KPI Highlight Summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Tỷ lệ hoàn thành chung</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.summary.completionRate}%</h3>
              <p className="text-[11px] text-teal-600 font-semibold">{stats.summary.completed} / {stats.summary.total} công việc</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Đang triển khai</p>
              <h3 className="text-2xl font-black text-blue-600">{stats.summary.inProgress}</h3>
              <p className="text-[11px] text-slate-400">Các việc trong tiến trình</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Chờ nghiệm thu</p>
              <h3 className="text-2xl font-black text-amber-600">{stats.summary.pendingApproval}</h3>
              <p className="text-[11px] text-slate-400">Đã nộp báo cáo kết quả</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600">Công việc quá hạn</p>
              <h3 className="text-2xl font-black text-red-600">{stats.summary.overdue}</h3>
              <p className="text-[11px] text-red-500 font-medium">Cần đôn đốc xử lý</p>
            </div>
          </div>
        </div>
      )}

      {/* Department Comparison Chart */}
      {stats && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Biểu đồ tiến độ chi tiết của 4 Tổ chuyên môn</span>
            <span className="text-xs font-medium text-teal-600">Đơn vị tính: Số công việc</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.deptStats} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="total_tasks" name="Tổng số công việc" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed_tasks" name="Đã hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="in_progress_tasks" name="Đang thực hiện" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue_tasks" name="Quá hạn" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lecturer Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Bảng theo dõi hiệu suất từng cán bộ / giảng viên</h3>
            <p className="text-xs text-slate-500">Thống kê khối lượng nhiệm vụ và điểm đánh giá nghiệm thu</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">
            21 Nhân sự
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Họ và tên giảng viên</th>
                <th className="py-3 px-4">Tổ chuyên môn</th>
                <th className="py-3 px-4">Chức danh / Học vị</th>
                <th className="py-3 px-4 text-center">Được giao</th>
                <th className="py-3 px-4 text-center">Hoàn thành</th>
                <th className="py-3 px-4 text-center">Đang làm</th>
                <th className="py-3 px-4 text-center">Quá hạn</th>
                <th className="py-3 px-4 text-center font-bold text-teal-700">Điểm KPI TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lecturerPerformance.map((lp, idx) => (
                <tr key={lp.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <strong className="text-slate-800 text-xs block">{lp.full_name}</strong>
                    <span className="text-[10px] text-slate-400">@{lp.username}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">{lp.department_name || '---'}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{lp.degree}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">{lp.totalAssigned}</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-600">{lp.completed}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600">{lp.inProgress}</td>
                  <td className="py-3 px-4 text-center font-bold text-red-600">
                    {lp.overdue > 0 ? lp.overdue : 0}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-teal-700 whitespace-nowrap">
                    {lp.avgKpi !== '---' ? (
                      <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full">
                        ⭐ {lp.avgKpi} / 10
                      </span>
                    ) : (
                      <span className="text-slate-300">---</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

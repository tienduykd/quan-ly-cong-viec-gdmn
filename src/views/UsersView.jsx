import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  KeyRound,
  RotateCcw,
  Check,
  Search,
  Building,
  GraduationCap
} from 'lucide-react';
import { apiRequest } from '../api';

export default function UsersView({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingUser, setResettingUser] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'dangutphuong';

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, deptsData] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/users/departments')
      ]);
      setUsers(usersData || []);
      setDepartments(deptsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetPassword = async (userObj) => {
    // Extract first name (last word in Vietnamese name) without accents
    const nameParts = userObj.full_name.trim().split(' ');
    const lastName = nameParts[nameParts.length - 1]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();

    const defaultPass = `${lastName}123`;

    if (!window.confirm(`Bạn có chắc muốn đặt lại mật khẩu cho Thầy/Cô ${userObj.full_name} về mặc định (${defaultPass})?`)) {
      return;
    }

    try {
      await apiRequest('/users/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: userObj.id,
          newPassword: defaultPass
        })
      });

      setSuccessMsg(`Đã đặt lại mật khẩu cho ${userObj.full_name} thành công: ${defaultPass}`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      alert('Lỗi đặt lại mật khẩu: ' + err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesDept = selectedDept === 'all' || u.department_id === parseInt(selectedDept);
    const matchesSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.degree && u.degree.toLowerCase().includes(search.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Danh sách Nhân sự Ngành GDMN</h2>
            <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full">
              21 Cán bộ / Giảng viên
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Cơ cấu 4 Tổ chuyên môn thuộc Chương trình Đào tạo Giáo dục Mầm non
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Department tabs */}
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          <button
            onClick={() => setSelectedDept('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedDept === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả 4 Tổ ({users.length})
          </button>
          {departments.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDept(d.id.toString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedDept === d.id.toString() ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.name} ({d.member_count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên, username, học vị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Tổ chuyên môn</th>
                <th className="py-3 px-4">Trình độ & Học vị</th>
                <th className="py-3 px-4">Chức vụ</th>
                <th className="py-3 px-4">Năm sinh</th>
                <th className="py-3 px-4">Tài khoản (User)</th>
                <th className="py-3 px-4 text-center">Mật khẩu mặc định</th>
                {isAdmin && <th className="py-3 px-4 text-center">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u, idx) => {
                const nameParts = u.full_name.trim().split(' ');
                const rawLastName = nameParts[nameParts.length - 1]
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/đ/g, 'd')
                  .replace(/Đ/g, 'D')
                  .toLowerCase();
                const defaultPass = `${rawLastName}123`;

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {u.full_name.split(' ').slice(-1)[0][0]}
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs flex items-center gap-1">
                            {u.full_name}
                            {u.role === 'admin' && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                                Admin (GĐ)
                              </span>
                            )}
                          </strong>
                          <span className="text-[11px] text-slate-400">{u.gender}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-[11px]">
                        {u.department_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">{u.degree}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{u.position}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">{u.birth_date}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <code className="text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50">
                        {u.username}
                      </code>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <code className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                        {defaultPass}
                      </code>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-medium"
                          title="Đặt lại mật khẩu mặc định"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset pass</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

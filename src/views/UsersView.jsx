import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  KeyRound,
  RotateCcw,
  Check,
  Search,
  Building,
  GraduationCap,
  Plus,
  PlusCircle,
  Edit3,
  Trash2,
  Phone,
  MessageSquare,
  X,
  AlertTriangle,
  User,
  Calendar,
  Lock
} from 'lucide-react';
import { apiRequest } from '../api';

export default function UsersView({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form state for Create User
  const [createForm, setCreateForm] = useState({
    full_name: '',
    username: '',
    password: '',
    phone: '',
    zalo_phone: '',
    department_id: '1',
    degree: 'Thạc sĩ GDMN',
    position: 'GV',
    gender: 'Nữ',
    birth_date: '',
    role: 'lecturer'
  });

  // Form state for Edit User
  const [editForm, setEditForm] = useState({
    id: null,
    full_name: '',
    username: '',
    password: '',
    phone: '',
    zalo_phone: '',
    department_id: '',
    degree: '',
    position: '',
    gender: 'Nữ',
    birth_date: '',
    role: 'lecturer'
  });

  const [submitting, setSubmitting] = useState(false);

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

  // ESC key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCreateOpen) setIsCreateOpen(false);
        if (editingUser) setEditingUser(null);
        if (deletingUser) setDeletingUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen, editingUser, deletingUser]);

  // Helper to slugify Vietnamese name for username suggestion
  const generateUsername = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]/g, '');
  };

  const handleCreateNameChange = (val) => {
    const suggestedUsername = generateUsername(val);
    setCreateForm(prev => ({
      ...prev,
      full_name: val,
      username: prev.username === '' || prev.username === generateUsername(prev.full_name) ? suggestedUsername : prev.username,
      password: prev.password === '' ? `${suggestedUsername}123` : prev.password
    }));
  };

  // Open Edit Modal and populate fields
  const handleOpenEdit = (u) => {
    setEditForm({
      id: u.id,
      full_name: u.full_name || '',
      username: u.username || '',
      password: '',
      phone: u.phone || u.zalo_phone || '',
      zalo_phone: u.zalo_phone || u.phone || '',
      department_id: u.department_id ? u.department_id.toString() : '1',
      degree: u.degree || '',
      position: u.position || 'GV',
      gender: u.gender || 'Nữ',
      birth_date: u.birth_date || '',
      role: u.role || 'lecturer'
    });
    setEditingUser(u);
  };

  // Submit Create User
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.full_name.trim() || !createForm.username.trim()) {
      alert('Vui lòng điền Họ tên và Tên đăng nhập.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      setIsCreateOpen(false);
      setSuccessMsg(`Đã thêm nhân sự mới "${createForm.full_name}" thành công! Mật khẩu mặc định: ${res.defaultPassword || 'theo tên'}`);
      setCreateForm({
        full_name: '',
        username: '',
        password: '',
        phone: '',
        zalo_phone: '',
        department_id: departments[0]?.id ? departments[0].id.toString() : '1',
        degree: 'Thạc sĩ GDMN',
        position: 'GV',
        gender: 'Nữ',
        birth_date: '',
        role: 'lecturer'
      });
      await loadData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.full_name.trim()) {
      alert('Họ tên không được để trống.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiRequest(`/users/${editForm.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setEditingUser(null);
      setSuccessMsg(`Đã cập nhật hồ sơ của "${editForm.full_name}" thành công!`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete User
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setSubmitting(true);
    try {
      await apiRequest(`/users/${deletingUser.id}`, {
        method: 'DELETE'
      });
      setDeletingUser(null);
      setSuccessMsg(`Đã xóa nhân sự "${deletingUser.full_name}". Mọi công việc liên quan đã được chuyển giao an toàn cho Quản trị viên.`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      alert('Lỗi khi xóa nhân sự: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset password to default
  const handleResetPassword = async (userObj) => {
    const nameParts = userObj.full_name.trim().split(' ');
    const lastName = nameParts[nameParts.length - 1]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();

    const defaultPass = `${lastName}123`;

    const salutation = userObj.gender === 'Nam' ? 'Thầy' : 'Cô';
    if (!window.confirm(`Bạn có chắc muốn đặt lại mật khẩu cho ${salutation} ${userObj.full_name} về mặc định (${defaultPass})?`)) {
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
      (u.phone && u.phone.includes(search)) ||
      (u.zalo_phone && u.zalo_phone.includes(search)) ||
      (u.degree && u.degree.toLowerCase().includes(search.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-5 min-h-[500px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Danh sách Nhân sự Ngành GDMN</h2>
            <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full">
              {users.length} Cán bộ / Giảng viên
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Cơ cấu 4 Tổ chuyên môn thuộc Chương trình Đào tạo Giáo dục Mầm non
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setCreateForm({
                full_name: '',
                username: '',
                password: '',
                phone: '',
                zalo_phone: '',
                department_id: departments[0]?.id ? departments[0].id.toString() : '1',
                degree: 'Thạc sĩ GDMN',
                position: 'GV',
                gender: 'Nữ',
                birth_date: '',
                role: 'lecturer'
              });
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 transition active:translate-y-px self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm nhân sự mới</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Department tabs */}
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          <button
            type="button"
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
              type="button"
              onClick={() => setSelectedDept(d.id.toString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedDept === d.id.toString() ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.name} ({d.member_count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, username, học vị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[450px]">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-xs relative">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-bold shadow-sm">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Tổ chuyên môn</th>
                <th className="py-3 px-4">Số điện thoại (Zalo)</th>
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
                const displayPhone = u.zalo_phone || u.phone || 'Chưa cập nhật';
                const isMainAdmin = u.username === 'dangutphuong';

                return (
                  <tr
                    key={u.id}
                    onClick={() => isAdmin && handleOpenEdit(u)}
                    className={`hover:bg-teal-50/40 transition ${isAdmin ? 'cursor-pointer' : ''}`}
                    title={isAdmin ? 'Nhấn để chỉnh sửa hồ sơ nhân sự' : ''}
                  >
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                          {u.full_name.split(' ').slice(-1)[0][0]}
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs flex items-center gap-1.5 hover:text-teal-700 transition">
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
                        {u.department_name || 'GDMN'}
                      </span>
                    </td>

                    {/* Phone / Zalo Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.zalo_phone || u.phone ? (
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-blue-200/50">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>{u.zalo_phone || u.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa có SĐT</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">{u.degree}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{u.position}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">{u.birth_date || '---'}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <code className="text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50 font-mono">
                        {u.username}
                      </code>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <code className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                        {defaultPass}
                      </code>
                    </td>

                    {/* Actions Column */}
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-teal-700 hover:text-white hover:bg-teal-600 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold border border-teal-200/80 hover:border-teal-600 shadow-sm"
                            title="Chỉnh sửa thông tin nhân sự"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>

                          {/* Reset password button */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-medium"
                            title="Đặt lại mật khẩu mặc định"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          {!isMainAdmin && u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold border border-red-200/80 hover:border-red-600 shadow-sm"
                              title="Xóa nhân sự này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Thêm nhân sự mới */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-700 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-teal-300" />
                <h3 className="font-bold text-base tracking-tight">Thêm Nhân sự Ngành GDMN mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Thị Lan"
                    value={createForm.full_name}
                    onChange={(e) => handleCreateNameChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Giới tính</label>
                  <select
                    value={createForm.gender}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên đăng nhập (User) *</label>
                  <input
                    type="text"
                    required
                    placeholder="nguyenthilan"
                    value={createForm.username}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value.toLowerCase().trim() }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold text-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mật khẩu khởi tạo</label>
                  <input
                    type="text"
                    placeholder="Mặc định: <tên>123"
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* SĐT / Zalo Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Số điện thoại (Nhận tin nhắn Zalo) - Tùy chọn</span>
                </label>
                <input
                  type="text"
                  placeholder="0912345678 (để trống nếu chưa muốn gửi Zalo)"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value, zalo_phone: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập số điện thoại nếu muốn nhân sự này nhận thông báo nhắc việc tự động qua Zalo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tổ chuyên môn</label>
                  <select
                    value={createForm.department_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chức vụ</label>
                  <input
                    type="text"
                    placeholder="GV, GVC, PGĐ, GĐ..."
                    value={createForm.position}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trình độ & Học vị</label>
                  <input
                    type="text"
                    placeholder="Thạc sĩ GDMN, Tiến sĩ GDH..."
                    value={createForm.degree}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, degree: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ngày sinh (dd/mm/yyyy)</label>
                  <input
                    type="text"
                    placeholder="15/08/1988"
                    value={createForm.birth_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quyền hạn trong hệ thống</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="lecturer">Giảng viên / Cán bộ chuyên trách</option>
                  <option value="leader">Lãnh đạo Tổ / Phó giám đốc</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? 'Đang thêm...' : 'Lưu nhân sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Chỉnh sửa hồ sơ nhân sự */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-700 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-bold text-base tracking-tight">Chỉnh sửa Hồ sơ Nhân sự</h3>
                  <p className="text-[11px] text-teal-200 font-mono">ID: #{editingUser.id} • {editingUser.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Giới tính</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                  </select>
                </div>
              </div>

              {/* SĐT / Zalo Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Số điện thoại (Nhận tin nhắn Zalo) - Tùy chọn</span>
                </label>
                <input
                  type="text"
                  placeholder="Để trống nếu chưa muốn gửi Zalo"
                  value={editForm.zalo_phone || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value, zalo_phone: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập số điện thoại nếu muốn nhân sự này nhận thông báo nhắc việc qua Zalo. Để trống để tạm tắt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên đăng nhập (User)</label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value.toLowerCase().trim() }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold text-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đổi mật khẩu mới</label>
                  <input
                    type="text"
                    placeholder="Để trống nếu giữ nguyên"
                    value={editForm.password}
                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tổ chuyên môn</label>
                  <select
                    value={editForm.department_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chức vụ</label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trình độ & Học vị</label>
                  <input
                    type="text"
                    value={editForm.degree}
                    onChange={(e) => setEditForm(prev => ({ ...prev, degree: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ngày sinh (dd/mm/yyyy)</label>
                  <input
                    type="text"
                    value={editForm.birth_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quyền hạn trong hệ thống</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="lecturer">Giảng viên / Cán bộ chuyên môn</option>
                  <option value="leader">Lãnh đạo Tổ / Phó giám đốc</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa nhân sự */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa Nhân sự?</h3>
              <p className="text-xs text-slate-600 mt-2">
                Bạn có chắc chắn muốn xóa nhân sự <strong className="text-red-700 font-bold">{deletingUser.full_name}</strong> ({deletingUser.username}) khỏi hệ thống?
              </p>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 text-left leading-relaxed">
                🛡️ <strong>Bảo toàn dữ liệu:</strong> Toàn bộ công việc liên quan mà nhân sự này đang phụ trách hoặc giao việc sẽ được tự động chuyển giao về Quản trị viên (Cô Phượng) để bảo đảm không thất thoát dữ liệu đào tạo.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy (ESC)
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSubmit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

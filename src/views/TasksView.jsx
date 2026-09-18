import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  PlusCircle,
  Calendar,
  User,
  Users,
  Paperclip,
  MessageSquare,
  ArrowRightLeft,
  LayoutGrid,
  List,
  AlertTriangle,
  Award,
  MessageCircle,
  ArrowUpDown,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  UserCheck,
  Send,
  Bell
} from 'lucide-react';
import { apiRequest, formatDateDMY } from '../api';

function SearchableUserDropdown({ label, icon: Icon = User, selectedId, onChange, users, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUser = users.find(u => String(u.id) === String(selectedId));

  const filteredUsers = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      (u.department_name && u.department_name.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term))
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shadow-xs ${
          selectedId && selectedId !== 'all'
            ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${selectedId && selectedId !== 'all' ? 'text-teal-600' : 'text-slate-400'}`} />
        <span className="whitespace-nowrap">
          {label}: <span className={selectedUser ? 'text-teal-900 font-bold' : 'text-slate-500 font-normal'}>{selectedUser ? selectedUser.full_name : 'Tất cả'}</span>
        </span>
        {selectedId && selectedId !== 'all' ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('all');
            }}
            title="Bỏ lọc"
            className="p-0.5 hover:bg-teal-200/70 rounded-full ml-0.5 text-teal-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Gõ tìm kiếm tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            <button
              type="button"
              onClick={() => {
                onChange('all');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                !selectedId || selectedId === 'all'
                  ? 'bg-teal-50 text-teal-800 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{placeholder}</span>
              {(!selectedId || selectedId === 'all') && <Check className="w-3.5 h-3.5 text-teal-600" />}
            </button>

            {filteredUsers.map(u => {
              const isSelected = String(u.id) === String(selectedId);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onChange(String(u.id));
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-teal-50 text-teal-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold text-slate-800 truncate">{u.full_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {u.gender === 'female' ? 'Cô' : 'Thầy'} {u.department_name ? `• ${u.department_name}` : ''}
                    </p>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="py-4 text-center text-slate-400 text-xs">
                Không tìm thấy nhân sự phù hợp
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksView({ user, onSelectTask, onOpenCreateTask, initialScope, refreshTrigger }) {
  const [tasks, setTasks] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [scope, setScope] = useState(initialScope || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('due_date_asc'); // Mặc định: sắp đến hạn xếp lên trước
  const [assignerFilter, setAssignerFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [usersList, setUsersList] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [sendingZaloAction, setSendingZaloAction] = useState(null); // { id: number, type: 'new_task' | 'reminder' }

  const isAdmin = user.role === 'admin' || user.username === 'dangutphuong';

  // Load danh sách nhân sự để lọc theo người giao và người xử lý
  useEffect(() => {
    apiRequest('/users')
      .then(data => setUsersList(data || []))
      .catch(err => console.error('Lỗi khi tải danh sách nhân sự:', err));
  }, []);

  const handleSendTaskZalo = async (task, type = 'reminder', e) => {
    if (e) e.stopPropagation();
    const canSend = isAdmin || task.assigner_id === user.id;
    if (!canSend) {
      alert('Chỉ Người giao việc hoặc Quản trị viên mới có thể gửi tin nhắn Zalo cho công việc này.');
      return;
    }

    const isNew = type === 'new_task';
    const actionLabel = isNew ? 'Báo việc mới' : 'Nhắc nhở tiến độ';
    const confirmMsg = isNew
      ? `Gửi tin nhắn Zalo riêng [BÁO VIỆC MỚI] tới ${task.assignee_name} về công việc:\n"${task.title}"?`
      : `Gửi tin nhắn Zalo riêng [NHẮC NHỞ TIẾN ĐỘ] tới ${task.assignee_name} về công việc:\n"${task.title}"?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setSendingZaloAction({ id: task.id, type });
    try {
      const res = await apiRequest(`/tasks/${task.id}/send-zalo`, {
        method: 'POST',
        body: JSON.stringify({ type })
      });
      alert(res.message || `Đã gửi tin nhắn ${actionLabel} qua Zalo thành công!`);
    } catch (err) {
      alert(`Lỗi gửi tin Zalo (${actionLabel}): ` + err.message);
    } finally {
      setSendingZaloAction(null);
    }
  };

  const loadTasks = async (silent = false) => {
    if (!silent && tasks.length === 0) {
      setIsInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    try {
      const params = new URLSearchParams();
      if (scope) params.append('scope', scope);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (search) params.append('search', search);
      if (sortBy) params.append('sort_by', sortBy);
      if (assignerFilter !== 'all') params.append('assigner_id', assignerFilter);
      if (assigneeFilter !== 'all') params.append('assignee_id', assigneeFilter);

      const data = await apiRequest(`/tasks?${params.toString()}`);
      setTasks(data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách công việc:', err);
    } finally {
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [scope, statusFilter, categoryFilter, priorityFilter, search, sortBy, assignerFilter, assigneeFilter, user, refreshTrigger]);

  const hasActiveFilters =
    search ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assignerFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    sortBy !== 'due_date_asc';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setAssignerFilter('all');
    setAssigneeFilter('all');
    setSortBy('due_date_asc');
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'urgent': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">🔴 Khẩn cấp</span>;
      case 'high': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">🟠 Cao</span>;
      case 'medium': return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">🔵 Bình thường</span>;
      default: return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">⚪ Thấp</span>;
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'completed': return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">✅ Đã xong</span>;
      case 'pending_approval': return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">⏳ Chờ duyệt</span>;
      case 'in_progress': return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">🔄 Đang làm</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">📋 Chưa bắt đầu</span>;
    }
  };

  const isTaskOverdue = (task) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    const today = new Date().toISOString().slice(0, 10);
    return task.due_date < today;
  };

  return (
    <div className="space-y-5">
      {/* Header & Smart Scope Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Danh mục Công việc</h2>
          <p className="text-xs text-slate-500">Quản lý và giám sát tiến độ công việc ngành Giáo dục Mầm non</p>
        </div>

        <button
          onClick={onOpenCreateTask}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Giao việc / Thêm việc
        </button>
      </div>

      {/* Primary Scope Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl">
        <button
          onClick={() => setScope('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            scope === 'all' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tất cả công việc
        </button>

        <button
          onClick={() => setScope('assigned_to_me')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            scope === 'assigned_to_me' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Việc tôi làm chính
        </button>

        <button
          onClick={() => setScope('created_by_me')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            scope === 'created_by_me' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Việc tôi giao
        </button>

        <button
          onClick={() => setScope('following')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            scope === 'following' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Việc tôi theo dõi
        </button>

        <button
          onClick={() => setScope('personal')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            scope === 'personal' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🔒 Việc cá nhân
        </button>

        <button
          onClick={() => setScope('overdue')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            scope === 'overdue' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-red-700'
          }`}
        >
          ⚠️ Việc quá hạn
        </button>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, nội dung công việc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sắp xếp hiển thị */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-800 font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="due_date_asc">Theo hạn hoàn thành (sắp đến hạn trước)</option>
                <option value="start_date_asc">Theo ngày bắt đầu (sắp làm trước)</option>
              </select>
            </div>

            {/* Lọc người giao (Có ô gõ tìm kiếm) */}
            <SearchableUserDropdown
              label="Người giao"
              icon={Send}
              selectedId={assignerFilter}
              onChange={setAssignerFilter}
              users={usersList}
              placeholder="Tất cả người giao"
            />

            {/* Lọc người xử lý chính (Có ô gõ tìm kiếm) */}
            <SearchableUserDropdown
              label="Người xử lý"
              icon={UserCheck}
              selectedId={assigneeFilter}
              onChange={setAssigneeFilter}
              users={usersList}
              placeholder="Tất cả người xử lý chính"
            />

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="todo">Chưa thực hiện</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="pending_approval">Chờ nghiệm thu</option>
              <option value="completed">Đã hoàn thành</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="Chuyên môn GDMN">Chuyên môn GDMN</option>
              <option value="NCKH">Nghiên cứu KH (NCKH)</option>
              <option value="Rèn NVSP">Rèn NVSP & Thực tập</option>
              <option value="Đảm bảo chất lượng">Đảm bảo CLGD</option>
              <option value="Công tác đoàn thể">Công tác đoàn thể</option>
              <option value="Việc cá nhân">Việc cá nhân</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Tất cả mức ưu tiên</option>
              <option value="urgent">🔴 Khẩn cấp</option>
              <option value="high">🟠 Cao</option>
              <option value="medium">🔵 Bình thường</option>
              <option value="low">⚪ Thấp</option>
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Đặt lại bộ lọc"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs transition flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đặt lại</span>
              </button>
            )}

            {/* View toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition ${viewMode === 'table' ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                title="Dạng bảng"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                title="Dạng thẻ"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task List Content */}
      <div className="min-h-[480px] relative">
        {/* Top fetching progress bar */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-100 overflow-hidden z-20 rounded-t-2xl">
            <div className="h-full bg-teal-600 animate-pulse w-full"></div>
          </div>
        )}

        {isInitialLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center min-h-[480px] flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-500 text-xs font-medium">Đang tải danh sách công việc...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center min-h-[480px] flex flex-col items-center justify-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Không tìm thấy công việc nào</h3>
            <p className="text-slate-400 text-xs mt-1">
              Không có công việc nào khớp với bộ lọc hiện tại hoặc bạn chưa được giao việc trong nhóm này.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[480px] transition-opacity duration-150 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-xs relative">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-bold shadow-sm">
                <tr>
                  <th className="py-3 px-2 w-12 text-center bg-slate-100 whitespace-nowrap">Mã</th>
                  <th className="py-3 px-4 min-w-[300px] sm:min-w-[380px] lg:min-w-[440px] bg-slate-100">Tên công việc</th>
                  <th className="py-3 px-2.5 w-28 lg:w-32 bg-slate-100 whitespace-nowrap">Người giao</th>
                  <th className="py-3 px-2.5 w-32 lg:w-36 bg-slate-100 whitespace-nowrap">Người xử lý chính</th>
                  <th className="py-3 px-2 w-28 text-center bg-slate-100 whitespace-nowrap text-emerald-600 font-extrabold tracking-wide">START</th>
                  <th className="py-3 px-2 w-28 text-center bg-slate-100 whitespace-nowrap text-red-600 font-extrabold tracking-wide">DEADLINE</th>
                  <th className="py-3 px-2 w-24 text-center bg-slate-100 whitespace-nowrap">Tiến độ</th>
                  <th className="py-3 px-2 w-28 text-center bg-slate-100 whitespace-nowrap">Trạng thái</th>
                  <th className="py-3 px-2 w-24 text-center bg-slate-100 whitespace-nowrap">Ưu tiên</th>
                  <th className="py-3 px-2 min-w-[210px] text-center bg-slate-100 whitespace-nowrap">Gửi thông báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map(t => {
                  const overdue = isTaskOverdue(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTask(t.id)}
                      className="hover:bg-teal-50/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {t.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 text-xs hover:text-teal-700 transition leading-snug line-clamp-3 break-words whitespace-normal">
                            {t.title}
                          </span>
                          {t.is_personal === 1 && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-semibold flex-shrink-0">
                              Cá nhân
                            </span>
                          )}
                          {t.pending_transfer_count > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5 flex-shrink-0">
                              <ArrowRightLeft className="w-3 h-3" /> Xin chuyển
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400 mt-1">
                          <span className="font-medium text-slate-500">{t.category}</span>
                          {t.department_name && (
                            <>
                              <span>•</span>
                              <span>{t.department_name}</span>
                            </>
                          )}
                          {t.attachment_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Paperclip className="w-3 h-3" /> {t.attachment_count}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 font-medium text-slate-700 whitespace-nowrap text-xs">
                        {t.assigner_name}
                      </td>
                      <td className="py-3 px-2.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg text-xs inline-block">
                          {t.assignee_name}
                        </span>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-center">
                        <span className="font-bold text-xs text-emerald-600">
                          {formatDateDMY(t.start_date)}
                        </span>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-center">
                        <span className={`font-bold text-xs ${overdue ? 'text-red-600' : 'text-red-500'}`}>
                          {formatDateDMY(t.due_date)}
                        </span>
                        {overdue && (
                          <span className="block text-[10px] font-bold text-red-500">Trễ hạn</span>
                        )}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-center">
                        <div className="w-16 mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${t.progress === 100 ? 'bg-emerald-500' : 'bg-teal-600'}`}
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-0.5 block text-center">
                          {t.progress}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Nút 1 (Bên trái): Báo việc mới */}
                          <button
                            type="button"
                            onClick={(e) => handleSendTaskZalo(t, 'new_task', e)}
                            disabled={sendingZaloAction?.id === t.id}
                            title={`Gửi tin Zalo Báo việc mới cho ${t.assignee_name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-2xs transition disabled:opacity-50"
                          >
                            <Bell className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              {sendingZaloAction?.id === t.id && sendingZaloAction?.type === 'new_task'
                                ? 'Đang gửi...'
                                : 'Báo việc mới'}
                            </span>
                          </button>

                          {/* Nút 2 (Bên phải): Nhắc nhở */}
                          <button
                            type="button"
                            onClick={(e) => handleSendTaskZalo(t, 'reminder', e)}
                            disabled={sendingZaloAction?.id === t.id}
                            title={`Gửi tin Zalo Nhắc nhở tiến độ cho ${t.assignee_name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition disabled:opacity-50"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              {sendingZaloAction?.id === t.id && sendingZaloAction?.type === 'reminder'
                                ? 'Đang gửi...'
                                : 'Nhắc nhở'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID / CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(t => {
            const overdue = isTaskOverdue(t);
            return (
              <div
                key={t.id}
                onClick={() => onSelectTask(t.id)}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(t.status)}
                      {getPriorityBadge(t.priority)}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">CV-{t.id}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2 hover:text-teal-700 transition">
                    {t.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {t.description || 'Không có mô tả chi tiết.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Người xử lý:</span>
                    <strong className="text-slate-800">{t.assignee_name}</strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-bold">START:</span>
                    <span className="font-bold text-emerald-600">
                      {formatDateDMY(t.start_date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-700 font-bold">DEADLINE:</span>
                    <span className={`font-bold ${overdue ? 'text-red-600' : 'text-red-500'}`}>
                      {formatDateDMY(t.due_date)} {overdue && '(Quá hạn)'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${t.progress === 100 ? 'bg-emerald-500' : 'bg-teal-600'}`}
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Tiến độ</span>
                      <span className="font-bold text-slate-700">{t.progress}%</span>
                    </div>
                  </div>

                  {/* Zalo Reminder Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-slate-500">Gửi Zalo:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => handleSendTaskZalo(t, 'new_task', e)}
                        disabled={sendingZaloAction?.id === t.id}
                        title={`Gửi tin Zalo Báo việc mới cho ${t.assignee_name}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition disabled:opacity-50"
                      >
                        <Bell className="w-3 h-3 text-teal-600" />
                        <span>{sendingZaloAction?.id === t.id && sendingZaloAction?.type === 'new_task' ? 'Đang gửi...' : 'Báo việc mới'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSendTaskZalo(t, 'reminder', e)}
                        disabled={sendingZaloAction?.id === t.id}
                        title={`Gửi tin Zalo Nhắc nhở tiến độ cho ${t.assignee_name}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition disabled:opacity-50"
                      >
                        <MessageCircle className="w-3 h-3 text-blue-600" />
                        <span>{sendingZaloAction?.id === t.id && sendingZaloAction?.type === 'reminder' ? 'Đang gửi...' : 'Nhắc nhở'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}

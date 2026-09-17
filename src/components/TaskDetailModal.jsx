import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  Paperclip,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Award,
  Upload,
  MessageCircle,
  FileText,
  Edit3,
  Save,
  Trash2,
  Search
} from 'lucide-react';
import { apiRequest } from '../api';

export default function TaskDetailModal({ taskId, isOpen, onClose, currentUser, onTaskUpdated }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentProgress, setCommentProgress] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('Chuyên môn GDMN');
  const [editPriority, setEditPriority] = useState('medium');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editAssigneeSearch, setEditAssigneeSearch] = useState('');
  const [editFollowers, setEditFollowers] = useState([]);
  const [editFollowerSearch, setEditFollowerSearch] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Transfer modal state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  // KPI Evaluation state
  const [showKpiDialog, setShowKpiDialog] = useState(false);
  const [kpiScore, setKpiScore] = useState('9.5');
  const [kpiEvaluation, setKpiEvaluation] = useState('Tốt');
  const [kpiNote, setKpiNote] = useState('');

  // Upload result files state
  const [resultFiles, setResultFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // ESC key listener to close modal or cancel sub-dialogs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showTransferDialog) setShowTransferDialog(false);
        else if (showKpiDialog) setShowKpiDialog(false);
        else if (isEditing) setIsEditing(false);
        else onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showTransferDialog, showKpiDialog, isEditing, onClose]);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/tasks/${taskId}`);
      setTask(data);
      setCommentProgress(data.progress ? data.progress.toString() : '0');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
      apiRequest('/users')
        .then(setAllUsers)
        .catch(console.error);
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'dangutphuong';
  const isAssigner = task && task.assigner_id === currentUser.id;
  const isAssignee = task && task.assignee_id === currentUser.id;
  const canManage = isAdmin || isAssigner;

  // Initialize edit mode with current task values
  const handleStartEdit = () => {
    setEditTitle(task.title || '');
    setEditDesc(task.description || '');
    setEditCategory(task.category || 'Chuyên môn GDMN');
    setEditPriority(task.priority || 'medium');
    setEditStartDate(task.start_date || '');
    setEditDueDate(task.due_date || '');
    setEditAssigneeId(task.assignee_id ? task.assignee_id.toString() : '');
    setEditAssigneeSearch('');
    setEditFollowers(task.followers ? task.followers.map(f => f.user_id) : []);
    setEditFollowerSearch('');
    setIsEditing(true);
  };

  // Save changes from Edit Mode
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDueDate) {
      alert('Vui lòng nhập tiêu đề và hạn chót hoàn thành.');
      return;
    }
    setSavingEdit(true);
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          category: editCategory,
          priority: editPriority,
          start_date: editStartDate,
          due_date: editDueDate,
          assignee_id: parseInt(editAssigneeId),
          followers: editFollowers
        })
      });
      setIsEditing(false);
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert('Lỗi lưu chỉnh sửa: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attId, originalName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tệp "${originalName}"?`)) return;
    try {
      await apiRequest(`/tasks/${taskId}/attachments/${attId}`, { method: 'DELETE' });
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert('Lỗi khi xóa tệp: ' + err.message);
    }
  };

  // Handle adding a comment / progress note
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await apiRequest(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          comment: newComment.trim(),
          progress: commentProgress ? parseInt(commentProgress) : null
        })
      });
      setNewComment('');
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle quick progress slider update
  const handleUpdateProgress = async (newProg) => {
    try {
      let newStatus = task.status;
      if (newProg === 100) newStatus = 'pending_approval';
      else if (newProg > 0 && task.status === 'todo') newStatus = 'in_progress';

      await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          progress: newProg,
          status: newStatus
        })
      });
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle status change directly
  const handleStatusChange = async (newStatus) => {
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit transfer request
  const handleRequestTransfer = async (e) => {
    e.preventDefault();
    if (!targetUserId || !transferReason.trim()) {
      alert('Vui lòng chọn người nhận chuyển giao và nhập lý do.');
      return;
    }

    try {
      await apiRequest(`/tasks/${taskId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({
          target_user_id: targetUserId,
          reason: transferReason.trim()
        })
      });
      alert('Đã gửi đề xuất chuyển giao! Người giao việc sẽ nhận được thông báo để phê duyệt.');
      setShowTransferDialog(false);
      setTransferReason('');
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  // Review transfer request (Assigner or Admin)
  const handleReviewTransfer = async (requestId, approved) => {
    try {
      await apiRequest(`/tasks/${taskId}/transfer/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: approved ? 'approved' : 'rejected',
          review_note: reviewNote
        })
      });
      alert(approved ? 'Đã phê duyệt chuyển giao thành công!' : 'Đã từ chối đề xuất chuyển giao.');
      setReviewNote('');
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit KPI Evaluation
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/tasks/${taskId}/evaluate`, {
        method: 'POST',
        body: JSON.stringify({
          kpi_score: parseFloat(kpiScore),
          kpi_evaluation: kpiEvaluation,
          kpi_note: kpiNote
        })
      });
      alert('Đã nghiệm thu và đánh giá hiệu suất thành công!');
      setShowKpiDialog(false);
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  // Upload result documents
  const handleUploadResultFiles = async () => {
    if (resultFiles.length === 0) return;
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      formData.append('is_result_document', '1');
      resultFiles.forEach(file => {
        formData.append('files', file);
      });

      await apiRequest(`/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData
      });

      alert('Tải lên tệp kết quả thành công!');
      setResultFiles([]);
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingFiles(false);
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'urgent': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">🔴 Khẩn cấp</span>;
      case 'high': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">🟠 Cao</span>;
      case 'medium': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">🔵 Bình thường</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">⚪ Thấp</span>;
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'completed': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">✅ Đã hoàn thành</span>;
      case 'pending_approval': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">⏳ Chờ nghiệm thu</span>;
      case 'in_progress': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">🔄 Đang thực hiện</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">📋 Chưa bắt đầu</span>;
    }
  };

  // Filtered users for editing Assignee & Followers
  const filteredEditAssignees = allUsers.filter(u => {
    if (!editAssigneeSearch.trim()) return true;
    const term = editAssigneeSearch.toLowerCase();
    return u.full_name.toLowerCase().includes(term) || (u.department_name && u.department_name.toLowerCase().includes(term));
  });

  const filteredEditFollowers = allUsers
    .filter(u => u.id.toString() !== editAssigneeId)
    .filter(u => {
      if (!editFollowerSearch.trim()) return true;
      const term = editFollowerSearch.toLowerCase();
      return u.full_name.toLowerCase().includes(term) || (u.department_name && u.department_name.toLowerCase().includes(term));
    });

  const handleToggleEditFollower = (uid) => {
    if (editFollowers.includes(uid)) {
      setEditFollowers(editFollowers.filter(id => id !== uid));
    } else {
      setEditFollowers([...editFollowers, uid]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-mono text-slate-400">CV-{taskId?.toString().padStart(4, '0')}</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-medium">
              {task?.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canManage && !isEditing && task && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" /> Sửa việc
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white"
              title="Đóng (Phím ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Đang tải thông tin công việc...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : isEditing ? (
          /* EDIT MODE FORM */
          <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 font-medium flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>Chế độ chỉnh sửa công việc: Mọi thay đổi sẽ tự động gửi thông báo tới Người giao việc, Người xử lý chính và Người theo dõi qua Zalo & In-App.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tiêu đề công việc *</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả & Yêu cầu</label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phân loại</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Chuyên môn GDMN">Chuyên môn GDMN</option>
                  <option value="NCKH">Nghiên cứu khoa học (NCKH)</option>
                  <option value="Rèn NVSP">Rèn NVSP & Thực tập</option>
                  <option value="Đảm bảo chất lượng">Đảm bảo chất lượng (KĐCL)</option>
                  <option value="Công tác đoàn thể">Công tác đoàn thể</option>
                  <option value="Hành chính">Hành chính / Báo cáo</option>
                  <option value="Việc cá nhân">Việc cá nhân</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mức ưu tiên</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="urgent">🔴 Khẩn cấp</option>
                  <option value="high">🟠 Cao</option>
                  <option value="medium">🔵 Bình thường</option>
                  <option value="low">⚪ Thấp</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hạn hoàn thành (Deadline) *</label>
                <input
                  type="date"
                  required
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-red-600"
                />
              </div>
            </div>

            {/* Change Assignee with search filter */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Điều chỉnh Người xử lý chính *
              </label>
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Gõ tên để lọc nhanh danh sách giảng viên..."
                    value={editAssigneeSearch}
                    onChange={(e) => setEditAssigneeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <select
                  value={editAssigneeId}
                  onChange={(e) => setEditAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                >
                  {filteredEditAssignees.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.position || 'GV'} - {u.department_name || ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Change Followers with search filter */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Người theo dõi ({editFollowers.length} đã chọn)
                </label>
                {editFollowers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEditFollowers([])}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Gõ tên để lọc danh sách người theo dõi..."
                  value={editFollowerSearch}
                  onChange={(e) => setEditFollowerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="max-h-36 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {filteredEditFollowers.map(u => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition">
                    <input
                      type="checkbox"
                      checked={editFollowers.includes(u.id)}
                      onChange={() => handleToggleEditFollower(u.id)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-medium text-slate-800">{u.full_name}</span>
                    <span className="text-[10px] text-slate-400">({u.department_code})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Manage Attachments in Edit Mode (Delete button) */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Quản lý tài liệu đính kèm (Nhấn vào biểu tượng thùng rác để xóa):
                </label>
                <div className="space-y-1.5">
                  {task.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="truncate pr-2 font-medium text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        {att.original_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id, att.original_name)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Xóa tài liệu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons in Edit Mode */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy sửa
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        ) : (
          /* VIEW MODE */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Status Bar */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {getStatusBadge(task.status)}
                {getPriorityBadge(task.priority)}
                {task.is_personal === 1 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    🔒 Việc cá nhân
                  </span>
                )}
                {task.department_name && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                    {task.department_name}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{task.title}</h2>
              {task.description && (
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {task.description}
                </p>
              )}
            </div>

            {/* Roles Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Người giao việc</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    {task.assigner_name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{task.assigner_name}</p>
                    <p className="text-[10px] text-slate-500">{task.assigner_position || 'GĐ/GV'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Người xử lý chính</span>
                  {isAssignee && task.status !== 'completed' && (
                    <button
                      onClick={() => setShowTransferDialog(true)}
                      className="text-[10px] text-teal-600 hover:text-teal-800 font-bold flex items-center gap-0.5 underline"
                    >
                      <ArrowRightLeft className="w-3 h-3" /> Xin chuyển
                    </button>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {task.assignee_name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{task.assignee_name}</p>
                    <p className="text-[10px] text-slate-500">{task.assignee_position || 'GV'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hạn chót</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-800">{task.due_date}</span>
                  {new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                      Quá hạn
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Followers List */}
            {task.followers && task.followers.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Người theo dõi ({task.followers.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {task.followers.map(f => (
                    <span key={f.user_id} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      {f.full_name} <span className="text-slate-400 text-[10px]">({f.department_name || 'GDMN'})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar & Update Controls */}
            <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-teal-900">Tiến độ thực hiện: {task.progress}%</span>
                <span className="text-xs font-semibold text-teal-700">
                  {task.progress === 100 ? 'Đã hoàn thành 100%' : `${100 - task.progress}% còn lại`}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    task.progress === 100 ? 'bg-emerald-500' : 'bg-teal-600'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              {/* Slider for assignee/admin */}
              {(isAssignee || canManage) && task.status !== 'completed' && (
                <div className="mt-4 pt-3 border-t border-teal-100/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-xs font-semibold text-slate-700">Kéo cập nhật:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={task.progress}
                      onChange={(e) => handleUpdateProgress(parseInt(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {task.status !== 'pending_approval' && task.progress >= 90 && (
                      <button
                        onClick={() => handleStatusChange('pending_approval')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition"
                      >
                        Báo cáo hoàn thành (Chờ duyệt)
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setShowKpiDialog(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" /> Nghiệm thu & Đánh giá KPI
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* KPI Evaluation Result Display (if evaluated) */}
            {task.kpi_score !== null && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900">
                        ĐÃ NGHIỆM THU - XẾP LOẠI: {task.kpi_evaluation?.toUpperCase()}
                      </span>
                      <p className="text-[11px] text-emerald-700">
                        Điểm số: <strong className="text-sm">{task.kpi_score} / 10</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full">
                    Hoàn tất
                  </span>
                </div>
                {task.kpi_note && (
                  <p className="text-xs text-emerald-800 mt-2 bg-white/60 p-2.5 rounded-xl border border-emerald-200/50">
                    <strong>Nhận xét:</strong> {task.kpi_note}
                  </p>
                )}
              </div>
            )}

            {/* Pending Transfer Requests Review */}
            {task.transferRequests && task.transferRequests.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  Yêu cầu chuyển giao công việc:
                </p>
                {task.transferRequests.map(req => (
                  <div key={req.id} className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {req.requester_name} đề xuất chuyển cho 👉 <span className="text-teal-700 font-bold">{req.target_name}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {req.status === 'pending' ? 'Đang chờ duyệt' : req.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                      </span>
                    </div>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <strong>Lý do:</strong> {req.reason}
                    </p>

                    {req.status === 'pending' && canManage && (
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Ghi chú phản hồi phê duyệt (tùy chọn)..."
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleReviewTransfer(req.id, false)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition"
                          >
                            Từ chối
                          </button>
                          <button
                            onClick={() => handleReviewTransfer(req.id, true)}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition"
                          >
                            Chấp thuận chuyển giao
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Attachments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-teal-600" />
                  Tài liệu đính kèm ({task.attachments ? task.attachments.length : 0})
                </h4>
              </div>

              {task.attachments && task.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {task.attachments.map(att => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition flex items-center justify-between text-xs group"
                    >
                      <a
                        href={`/uploads/${att.filename}`}
                        download={att.original_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 truncate pr-2 flex-1"
                      >
                        <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate group-hover:text-teal-700">
                            {att.original_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {att.is_result_document ? '⭐ Minh chứng kết quả' : 'Tài liệu hướng dẫn'} • {att.uploader_name}
                          </p>
                        </div>
                      </a>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <a
                          href={`/uploads/${att.filename}`}
                          download={att.original_name}
                          className="p-1 text-slate-400 hover:text-teal-600 transition"
                          title="Tải về"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {(canManage || att.uploader_id === currentUser.id) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id, att.original_name)}
                            className="p-1 text-slate-400 hover:text-red-600 transition"
                            title="Xóa tài liệu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa có tài liệu nào được đính kèm.</p>
              )}

              {/* Upload Result File Box for Assignee */}
              {isAssignee && task.status !== 'completed' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 mb-1">
                    Nộp thêm minh chứng / sản phẩm hoàn thành:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setResultFiles(Array.from(e.target.files))}
                      className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-100 file:text-teal-700 hover:file:bg-teal-200"
                    />
                    {resultFiles.length > 0 && (
                      <button
                        onClick={handleUploadResultFiles}
                        disabled={uploadingFiles}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        {uploadingFiles ? 'Đang tải...' : 'Tải lên ngay'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Comments & Discussion Feed */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-teal-600" />
                Nhật ký trao đổi & Tiến trình ({task.comments ? task.comments.length : 0})
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{c.author_name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có bình luận nào.</p>
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Nhập ý kiến trao đổi hoặc ghi chú tiến độ..."
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Transfer Request Dialog */}
        {showTransferDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-teal-600" />
                Đề xuất chuyển giao người xử lý chính
              </h3>
              <p className="text-xs text-slate-600">
                Đề xuất này sẽ được gửi tới Người giao việc (<strong>{task.assigner_name}</strong>) để xem xét và phê duyệt.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chọn giảng viên thay thế:</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
                >
                  <option value="">-- Chọn giảng viên --</option>
                  {allUsers
                    .filter(u => u.id !== task.assignee_id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.department_name || ''})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lý do xin chuyển giao:</label>
                <textarea
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Nêu rõ lý do (trùng lịch công tác, khối lượng giảng dạy, chuyên môn phù hợp hơn...)"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="button"
                  onClick={handleRequestTransfer}
                  className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                >
                  Gửi yêu cầu phê duyệt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: KPI Evaluation Dialog */}
        {showKpiDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Nghiệm thu & Đánh giá Hiệu suất (KPI)
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Điểm số KPI (thang điểm 10):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={kpiScore}
                  onChange={(e) => setKpiScore(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold text-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Xếp loại chất lượng:</label>
                <select
                  value={kpiEvaluation}
                  onChange={(e) => setKpiEvaluation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-semibold"
                >
                  <option value="Xuất sắc">🌟 Xuất sắc (Hoàn thành vượt tiến độ/chất lượng cao)</option>
                  <option value="Tốt">👍 Tốt (Đúng hạn, đầy đủ yêu cầu)</option>
                  <option value="Đạt">👌 Đạt (Cơ bản đạt yêu cầu)</option>
                  <option value="Cần cố gắng">⚠️ Cần cố gắng (Trễ hạn hoặc cần sửa đổi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nhận xét & Ghi chú nghiệm thu:</label>
                <textarea
                  rows={3}
                  value={kpiNote}
                  onChange={(e) => setKpiNote(e.target.value)}
                  placeholder="Ghi nhận nỗ lực hoặc nhắc nhở rút kinh nghiệm..."
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKpiDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Đóng (ESC)
                </button>
                <button
                  type="button"
                  onClick={handleSubmitEvaluation}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Lưu nghiệm thu & Đánh giá
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Nhấn phím <strong>ESC</strong> để đóng nhanh
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Paperclip, Users, Calendar, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated, currentUser }) {
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Chuyên môn GDMN');
  const [priority, setPriority] = useState('medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [isPersonal, setIsPersonal] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch users list
      apiRequest('/users')
        .then(data => {
          setUsers(data || []);
          if (!assigneeId && data.length > 0) {
            // Default assignee: current user
            setAssigneeId(currentUser.id.toString());
            setDepartmentId(currentUser.department_id ? currentUser.department_id.toString() : '');
          }
        })
        .catch(console.error);

      // Default due date to 7 days from now
      const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      setDueDate(defaultDue);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleFollowerToggle = (userId) => {
    const idNum = parseInt(userId);
    if (selectedFollowers.includes(idNum)) {
      setSelectedFollowers(selectedFollowers.filter(id => id !== idNum));
    } else {
      setSelectedFollowers([...selectedFollowers, idNum]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !dueDate) {
      setError('Vui lòng nhập tiêu đề và hạn chót hoàn thành.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', isPersonal ? 'Việc cá nhân' : category);
      formData.append('priority', priority);
      formData.append('start_date', startDate);
      formData.append('due_date', dueDate);
      formData.append('assignee_id', isPersonal ? currentUser.id : assigneeId);
      formData.append('department_id', departmentId || '');
      formData.append('is_personal', isPersonal ? '1' : '0');

      if (!isPersonal && selectedFollowers.length > 0) {
        formData.append('followers', JSON.stringify(selectedFollowers));
      }

      files.forEach(file => {
        formData.append('files', file);
      });

      await apiRequest('/tasks', {
        method: 'POST',
        body: formData
      });

      // Reset form
      setTitle('');
      setDescription('');
      setFiles([]);
      setSelectedFollowers([]);
      setIsPersonal(false);
      onTaskCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-300" />
            <h3 className="font-bold text-base tracking-tight">
              {isPersonal ? 'Tạo việc cá nhân tự theo dõi' : 'Giao việc mới / Tạo công việc'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle personal task */}
          <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200/80 rounded-xl">
            <div>
              <p className="text-xs font-bold text-teal-900">Chế độ công việc cá nhân</p>
              <p className="text-[11px] text-teal-700">Chỉ Thầy/Cô nhìn thấy để tự theo dõi tiến độ cá nhân</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPersonal}
                onChange={(e) => setIsPersonal(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tiêu đề công việc <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="vd: Hoàn thiện hồ sơ rèn nghề Sư phạm K46..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nội dung & Yêu cầu cụ thể
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết mục tiêu, các bước thực hiện và sản phẩm đầu ra mong đợi..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phân loại công việc
              </label>
              <select
                disabled={isPersonal}
                value={isPersonal ? 'Việc cá nhân' : category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
              >
                <option value="Chuyên môn GDMN">Chuyên môn GDMN</option>
                <option value="NCKH">Nghiên cứu khoa học (NCKH)</option>
                <option value="Rèn NVSP">Rèn NVSP & Thực tập</option>
                <option value="Đảm bảo chất lượng">Đảm bảo chất lượng (KĐCL)</option>
                <option value="Công tác đoàn thể">Công tác đoàn thể / Hội nghị</option>
                <option value="Hành chính">Hành chính / Báo cáo</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
              >
                <option value="urgent">🔴 Khẩn cấp (Cần xử lý ngay)</option>
                <option value="high">🟠 Cao (Ưu tiên)</option>
                <option value="medium">🔵 Bình thường</option>
                <option value="low">⚪ Thấp</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Hạn hoàn thành (Deadline) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-semibold text-red-600"
              />
            </div>
          </div>

          {/* Roles: Main Assignee & Department */}
          {!isPersonal && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Người xử lý chính <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white font-medium"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.position || 'GV'} - {u.department_name || ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tổ chuyên môn phụ trách
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                  >
                    <option value="">Toàn ngành GDMN</option>
                    <option value="1">Tổ Phương pháp</option>
                    <option value="2">Tổ Tâm lý - Giáo dục</option>
                    <option value="3">Tổ Nghiệp vụ sư phạm (NVSP)</option>
                    <option value="4">Tổ Giáo dục Nghệ thuật</option>
                  </select>
                </div>
              </div>

              {/* Followers (Người theo dõi - chỉ xem) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Người theo dõi (Xem tiến độ, không chịu trách nhiệm xử lý chính)
                </label>
                <div className="max-h-36 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {users
                    .filter(u => u.id.toString() !== assigneeId)
                    .map(u => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded-lg transition">
                        <input
                          type="checkbox"
                          checked={selectedFollowers.includes(u.id)}
                          onChange={() => handleFollowerToggle(u.id)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="font-medium text-slate-800">{u.full_name}</span>
                        <span className="text-[10px] text-slate-400">({u.department_code})</span>
                      </label>
                    ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Đã chọn {selectedFollowers.length} người theo dõi.
                </p>
              </div>
            </div>
          )}

          {/* File Attachments */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Đính kèm tài liệu, văn bản, biểu mẫu (Word, Excel, PDF, Ảnh...)
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="task-file-upload"
              />
              <label htmlFor="task-file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 text-teal-600 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  Nhấn để chọn tệp đính kèm hoặc kéo thả vào đây
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Hỗ trợ tối đa 10 tệp (PDF, DOCX, XLSX, PNG, JPG...), tối đa 50MB/tệp
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-slate-100 rounded-lg">
                    <span className="flex items-center gap-1.5 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                      {f.name}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Đang khởi tạo...' : (isPersonal ? 'Lưu việc cá nhân' : 'Xác nhận giao việc')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

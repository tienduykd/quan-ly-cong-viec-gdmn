const API_URL = '/api';

export function getAuthToken() {
  return localStorage.getItem('gdmn_token');
}

export function setAuthToken(token) {
  if (token) localStorage.setItem('gdmn_token', token);
  else localStorage.removeItem('gdmn_token');
}

export function getStoredUser() {
  const user = localStorage.getItem('gdmn_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('gdmn_user', JSON.stringify(user));
  else localStorage.removeItem('gdmn_user');
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, set Content-Type to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expired or invalid
    setAuthToken(null);
    setStoredUser(null);
    window.location.reload();
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }

  // Check if blob (for file download like Excel)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument')) {
    return response.blob();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Có lỗi xảy ra khi gọi máy chủ.');
  }

  return data;
}

export function formatVietnamDateTime(dateStr) {
  if (!dateStr) return '';
  let s = String(dateStr).trim();
  // If string is sqlite timestamp like "2026-09-17 02:33:31", parse as UTC
  if (!s.endsWith('Z') && !s.includes('+')) {
    if (s.includes(' ')) {
      s = s.replace(' ', 'T') + 'Z';
    } else if (s.includes('T')) {
      s = s + 'Z';
    }
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

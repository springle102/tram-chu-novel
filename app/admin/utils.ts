const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchAdmin(endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.message || `Request failed with status ${res.status}`;
    if (res.status === 401 || res.status === 404 || errorMessage.includes('Không tìm thấy tài khoản')) {
      logoutAdmin();
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export function getApiBaseUrl() {
  return API;
}

export function getAdminToken(): string | null {
  return localStorage.getItem('admin_token');
}

export function getAdminUser(): { id: string; fullName: string; email: string; role: string; avatarUrl?: string } | null {
  const raw = localStorage.getItem('admin_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logoutAdmin() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

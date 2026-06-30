'use client';

import { useState, useEffect } from 'react';
import { fetchAdmin, getAdminUser, formatDate } from '../utils';

interface User {
  id: string;
  username: string;
  display_name?: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_banned: boolean;
  banned_at?: string;
  ban_reason?: string;
  created_at: string;
  last_login_at?: string;
}

export default function AdminReadersPage() {
  const [readers, setReaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Search
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReaders, setTotalReaders] = useState(0);

  // Ban action states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banActionLoading, setBanActionLoading] = useState(false);

  useEffect(() => {
    const loggedUser = getAdminUser();
    if (loggedUser && loggedUser.role !== 'admin') {
      setError('Bạn không có quyền truy cập trang này.');
      setLoading(false);
      return;
    }
    loadReaders();
  }, [page]);

  const loadReaders = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '10',
        search,
        role: 'reader',
      });
      const res = await fetchAdmin(`/api/admin/users?${queryParams.toString()}`);
      if (res.success) {
        setReaders(res.data.users);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalReaders(res.data.pagination.total || 0);
      } else {
        throw new Error(res.error || 'Không tải được danh sách độc giả.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối tới hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReaders();
  };

  const handleBanToggleClick = (user: User) => {
    setSelectedUser(user);
    setBanReason(user.ban_reason || '');
  };

  const handleConfirmBanToggle = async () => {
    if (!selectedUser) return;
    setBanActionLoading(true);
    try {
      const isBanning = !selectedUser.is_banned;
      const res = await fetchAdmin(`/api/admin/users/${selectedUser.id}/ban`, {
        method: 'PATCH',
        body: JSON.stringify({
          ban: isBanning,
          reason: isBanning ? banReason || 'Vi phạm quy định hệ thống' : null,
        }),
      });

      if (res.success) {
        setSelectedUser(null);
        setBanReason('');
        loadReaders();
      } else {
        alert(res.error || 'Thao tác thất bại.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống.');
    } finally {
      setBanActionLoading(false);
    }
  };

  if (error && error.includes('quyền truy cập')) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-5 rounded-2xl">
        <h3 className="font-bold text-base">Truy cập bị từ chối</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Độc giả</h1>
        <p className="text-sm text-gray-500 mt-1">Danh sách tài khoản độc giả (Reader) trên hệ thống Violet.</p>
      </div>

      {/* Search Bar Block */}
      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-gray-700">
          Tổng độc giả: <span className="text-purple-600 font-extrabold">{totalReaders}</span>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-sm w-full">
          <input
            type="text"
            placeholder="Nhập tên, username hoặc email của độc giả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2 px-4 text-xs outline-none transition-all"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2 px-4 text-xs font-semibold transition-all shadow-md shadow-purple-900/10"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Users table */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <svg className="animate-spin h-8 w-8 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-500 font-semibold text-sm">Đang tải danh sách độc giả...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 font-medium text-sm">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-xs text-gray-400 font-bold uppercase">
                    <th className="py-4 px-6">Độc giả</th>
                    <th className="py-4 px-4">Username</th>
                    <th className="py-4 px-4">Email</th>
                    <th className="py-4 px-4">Ngày tham gia</th>
                    <th className="py-4 px-4">Đăng nhập gần nhất</th>
                    <th className="py-4 px-4 text-center">Trạng thái</th>
                    <th className="py-4 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {readers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img
                          src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.display_name || u.username)}&background=7c3aed&color=fff`}
                          alt={u.display_name || u.username}
                          className="w-9 h-9 rounded-xl border border-gray-200 object-cover"
                        />
                        <div>
                          <p className="font-bold text-gray-800">{u.display_name || u.username}</p>
                          <span className="text-[10px] text-gray-400 font-mono select-all">{u.id}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-650 font-mono">@{u.username}</td>
                      <td className="py-4 px-4 text-gray-650">{u.email}</td>
                      <td className="py-4 px-4 text-gray-500">{formatDate(u.created_at)}</td>
                      <td className="py-4 px-4 text-gray-500">
                        {u.last_login_at ? formatDate(u.last_login_at) : 'Chưa đăng nhập'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {u.is_banned ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200" title={u.ban_reason || ''}>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            Bị khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleBanToggleClick(u)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            u.is_banned
                              ? 'bg-emerald-50 border-emerald-350 hover:bg-emerald-100 text-emerald-700'
                              : 'bg-red-50 border-red-350 hover:bg-red-100 text-red-700'
                          }`}
                        >
                          {u.is_banned ? 'Mở khóa' : 'Khóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {readers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                        Không tìm thấy độc giả thỏa mãn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-4 px-6 border-t border-gray-100 flex items-center justify-between">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Trước
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  Trang {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ban / Unban Confirmation Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800">
              {selectedUser.is_banned ? 'Mở khóa tài khoản?' : 'Khóa tài khoản độc giả?'}
            </h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Bạn đang thực hiện {selectedUser.is_banned ? 'mở khóa' : 'khóa'} tài khoản độc giả{' '}
              <strong className="text-gray-800">{selectedUser.username}</strong> ({selectedUser.email}).
            </p>

            {!selectedUser.is_banned && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Lý do khóa tài khoản
                </label>
                <textarea
                  placeholder="Nhập lý do khóa tài khoản..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl p-3 text-xs outline-none transition-all h-20 resize-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                disabled={banActionLoading}
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={banActionLoading}
                onClick={handleConfirmBanToggle}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-md ${
                  selectedUser.is_banned
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-900/10'
                }`}
              >
                {banActionLoading
                  ? 'Đang xử lý...'
                  : selectedUser.is_banned
                  ? 'Đồng ý mở khóa'
                  : 'Đồng ý khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

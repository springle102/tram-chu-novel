'use client';

import { useState, useEffect } from 'react';
import { fetchAdmin, getAdminUser, formatDate } from '../utils';

interface Report {
  id: string;
  user_id: string;
  story_id: string | null;
  comment_id: string | null;
  reason: string;
  status: 'pending' | 'accepted' | 'processing' | 'resolved' | 'rejected';
  created_at: string;
  reporter_username: string;
  reporter_display_name: string;
  reporter_email: string;
  story_title: string | null;
  story_slug: string | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  // Action loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const loggedUser = getAdminUser();
    if (!loggedUser || loggedUser.role !== 'admin') {
      setError('Bạn không có quyền truy cập trang này. Chỉ dành cho Admin.');
      setLoading(false);
      return;
    }
    setUserRole(loggedUser.role);
    loadReports();
  }, [page, statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '10',
        status: statusFilter,
        search: searchQuery,
      });
      const res = await fetchAdmin(`/api/admin/reports?${queryParams.toString()}`);
      if (res.success) {
        setReports(res.data.reports);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalReports(res.data.pagination.total || 0);
      } else {
        throw new Error(res.error || 'Không tải được danh sách báo lỗi.');
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
    loadReports();
  };

  const handleUpdateStatus = async (reportId: string, nextStatus: string) => {
    let confirmMsg = '';
    if (nextStatus === 'accepted') confirmMsg = 'Chấp nhận báo cáo lỗi này?';
    else if (nextStatus === 'processing') confirmMsg = 'Chuyển báo cáo này sang trạng thái đang xử lý?';
    else if (nextStatus === 'resolved') confirmMsg = 'Xác nhận lỗi đã được xử lý hoàn tất?';
    else if (nextStatus === 'rejected') confirmMsg = 'Từ chối báo cáo lỗi này?';

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(reportId);
    try {
      const res = await fetchAdmin(`/api/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.success) {
        // Reload reports
        loadReports();
      } else {
        alert(res.error || 'Cập nhật trạng thái thất bại.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối khi cập nhật.');
    } finally {
      setActionLoadingId(null);
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

  // Get status tag UI helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Đã chấp nhận
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Đang xử lý
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Xử lý hoàn tất
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Đã từ chối
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Báo lỗi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Theo dõi, duyệt và cập nhật trạng thái xử lý lỗi hệ thống hoặc báo cáo nội dung do độc giả phản ánh.
        </p>
      </div>

      {/* Filters & Search bar */}
      <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-3 md:border-b-0 md:pb-0">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'accepted', label: 'Đã chấp nhận' },
            { id: 'processing', label: 'Đang xử lý' },
            { id: 'resolved', label: 'Hoàn tất' },
            { id: 'rejected', label: 'Đã từ chối' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Tìm theo nội dung/người báo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 rounded-xl border border-gray-200 px-4 py-2 text-xs focus:border-purple-500 focus:outline-none bg-gray-50 text-gray-900"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm shrink-0"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Reports Table container */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <svg className="animate-spin h-8 w-8 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-500 font-semibold text-sm">Đang tải danh sách báo lỗi...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 font-medium text-sm">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-xs text-gray-400 font-bold uppercase">
                    <th className="py-4 px-6 w-[180px]">Người báo lỗi</th>
                    <th className="py-4 px-4">Nội dung báo lỗi</th>
                    <th className="py-4 px-4 w-[130px]">Trạng thái</th>
                    <th className="py-4 px-4 w-[130px]">Ngày gửi</th>
                    <th className="py-4 px-6 text-center w-[220px]">Xử lý</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {reports.map((rp) => {
                    const reporterName = rp.reporter_display_name || rp.reporter_username || 'Độc giả';
                    return (
                      <tr key={rp.id} className="hover:bg-gray-50/50">
                        {/* Reporter details */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">{reporterName}</span>
                            <span className="text-[10px] text-gray-400 font-semibold mt-0.5">{rp.reporter_email || '@' + rp.reporter_username}</span>
                          </div>
                        </td>

                        {/* Reason / Context */}
                        <td className="py-4 px-4 text-gray-650 leading-relaxed whitespace-pre-wrap">
                          {rp.reason}
                          {rp.story_title && (
                            <span className="block text-[11px] text-purple-600 font-bold mt-1">
                              Truyện liên quan: {rp.story_title}
                            </span>
                          )}
                        </td>

                        {/* Status tag */}
                        <td className="py-4 px-4">
                          {getStatusBadge(rp.status)}
                        </td>

                        {/* Send date */}
                        <td className="py-4 px-4 text-gray-500 text-xs">
                          {formatDate(rp.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {rp.status !== 'accepted' && rp.status !== 'resolved' && (
                              <button
                                disabled={actionLoadingId !== null}
                                onClick={() => handleUpdateStatus(rp.id, 'accepted')}
                                className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-extrabold shadow-sm transition-all"
                                title="Chấp nhận báo lỗi"
                              >
                                Chấp nhận
                              </button>
                            )}

                            {rp.status !== 'processing' && rp.status !== 'resolved' && (
                              <button
                                disabled={actionLoadingId !== null}
                                onClick={() => handleUpdateStatus(rp.id, 'processing')}
                                className="px-2 py-1 bg-purple-50 border border-purple-200 text-purple-600 hover:bg-purple-100 rounded-lg text-[10px] font-extrabold shadow-sm transition-all"
                                title="Bắt đầu xử lý lỗi"
                              >
                                Xử lý
                              </button>
                            )}

                            {rp.status !== 'resolved' && (
                              <button
                                disabled={actionLoadingId !== null}
                                onClick={() => handleUpdateStatus(rp.id, 'resolved')}
                                className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-extrabold shadow-sm transition-all"
                                title="Xử lý lỗi hoàn tất"
                              >
                                Hoàn tất
                              </button>
                            )}

                            {rp.status !== 'rejected' && rp.status !== 'resolved' && (
                              <button
                                disabled={actionLoadingId !== null}
                                onClick={() => handleUpdateStatus(rp.id, 'rejected')}
                                className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg text-[10px] font-extrabold shadow-sm transition-all"
                                title="Từ chối báo cáo"
                              >
                                Từ chối
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 font-semibold">
                        Không có báo cáo lỗi nào phù hợp.
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
                  className="px-4 py-2 border border-gray-200 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Trước
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  Trang {page} / {totalPages} (Tổng số: {totalReports})
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 border border-gray-200 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

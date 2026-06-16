'use client';

import { useState, useEffect } from 'react';
import { fetchAdmin, getAdminUser, formatDate } from './utils';

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalStories: number;
    totalAuthors: number;
    totalViews: number;
    totalComments: number;
    pendingReports: number;
  };
  recentStories: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    view_count: number;
    rating: number;
    chapter_count: number;
    created_at: string;
    author_name: string;
    category_name: string;
  }>;
  recentUsers: Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    avatar_url?: string;
    created_at: string;
  }>;
  categoriesStats: Array<{
    name: string;
    count: number;
  }>;
}

interface AuthorDashboardData {
  stats: {
    totalStories: number;
    totalViews: number;
    totalComments: number;
    avgRating: number;
  };
  stories: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    view_count: number;
    rating: number;
    chapter_count: number;
    created_at: string;
    updated_at: string;
    category_name: string;
  }>;
  profile: {
    pen_name: string;
    bio?: string;
    donation_link?: string;
    total_views: number;
  } | null;
}

export default function AdminDashboardPage() {
  const [role, setRole] = useState<string>('');
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [authorData, setAuthorData] = useState<AuthorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getAdminUser();
    if (user) {
      setRole(user.role);
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdmin('/api/admin/dashboard');
      if (res.success) {
        const user = getAdminUser();
        if (user?.role === 'admin') {
          setAdminData(res.data);
        } else {
          setAuthorData(res.data);
        }
      } else {
        throw new Error(res.error || 'Không lấy được dữ liệu thống kê.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối API.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-gray-500 font-medium">Đang tải dữ liệu dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Xin chào quay trở lại!</h1>
        <p className="text-sm text-gray-500 mt-1">Dưới đây là tóm tắt hoạt động hệ thống của Novel Violet.</p>
      </div>

      {isAdmin && adminData ? (
        // ==========================================
        // ADMIN DASHBOARD
        // ==========================================
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            {/* Users Stat */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 min-w-0">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-800 break-words leading-tight">{adminData.stats.totalUsers}</p>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 break-words">Người dùng</p>
              </div>
            </div>

            {/* Stories Stat */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 min-w-0">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-800 break-words leading-tight">{adminData.stats.totalStories}</p>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 break-words">Bộ truyện</p>
              </div>
            </div>

            {/* Authors Stat */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 min-w-0">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-800 break-words leading-tight">{adminData.stats.totalAuthors}</p>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 break-words">Tác giả</p>
              </div>
            </div>

            {/* Views Stat */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 min-w-0">
              <div className="p-3 bg-pink-50 text-pink-600 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-800 break-words leading-tight" title={adminData.stats.totalViews.toLocaleString('vi-VN')}>
                  {adminData.stats.totalViews.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 break-words">Lượt xem</p>
              </div>
            </div>

            {/* Comments Stat */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 min-w-0">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-800 break-words leading-tight">{adminData.stats.totalComments}</p>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 break-words">Bình luận</p>
              </div>
            </div>

            {/* Reports Stat */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 min-w-0">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-800 break-words leading-tight">{adminData.stats.pendingReports}</p>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 break-words">Báo cáo mới</p>
              </div>
            </div>
          </div>

          {/* Tables and Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Stories (Left 2 columns) */}
            <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-800">Truyện mới cập nhật</h3>
                <a href="/admin/stories" className="text-xs font-semibold text-purple-600 hover:text-purple-700">Xem tất cả</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-bold uppercase">
                      <th className="pb-3">Tên truyện</th>
                      <th className="pb-3">Tác giả</th>
                      <th className="pb-3">Thể loại</th>
                      <th className="pb-3">Lượt xem</th>
                      <th className="pb-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {adminData.recentStories.map((story) => (
                      <tr key={story.id} className="hover:bg-gray-50/50">
                        <td className="py-3 font-semibold text-gray-800 max-w-[200px] truncate">{story.title}</td>
                        <td className="py-3 text-gray-600">{story.author_name}</td>
                        <td className="py-3 text-gray-500">{story.category_name || 'Không có'}</td>
                        <td className="py-3 text-gray-700">{story.view_count.toLocaleString('vi-VN')}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${
                            story.status === 'completed'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}>
                            {story.status === 'completed' ? 'Hoàn thành' : 'Đang ra'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Stats (Right 1 column) */}
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-800">Số lượng theo Thể loại</h3>
              </div>
              <div className="space-y-4">
                {adminData.categoriesStats.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="text-gray-500">{item.count} truyện</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, (item.count / Math.max(1, adminData.stats.totalStories)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Users (Left 2 columns) */}
            <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-800">Thành viên mới gia nhập</h3>
                <a href="/admin/readers" className="text-xs font-semibold text-purple-600 hover:text-purple-700">Xem tất cả</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-bold uppercase">
                      <th className="pb-3">Hội viên</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Vai trò</th>
                      <th className="pb-3">Ngày đăng ký</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {adminData.recentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="py-3 flex items-center gap-3">
                          <img
                            src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=8b5cf6&color=fff`}
                            alt={u.username}
                            className="w-8 h-8 rounded-full border border-gray-100 object-cover"
                          />
                          <span className="font-semibold text-gray-800">{u.username}</span>
                        </td>
                        <td className="py-3 text-gray-600">{u.email}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.role === 'author'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {u.role === 'author' ? 'Tác giả' : 'Độc giả'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        // ==========================================
        // AUTHOR DASHBOARD
        // ==========================================
        authorData && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* My Stories count */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-800">{authorData.stats.totalStories}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">Truyện của tôi</p>
                </div>
              </div>

              {/* Total Views */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-pink-50 text-pink-600 rounded-xl shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-800">{authorData.stats.totalViews.toLocaleString('vi-VN')}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">Tổng lượt xem</p>
                </div>
              </div>

              {/* Total Comments */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-800">{authorData.stats.totalComments.toLocaleString('vi-VN')}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">Lượt bình luận</p>
                </div>
              </div>

              {/* Average Rating */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-800">★ {Number(authorData.stats.avgRating).toFixed(1)}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">Đánh giá trung bình</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stories List */}
              <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-lg font-bold text-gray-800">Danh sách truyện</h3>
                  <a href="/admin/stories" className="text-xs font-semibold text-purple-600 hover:text-purple-700">Quản lý truyện</a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400 font-bold uppercase">
                        <th className="pb-3">Tiêu đề</th>
                        <th className="pb-3">Thể loại</th>
                        <th className="pb-3">Chương</th>
                        <th className="pb-3">Lượt xem</th>
                        <th className="pb-3">Đánh giá</th>
                        <th className="pb-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50">
                      {authorData.stories.map((story) => (
                        <tr key={story.id} className="hover:bg-gray-50/50">
                          <td className="py-4 font-semibold text-gray-800 max-w-[180px] truncate">{story.title}</td>
                          <td className="py-4 text-gray-500">{story.category_name || 'Không xác định'}</td>
                          <td className="py-4 text-gray-600 font-medium">{story.chapter_count}</td>
                          <td className="py-4 text-gray-700">{story.view_count.toLocaleString('vi-VN')}</td>
                          <td className="py-4 text-amber-500 font-semibold">★ {Number(story.rating).toFixed(1)}</td>
                          <td className="py-4">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${
                              story.status === 'completed'
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}>
                              {story.status === 'completed' ? 'Hoàn thành' : 'Đang ra'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {authorData.stories.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">Bạn chưa đăng tải bộ truyện nào.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Profile Card */}
              <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-lg font-bold text-gray-800">Thông tin Tác giả</h3>
                </div>
                {authorData.profile ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Bút danh</p>
                      <p className="text-base font-bold text-purple-700 mt-1">{authorData.profile.pen_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Tiểu sử</p>
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                        {authorData.profile.bio || 'Chưa cập nhật tiểu sử.'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Link Donation</p>
                      {authorData.profile.donation_link ? (
                        <a
                          href={authorData.profile.donation_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center mt-1 font-medium"
                        >
                          {authorData.profile.donation_link}
                          <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1">Chưa cập nhật link donation.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">Bạn chưa tạo hồ sơ tác giả.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}

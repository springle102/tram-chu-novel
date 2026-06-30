'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAdmin, getAdminUser, formatDate } from '../utils';

interface Story {
  id: string;
  title: string;
  slug: string;
  cover_image: string;
  description: string;
  status: string;
  view_count: number;
  rating: number;
  chapter_count: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_id: string;
  categories: { id: string; name: string }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStories, setTotalStories] = useState(0);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);

  useEffect(() => {
    const user = getAdminUser();
    if (user) {
      setRole(user.role);
    }
    loadCategories();
  }, []);

  useEffect(() => {
    loadStories();
  }, [page, status, category]);

  const loadCategories = async () => {
    try {
      const res = await fetchAdmin('/api/admin/categories');
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const loadStories = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '10',
        search,
        status,
        category,
      });
      const res = await fetchAdmin(`/api/admin/stories?${queryParams.toString()}`);
      if (res.success) {
        setStories(res.data.stories);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalStories(res.data.pagination.total || 0);
      } else {
        throw new Error(res.error || 'Không tải được danh sách truyện.');
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
    loadStories();
  };

  const handleDeleteClick = (story: Story) => {
    setDeletingId(story.id);
    setDeletingName(story.title);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setConfirmDeleteLoading(true);
    try {
      const res = await fetchAdmin(`/api/admin/stories/${deletingId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setDeletingId(null);
        setPage(1);
        loadStories();
      } else {
        alert(res.error || 'Không thể xóa truyện.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa truyện.');
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isAdmin ? 'Quản lý toàn bộ truyện' : 'Truyện của tôi'}</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng cộng {totalStories} bộ truyện được tìm thấy.</p>
        </div>
        {!isAdmin && (
          <Link
            href="/admin/stories/new"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl px-5 py-2.5 shadow-md shadow-purple-900/10 hover:shadow-purple-700/20 flex items-center gap-2 transition-all duration-200 self-start sm:self-center animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm truyện mới
          </Link>
        )}
      </div>

      {/* Filter controls */}
      <div className="bg-white rounded-2xl p-6 shadow-sm -mt-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Nhập tiêu đề truyện cần tìm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2.5 px-4 text-sm outline-none transition-all cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ongoing">Đang ra (Ongoing)</option>
              <option value="completed">Hoàn thành (Completed)</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2.5 px-4 text-sm outline-none transition-all cursor-pointer"
            >
              <option value="">Tất cả thể loại</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Search */}
          <div>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 px-4 text-sm font-semibold transition-all shadow-md shadow-purple-900/10"
            >
              Áp dụng lọc
            </button>
          </div>
        </form>
      </div>

      {/* Stories Table */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <svg className="animate-spin h-8 w-8 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-500 font-semibold text-sm">Đang tải truyện...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 font-medium text-sm">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-xs text-gray-400 font-bold uppercase">
                    <th className="py-3 px-4 w-[110px] text-center whitespace-nowrap">Bìa</th>
                    <th className="py-3 px-4 text-center">Tên truyện</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Tác giả</th>}
                    <th className="py-3 px-4 text-center">Thể loại</th>
                    <th className="py-3 px-4 w-[150px] text-center whitespace-nowrap">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Lượt xem</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                    <th className="py-3 px-4 text-center">Chương</th>
                    <th className="py-3 px-4 text-center">Cập nhật</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {stories.map((story) => (
                    <tr key={story.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4">
                        <img
                          src={story.cover_image || 'https://placehold.co/400x600/7c3aed/white?text=Novel'}
                          alt={story.title}
                          className="object-cover rounded-md border border-gray-200 shadow-sm shrink-0"
                          style={{ width: '64px', height: '96px', minWidth: '64px' }}
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-gray-800 hover:text-purple-700 transition-colors cursor-pointer max-w-[200px] truncate">
                          {story.title}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[200px]">{story.slug}</p>
                      </td>
                      {isAdmin && <td className="py-2.5 px-4 text-gray-600 font-medium">{story.author_name}</td>}
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {story.categories && story.categories.length > 0 ? (
                            story.categories.map((cat) => (
                              <span
                                key={cat.id}
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-100"
                              >
                                {cat.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs italic">Không có</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border whitespace-nowrap ${
                          story.status === 'completed'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {story.status === 'completed' ? 'Hoàn thành' : 'Đang ra'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-gray-700 font-medium">
                        {story.view_count.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-4 text-center text-amber-500 font-bold">
                        ★ {Number(story.rating).toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-gray-700">{story.chapter_count}</td>
                      <td className="py-2.5 px-4 text-gray-500 font-medium">{formatDate(story.updated_at)}</td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <Link
                          href={`/admin/stories/${story.id}`}
                          className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-lg transition-all duration-200 inline-block mr-1"
                          title={isAdmin ? 'Xem chi tiết truyện' : 'Quản lý truyện & chương'}
                        >
                          {isAdmin ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          )}
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(story)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-all duration-200 inline-block"
                          title="Xóa truyện"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stories.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400 font-semibold">
                        Không tìm thấy truyện nào thỏa mãn bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800">Xác nhận xóa truyện?</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa bộ truyện <strong className="text-gray-800">"{deletingName}"</strong>? Hành động này sẽ xóa vĩnh viễn truyện cùng toàn bộ chương và bình luận đi kèm và không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                disabled={confirmDeleteLoading}
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={confirmDeleteLoading}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-red-900/10 flex items-center"
              >
                {confirmDeleteLoading ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

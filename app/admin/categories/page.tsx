'use client';

import { useState, useEffect } from 'react';
import { fetchAdmin, getAdminUser, toSlug } from '../utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  story_count?: string | number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const loggedUser = getAdminUser();
    if (loggedUser && loggedUser.role !== 'admin') {
      setError('Bạn không có quyền truy cập trang này.');
      setLoading(false);
      return;
    }
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdmin('/api/admin/categories');
      if (res.success) {
        setCategories(res.data);
      } else {
        throw new Error(res.error || 'Không thể tải danh sách thể loại.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối tới hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(toSlug(val));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!name.trim() || !slug.trim()) {
      setFormError('Vui lòng điền đầy đủ tên thể loại và slug.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetchAdmin('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      });

      if (res.success) {
        setFormSuccess(`Đã thêm thể loại "${res.data.name}" thành công.`);
        setName('');
        setSlug('');
        loadCategories();
      } else {
        throw new Error(res.error || 'Không thể thêm thể loại.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Slug bị trùng lặp hoặc lỗi hệ thống.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (cat: Category) => {
    setDeletingId(cat.id);
    setDeletingName(cat.name);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetchAdmin(`/api/admin/categories/${deletingId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setDeletingId(null);
        loadCategories();
      } else {
        alert(res.error || 'Xóa thể loại thất bại.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống khi xóa.');
    } finally {
      setDeleteLoading(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
      {/* Title */}
      <div className="lg:col-span-3">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Thể loại</h1>
        <p className="text-sm text-gray-500 mt-1">Cấu hình danh mục và phân loại tác phẩm của Trạm Chữ Novel.</p>
      </div>

      {/* Add Category Form (1/3 column) */}
      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm h-fit space-y-4">
        <h3 className="text-lg font-bold text-gray-800 pb-3 border-b border-gray-100">
          Thêm thể loại mới
        </h3>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-2.5 rounded-xl">
            {formSuccess}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-650 uppercase tracking-wide mb-1.5">
              Tên thể loại
            </label>
            <input
              type="text"
              required
              placeholder="Nhập tên thể loại..."
              value={name}
              onChange={handleNameChange}
              className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2 px-3.5 text-xs outline-none transition-all"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-gray-650 uppercase tracking-wide mb-1.5">
              Slug URL
            </label>
            <input
              type="text"
              required
              placeholder="Nhập đường dẫn thể loại (slug)..."
              value={slug}
              onChange={(e) => setSlug(toSlug(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2 px-3.5 text-xs outline-none transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 text-xs font-semibold transition-all shadow-md shadow-purple-900/10 flex items-center justify-center disabled:opacity-50"
          >
            {formLoading ? 'Đang lưu...' : 'Thêm Thể loại'}
          </button>
        </form>
      </div>

      {/* Categories Table (2/3 columns) */}
      <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <svg className="animate-spin h-8 w-8 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-500 font-semibold text-sm">Đang tải thể loại...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 font-medium text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-xs text-gray-400 font-bold uppercase">
                  <th className="py-4 px-6">Tên thể loại</th>
                  <th className="py-4 px-4">Slug URL</th>
                  <th className="py-4 px-4 text-center">Số lượng truyện</th>
                  <th className="py-4 px-6 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-bold text-gray-800">{cat.name}</td>
                    <td className="py-4 px-4 text-gray-600 font-mono">{cat.slug}</td>
                    <td className="py-4 px-4 text-center font-semibold text-purple-600">
                      {cat.story_count || 0} truyện
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        className="text-red-650 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa thể loại"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 font-semibold">
                      Chưa có thể loại nào được khởi tạo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800">Xác nhận xóa thể loại?</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa thể loại <strong className="text-gray-800">"{deletingName}"</strong>? Những bộ truyện thuộc thể loại này sẽ không bị xóa mà chỉ mất đi danh mục liên kết.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                disabled={deleteLoading}
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={deleteLoading}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-red-900/10 flex items-center"
              >
                {deleteLoading ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

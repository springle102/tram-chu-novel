'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAdmin, getAdminUser, getApiBaseUrl } from '../../utils';

interface Category {
  id: string;
  name: string;
}

export default function NewStoryPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ongoing');
  const [uploading, setUploading] = useState(false);

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Kiểm tra dung lượng
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh bìa không được vượt quá 2MB.' });
      return;
    }

    // 2. Kiểm tra loại file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WEBP.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('admin_token');
      const apiBase = getApiBaseUrl();

      const res = await fetch(`${apiBase}/api/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCoverImage(data.url);
        setMessage({ type: 'success', text: 'Tải ảnh bìa lên thành công!' });
      } else {
        throw new Error(data.error || 'Tải ảnh lên thất bại.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối khi tải ảnh lên.' });
      setCoverImage('');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const user = getAdminUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }
    setRole(user.role);
    if (user.role !== 'author') {
      setMessage({ type: 'error', text: 'Admin chỉ được xem hệ thống các bộ truyện chứ không được thêm mới.' });
      setLoading(false);
      return;
    }

    loadCategories();
  }, [router]);

  const loadCategories = async () => {
    try {
      const res = await fetchAdmin('/api/admin/categories');
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'author') return;
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Tiêu đề truyện không được để trống.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetchAdmin('/api/admin/stories', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          categoryIds: categoryIds,
          coverImage: coverImage.trim() || null,
          description: description.trim() || null,
          status,
        }),
      });

      if (res.success && res.data) {
        setMessage({ type: 'success', text: 'Tạo truyện mới thành công! Đang chuyển hướng...' });
        setTimeout(() => {
          router.push(`/admin/stories/${res.data.id}`);
        }, 1500);
      } else {
        throw new Error(res.error || 'Tạo truyện thất bại.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối khi tạo truyện.' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <svg className="animate-spin h-8 w-8 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-gray-500 font-semibold text-sm">Đang tải thể loại...</span>
      </div>
    );
  }

  const isAuthor = role === 'author';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <Link href="/admin/stories" className="hover:text-purple-600 transition-colors">
          Truyện của tôi
        </Link>
        <span>/</span>
        <span className="text-gray-600">Thêm truyện mới</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Thêm truyện mới</h1>
        <p className="text-sm text-gray-500 mt-1">Khởi tạo một bộ truyện mới trên hệ thống để bắt đầu đăng chương.</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <svg className="w-5 h-5 mr-3 shrink-0 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 mr-3 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {isAuthor && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Tiêu đề truyện <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nhập tiêu đề truyện..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all cursor-pointer"
                >
                  <option value="ongoing">Đang ra (Ongoing)</option>
                  <option value="completed">Hoàn thành (Completed)</option>
                </select>
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Thể loại (Có thể chọn nhiều)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                {categories.map((cat) => {
                  const checked = categoryIds.includes(cat.id);
                  return (
                    <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCategoryIds([...categoryIds, cat.id]);
                          } else {
                            setCategoryIds(categoryIds.filter((id) => id !== cat.id));
                          }
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Ảnh bìa truyện (Tối đa 2MB)
              </label>
              <div className="flex items-start gap-4">
                {uploading && (
                  <div className="w-20 h-28 shrink-0 flex flex-col items-center justify-center rounded-lg border border-dashed border-purple-300 bg-purple-50/50 animate-pulse">
                    <svg className="animate-spin h-5 w-5 text-purple-600 mb-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-[10px] text-purple-700 font-semibold">Đang tải...</span>
                  </div>
                )}
                {!uploading && coverImage && (
                  <div className="w-20 h-28 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 animate-in fade-in zoom-in-95 duration-200">
                    <img src={coverImage} alt="Ảnh bìa xem trước" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleCoverImageChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100
                      cursor-pointer focus:outline-none disabled:opacity-50"
                  />
                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="text-xs text-red-500 hover:text-red-600 font-semibold block"
                    >
                      Xoá ảnh
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Mô tả / Tóm tắt truyện
              </label>
              <textarea
                placeholder="Nhập mô tả hoặc tóm tắt truyện..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Link
                href="/admin/stories"
                className="px-5 py-2.5 border border-gray-250 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all"
              >
                Hủy bỏ
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl px-6 py-2.5 shadow-md shadow-purple-900/10 hover:shadow-purple-700/20 flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tạo...
                  </>
                ) : (
                  'Khởi tạo truyện'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

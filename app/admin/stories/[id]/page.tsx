'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchAdmin, getAdminUser, formatDate } from '../../utils';

export const runtime = 'edge';
interface Category {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  view_count: number;
  is_published: boolean;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  password?: string | null;
  password_question?: string | null;
  password_hint?: string | null;
}

interface StoryDetails {
  author_id: string;
  title: string;
  cover_image: string;
  description: string;
  status: string;
  categories: { id: string; name: string }[];
}

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;

  const [role, setRole] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [story, setStory] = useState<StoryDetails | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ongoing');

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh bìa không được vượt quá 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Deletion states for chapters
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);
  const [deletingChapterName, setDeletingChapterName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Preview chapter states
  const [previewChapter, setPreviewChapter] = useState<Chapter | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  const handlePreviewChapter = async (chap: Chapter) => {
    setPreviewChapter(chap);
    setEnteredPassword('');
    setPasswordError('');
    setShowHint(false);
    
    if (chap.password) {
      setIsUnlocked(false);
    } else {
      setIsUnlocked(true);
      await fetchChapterContent(chap.id);
    }
  };

  const fetchChapterContent = async (chapterId: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetchAdmin(`/api/admin/stories/${storyId}/chapters/${chapterId}`);
      if (res.success && res.data) {
        setPreviewContent(res.data.content);
      } else {
        throw new Error(res.error || 'Không tải được nội dung chương.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi tải nội dung chương.');
      setPreviewChapter(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewChapter) return;
    
    if (enteredPassword.trim() === previewChapter.password) {
      setIsUnlocked(true);
      await fetchChapterContent(previewChapter.id);
    } else {
      setPasswordError('Mật khẩu không chính xác. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    const user = getAdminUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }
    setRole(user.role);
    loadAllData();
  }, [router, storyId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const catsRes = await fetchAdmin('/api/admin/categories');
      if (catsRes.success) {
        setCategories(catsRes.data);
      }

      const storyRes = await fetchAdmin(`/api/admin/stories/${storyId}/chapters`);
      if (storyRes.success && storyRes.data) {
        const s = storyRes.data.story;
        setStory(s);
        setChapters(storyRes.data.chapters);

        // Populate form
        setTitle(s.title || '');
        setCategoryIds(s.categories ? s.categories.map((c: any) => c.id) : []);
        setCoverImage(s.cover_image || '');
        setDescription(s.description || '');
        setStatus(s.status || 'ongoing');
      } else {
        throw new Error(storyRes.error || 'Không tải được chi tiết truyện.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi tải dữ liệu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'author') return;
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Tiêu đề không được để trống.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetchAdmin(`/api/admin/stories/${storyId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          categoryIds: categoryIds,
          coverImage: coverImage.trim() || null,
          description: description.trim() || null,
          status,
        }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin truyện thành công!' });
        loadAllData();
      } else {
        throw new Error(res.error || 'Cập nhật thất bại.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối khi cập nhật.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChapterClick = (chap: Chapter) => {
    setDeletingChapterId(chap.id);
    setDeletingChapterName(`Chương ${chap.chapter_number}: ${chap.title}`);
  };

  const confirmDeleteChapter = async () => {
    if (!deletingChapterId) return;
    setDeleteLoading(true);
    try {
      const res = await fetchAdmin(`/api/admin/stories/${storyId}/chapters/${deletingChapterId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setDeletingChapterId(null);
        setMessage({ type: 'success', text: 'Đã xóa chương thành công!' });
        loadAllData();
      } else {
        alert(res.error || 'Không thể xóa chương.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa chương.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <svg className="animate-spin h-8 w-8 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-gray-500 font-semibold text-sm">Đang tải chi tiết truyện...</span>
      </div>
    );
  }

  const isAdmin = role === 'admin';
  const isAuthor = role === 'author';

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <Link href="/admin/stories" className="hover:text-purple-600 transition-colors">
          {isAdmin ? 'Quản lý truyện' : 'Truyện của tôi'}
        </Link>
        <span>/</span>
        <span className="text-gray-600">{story?.title || 'Chi tiết truyện'}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{story?.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAdmin ? 'Quản trị viên đang xem chi tiết truyện.' : 'Tác giả chỉnh sửa truyện và quản lý các chương.'}
        </p>
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Story Information Editor */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-md font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Thông tin truyện</h2>
            
            <form onSubmit={handleUpdateStory} className="space-y-4">
              {/* Cover Image Preview */}
              <div className="aspect-[2/3] w-40 mx-auto overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-gray-50 mb-4 flex items-center justify-center">
                <img
                  src={coverImage || 'https://placehold.co/400x600/7c3aed/white?text=Cover'}
                  alt="Ảnh bìa"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  required
                  disabled={isAdmin}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none transition-all disabled:opacity-60"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Thể loại
                </label>
                {isAdmin ? (
                  <div className="flex flex-wrap gap-1">
                    {story?.categories && story.categories.length > 0 ? (
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
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-150 rounded-xl bg-gray-50/50">
                    {categories.map((cat) => {
                      const checked = categoryIds.includes(cat.id);
                      return (
                        <label key={cat.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
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
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Trạng thái
                </label>
                <select
                  disabled={isAdmin}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none transition-all disabled:opacity-60 cursor-pointer"
                >
                  <option value="ongoing">Đang ra (Ongoing)</option>
                  <option value="completed">Hoàn thành (Completed)</option>
                </select>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Ảnh bìa truyện (Tối đa 2MB)
                </label>
                {isAdmin ? (
                  <p className="text-xs text-gray-500 italic">Ảnh bìa đã được thiết lập.</p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="block w-full text-xs text-gray-500
                        file:mr-3 file:py-1.5 file:px-3
                        file:rounded-xl file:border-0
                        file:text-xs file:font-semibold
                        file:bg-purple-50 file:text-purple-700
                        hover:file:bg-purple-100
                        cursor-pointer focus:outline-none"
                    />
                    {coverImage && (
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className="text-[10px] text-red-500 hover:text-red-600 font-semibold"
                      >
                        Xoá ảnh
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Tóm tắt truyện
                </label>
                <textarea
                  disabled={isAdmin}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none transition-all disabled:opacity-60 resize-none"
                />
              </div>

              {isAuthor && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl py-2.5 shadow-md shadow-purple-900/10 transition-all duration-200 disabled:opacity-50"
                >
                  {submitting ? 'Đang cập nhật...' : 'Lưu thông tin truyện'}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Chapters List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 gap-4">
              <div>
                <h2 className="text-md font-bold text-gray-800">Danh sách chương</h2>
                <p className="text-xs text-gray-400 mt-0.5">Tổng cộng {chapters.length} chương truyện.</p>
              </div>

              {isAuthor && (
                <Link
                  href={`/admin/stories/${storyId}/chapters/new`}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl px-4 py-2 shadow-sm flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Đăng chương mới
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-[60px] text-center">Số</th>
                    <th className="py-3 px-4">Tên chương</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Từ</th>
                    <th className="py-3 px-4 text-right">Lượt đọc</th>
                    <th className="py-3 px-4">Ngày đăng</th>
                    {isAuthor && <th className="py-3 px-4 text-center">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {chapters.map((chap) => {
                    // Calculate publish status badge
                    let statusBadge = (
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Đã đăng
                      </span>
                    );

                    if (!chap.is_published) {
                      statusBadge = (
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                          Bản nháp
                        </span>
                      );
                    } else if (chap.scheduled_at && new Date(chap.scheduled_at) > new Date()) {
                      statusBadge = (
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200 animate-pulse" title={`Lên lịch: ${new Date(chap.scheduled_at).toLocaleString()}`}>
                          Đặt lịch
                        </span>
                      );
                    }

                    return (
                      <tr key={chap.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 text-center font-semibold text-gray-500">#{chap.chapter_number}</td>
                        <td className="py-3.5 px-4">
                          <div 
                            onClick={() => handlePreviewChapter(chap)}
                            className="font-bold text-gray-700 hover:text-purple-600 hover:underline cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            {chap.title}
                            {chap.password && (
                              <span className="inline-flex p-0.5 bg-purple-50 rounded text-purple-600 hover:bg-purple-100" title="Chương được đặt mật khẩu">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">{statusBadge}</td>
                        <td className="py-3.5 px-4 text-right text-gray-500 font-medium">{chap.word_count.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right text-gray-500 font-medium">{chap.view_count.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-gray-400 font-medium text-xs">
                          {chap.scheduled_at && new Date(chap.scheduled_at) > new Date()
                            ? formatDate(chap.scheduled_at)
                            : formatDate(chap.created_at)}
                        </td>
                        {isAuthor && (
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <Link
                              href={`/admin/stories/${storyId}/chapters/${chap.id}`}
                              className="text-purple-600 hover:text-purple-800 p-1.5 hover:bg-purple-50 rounded-lg transition-all inline-block mr-1"
                              title="Sửa chương"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDeleteChapterClick(chap)}
                              className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded-lg transition-all inline-block"
                              title="Xóa chương"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {chapters.length === 0 && (
                    <tr>
                      <td colSpan={isAuthor ? 7 : 6} className="py-8 text-center text-gray-450 font-medium text-sm">
                        Chưa có chương truyện nào được đăng tải.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingChapterId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800">Xác nhận xóa chương?</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Bạn có chắc muốn xóa <strong className="text-gray-800">{deletingChapterName}</strong>? Tất cả số liệu đọc và nội dung chương này sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                disabled={deleteLoading}
                onClick={() => setDeletingChapterId(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={deleteLoading}
                onClick={confirmDeleteChapter}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-red-900/10 flex items-center"
              >
                {deleteLoading ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chapter Reading Preview Modal ── */}
      {previewChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  Chương {previewChapter.chapter_number}
                </span>
                <h3 className="text-lg font-bold text-gray-800 mt-1">
                  {previewChapter.title}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewChapter(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!isUnlocked ? (
                /* Locked Password View */
                <form onSubmit={handleUnlockSubmit} className="max-w-md mx-auto py-8 space-y-6 text-center">
                  <div className="w-16 h-16 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-extrabold text-gray-800">Chương này đã được khóa mật khẩu</h4>
                    <p className="text-xs text-gray-400 mt-1">Vui lòng nhập mật khẩu chính xác để đọc nội dung chương truyện.</p>
                  </div>

                  {/* Password Question */}
                  {previewChapter.password_question && (
                    <div className="bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-left">
                      <span className="block text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">
                        Câu hỏi bảo vệ:
                      </span>
                      <p className="text-sm font-semibold text-gray-700">
                        {previewChapter.password_question}
                      </p>
                    </div>
                  )}

                  {/* Password Input */}
                  <div className="space-y-2 text-left">
                    <input
                      type="text"
                      required
                      placeholder="Nhập mật khẩu chương..."
                      value={enteredPassword}
                      onChange={(e) => {
                        setEnteredPassword(e.target.value);
                        setPasswordError('');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all text-center font-bold tracking-wider"
                    />
                    {passwordError && (
                      <p className="text-xs text-red-500 font-semibold text-center">{passwordError}</p>
                    )}
                  </div>

                  {/* Password Hint */}
                  {previewChapter.password_hint && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        className="text-xs text-purple-600 hover:text-purple-700 font-bold transition-colors"
                      >
                        {showHint ? 'Ẩn gợi ý mật khẩu' : 'Xem gợi ý mật khẩu (Hint)'}
                      </button>
                      {showHint && (
                        <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-xl p-3 text-center animate-in fade-in slide-in-from-top-1 duration-150">
                          <strong>Gợi ý:</strong> {previewChapter.password_hint}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewChapter(null)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-xl py-2.5 transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl py-2.5 shadow-sm transition-all"
                    >
                      Mở khóa chương
                    </button>
                  </div>
                </form>
              ) : (
                /* Reading Content View */
                <div className="space-y-4">
                  {previewLoading ? (
                    <div className="py-12 flex flex-col justify-center items-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-gray-400 font-semibold text-xs">Đang mở khóa và tải nội dung...</span>
                    </div>
                  ) : (
                    <div className="prose prose-purple max-w-none">
                      <div className="whitespace-pre-line text-gray-700 font-serif leading-relaxed text-[15px] space-y-4">
                        {previewContent}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {isUnlocked && !previewLoading && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
                <button
                  onClick={() => setPreviewChapter(null)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl px-5 py-2.5 transition-all"
                >
                  Đóng
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

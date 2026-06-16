'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchAdmin, getAdminUser } from '@/app/admin/utils';

export default function EditChapterPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;
  const chapterId = params.chapterId as string;

  const [role, setRole] = useState('');
  const [storyTitle, setStoryTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishMode, setPublishMode] = useState<'publish' | 'draft' | 'schedule'>('publish');
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    const user = getAdminUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }
    setRole(user.role);
    if (user.role !== 'author') {
      setMessage({ type: 'error', text: 'Chỉ có Tác giả mới được quyền chỉnh sửa chương.' });
      setLoading(false);
      return;
    }

    loadData();
  }, [router, storyId, chapterId]);

  const formatDateTimeLocal = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  };

  const loadData = async () => {
    try {
      const storyRes = await fetchAdmin(`/api/admin/stories/${storyId}/chapters`);
      if (storyRes.success && storyRes.data) {
        setStoryTitle(storyRes.data.story.title);
      } else {
        throw new Error(storyRes.error || 'Không tải được thông tin truyện.');
      }

      const chapRes = await fetchAdmin(`/api/admin/stories/${storyId}/chapters/${chapterId}`);
      if (chapRes.success && chapRes.data) {
        const c = chapRes.data;
        setTitle(c.title || '');
        setContent(c.content || '');
        setChapterNumber(c.chapter_number);

        // Determine publish mode
        if (!c.is_published) {
          setPublishMode('draft');
        } else if (c.scheduled_at && new Date(c.scheduled_at) > new Date()) {
          setPublishMode('schedule');
          setScheduledAt(formatDateTimeLocal(c.scheduled_at));
        } else {
          setPublishMode('publish');
        }
      } else {
        throw new Error(chapRes.error || 'Không tải được chi tiết chương.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi tải dữ liệu.' });
    } finally {
      setLoading(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'author') return;
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Tiêu đề chương không được để trống.' });
      return;
    }
    if (!content.trim()) {
      setMessage({ type: 'error', text: 'Nội dung chương không được để trống.' });
      return;
    }

    if (publishMode === 'schedule' && !scheduledAt) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ngày giờ thiết lập đăng truyện.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const isPublished = publishMode !== 'draft';
    const finalScheduledAt = publishMode === 'schedule' ? scheduledAt : null;

    try {
      const res = await fetchAdmin(`/api/admin/stories/${storyId}/chapters/${chapterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          content,
          isPublished,
          scheduledAt: finalScheduledAt,
        }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Cập nhật chương thành công! Đang quay lại danh sách...' });
        setTimeout(() => {
          router.push(`/admin/stories/${storyId}`);
        }, 1500);
      } else {
        throw new Error(res.error || 'Cập nhật chương thất bại.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối khi cập nhật.' });
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
        <span className="text-gray-500 font-semibold text-sm">Đang tải chi tiết chương...</span>
      </div>
    );
  }

  const isAuthor = role === 'author';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <Link href="/admin/stories" className="hover:text-purple-600 transition-colors">
          Truyện của tôi
        </Link>
        <span>/</span>
        <Link href={`/admin/stories/${storyId}`} className="hover:text-purple-600 transition-colors">
          {storyTitle || 'Chi tiết truyện'}
        </Link>
        <span>/</span>
        <span className="text-gray-600">Sửa chương {chapterNumber}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Sửa chương {chapterNumber}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chỉnh sửa chương của bộ truyện <strong className="text-purple-600 font-semibold">"{storyTitle}"</strong>.
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

      {isAuthor && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content area: Title & Body editor */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Tiêu đề chương <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chương 1: Tiết tử khởi đầu"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
                />
              </div>

              {/* Text content area */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nội dung chương <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                    Số từ: {wordCount.toLocaleString()} từ
                  </span>
                </div>
                <textarea
                  required
                  placeholder="Nhập nội dung chương truyện tại đây..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl p-4 text-sm text-gray-800 outline-none transition-all font-serif leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Right sidebar area: Publishing and actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-md font-bold text-gray-800 pb-2 border-b border-gray-100">Thiết lập đăng tải</h3>

              {/* Publish modes options */}
              <div className="space-y-3">
                {/* Draft */}
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-150 rounded-xl hover:bg-gray-55 transition-all">
                  <input
                    type="radio"
                    name="publishMode"
                    value="draft"
                    checked={publishMode === 'draft'}
                    onChange={() => setPublishMode('draft')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-gray-700">Lưu bản nháp</span>
                    <span className="block text-[10px] text-gray-400">Chỉ có tác giả mới xem được chương này</span>
                  </div>
                </label>

                {/* Publish now */}
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-150 rounded-xl hover:bg-gray-55 transition-all">
                  <input
                    type="radio"
                    name="publishMode"
                    value="publish"
                    checked={publishMode === 'publish'}
                    onChange={() => setPublishMode('publish')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-gray-700">Đăng tải ngay</span>
                    <span className="block text-[10px] text-gray-400">Độc giả có thể đọc chương lập tức</span>
                  </div>
                </label>

                {/* Schedule publish */}
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-150 rounded-xl hover:bg-gray-55 transition-all">
                  <input
                    type="radio"
                    name="publishMode"
                    value="schedule"
                    checked={publishMode === 'schedule'}
                    onChange={() => setPublishMode('schedule')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-gray-700">Đặt lịch đăng truyện</span>
                    <span className="block text-[10px] text-gray-400">Tự động xuất bản theo lịch đặt sẵn</span>
                  </div>
                </label>
              </div>

              {/* Schedule time input */}
              {publishMode === 'schedule' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Ngày giờ phát hành
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)} // Min 5 mins in the future
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* Actions submit */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl py-2.5 shadow-md shadow-purple-900/10 hover:shadow-purple-700/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                
                <Link
                  href={`/admin/stories/${storyId}`}
                  className="w-full border border-gray-250 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl py-2.5 transition-all text-center block"
                >
                  Quay lại
                </Link>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

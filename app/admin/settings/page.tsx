'use client';

import { useState, useEffect } from 'react';
import { fetchAdmin, getAdminUser } from '../utils';

interface SettingItem {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Local inputs grouped
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoApproveComments, setAutoApproveComments] = useState(false);
  const [minChapterLength, setMinChapterLength] = useState(500);
  const [allowGuestReading, setAllowGuestReading] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(24);
  const [allowComments, setAllowComments] = useState(true);

  const [saveLoading, setSaveLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const loggedUser = getAdminUser();
    if (loggedUser && loggedUser.role !== 'admin') {
      setError('Bạn không có quyền truy cập trang này.');
      setLoading(false);
      return;
    }
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdmin('/api/admin/settings');
      if (res.success) {
        const data: SettingItem[] = res.data;
        setSettings(data);
        // Bind to local state variables
        data.forEach((item) => {
          switch (item.key) {
            case 'site_name':
              setSiteName(item.value);
              break;
            case 'site_description':
              setSiteDescription(item.value);
              break;
            case 'favicon_url':
              setFaviconUrl(item.value);
              break;
            case 'maintenance_mode':
              setMaintenanceMode(item.value === 'true');
              break;
            case 'auto_approve_comments':
              setAutoApproveComments(item.value === 'true');
              break;
            case 'min_chapter_length':
              setMinChapterLength(parseInt(item.value) || 500);
              break;
            case 'allow_guest_reading':
              setAllowGuestReading(item.value === 'true');
              break;
            case 'max_login_attempts':
              setMaxLoginAttempts(parseInt(item.value) || 5);
              break;
            case 'session_timeout_hours':
              setSessionTimeoutHours(parseInt(item.value) || 24);
              break;
            case 'allow_comments':
              setAllowComments(item.value === 'true');
              break;
          }
        });
      } else {
        throw new Error(res.error || 'Không tải được cấu hình hệ thống.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối tới hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const payload = {
        settings: [
          { key: 'site_name', value: siteName },
          { key: 'site_description', value: siteDescription },
          { key: 'favicon_url', value: faviconUrl },
          { key: 'maintenance_mode', value: String(maintenanceMode) },
          { key: 'auto_approve_comments', value: String(autoApproveComments) },
          { key: 'min_chapter_length', value: String(minChapterLength) },
          { key: 'allow_guest_reading', value: String(allowGuestReading) },
          { key: 'max_login_attempts', value: String(maxLoginAttempts) },
          { key: 'session_timeout_hours', value: String(sessionTimeoutHours) },
          { key: 'allow_comments', value: String(allowComments) },
        ],
      };

      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast('Đã lưu cấu hình hệ thống thành công.');
        loadSettings();
      } else {
        throw new Error(res.error || 'Lỗi lưu cấu hình.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối API.');
    } finally {
      setSaveLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate size (500KB)
    if (file.size > 500 * 1024) {
      alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFaviconUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset file input value to allow uploading the same file again if removed
    e.target.value = '';
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
    <form onSubmit={handleSave} className="space-y-6 font-sans relative">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-emerald-600 text-white font-semibold px-6 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-300">
          <svg className="w-5 h-5 text-emerald-100" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cấu hình Hệ thống</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý các thông số chung, chính sách bảo mật và cài đặt duyệt truyện.</p>
        </div>
        <button
          type="submit"
          disabled={saveLoading || loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl py-3 px-6 text-sm font-semibold transition-all shadow-lg shadow-purple-900/10 flex items-center justify-center min-w-[140px]"
        >
          {saveLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang lưu...
            </>
          ) : (
            'Lưu thay đổi'
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <svg className="animate-spin h-8 w-8 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-500 font-semibold text-sm">Đang tải cấu hình...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: General settings */}
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Cài đặt chung Website
            </h3>

            {/* Site Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide">Tên Website</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2.5 px-3.5 text-xs font-medium outline-none transition-all"
              />
            </div>

            {/* Site Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide">Mô tả Website</label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl p-3.5 text-xs outline-none transition-all h-24 resize-none"
              />
            </div>

            {/* Favicon URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide">Favicon (Icon Tab)</label>
              <div className="flex items-center gap-4">
                {faviconUrl ? (
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={faviconUrl} alt="Favicon Preview" className="w-12 h-12 object-contain rounded-xl bg-gray-50 border border-gray-200 p-1 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setFaviconUrl('')}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      title="Xóa ảnh"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/x-icon, image/svg+xml"
                    id="favicon-upload"
                    className="hidden"
                    onChange={handleFaviconUpload}
                  />
                  <label
                    htmlFor="favicon-upload"
                    className="cursor-pointer inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Tải ảnh từ máy
                  </label>
                  <p className="text-[10px] text-gray-500 mt-1.5">Hỗ trợ PNG, JPG, ICO, SVG. Tối đa 500KB.</p>
                </div>
              </div>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-red-800">Chế độ bảo trì hệ thống</p>
                <p className="text-xs text-red-600/70 mt-0.5">Khi được bật, độc giả sẽ không thể truy cập đọc truyện ngoại trừ tài khoản Admin.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>

          {/* Card 2: Content Rules & Moderation */}
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
              </svg>
              Quy tắc & Kiểm duyệt Nội dung
            </h3>

            {/* Min Chapter Length */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide">
                Độ dài tối thiểu của một chương (Từ/Chữ)
              </label>
              <input
                type="number"
                required
                value={minChapterLength}
                onChange={(e) => setMinChapterLength(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2.5 px-3.5 text-xs font-medium outline-none transition-all font-mono"
              />
            </div>

            {/* Auto Approve Comments Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-800">Tự động duyệt bình luận</p>
                <p className="text-xs text-gray-500 mt-0.5">Cho phép hiển thị bình luận mới của độc giả ngay mà không cần qua danh mục duyệt.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApproveComments}
                  onChange={(e) => setAutoApproveComments(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Allow Guest Reading Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-800">Cho phép đọc không cần đăng nhập</p>
                <p className="text-xs text-gray-500 mt-0.5">Khách vãng lai (Guest) có thể truy cập đọc chi tiết toàn bộ chương truyện.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowGuestReading}
                  onChange={(e) => setAllowGuestReading(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Allow Comments System-Wide Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-800">Cho phép bình luận (Toàn hệ thống)</p>
                <p className="text-xs text-gray-500 mt-0.5">Bật hoặc tắt chức năng đăng bình luận của độc giả trên toàn bộ trang web.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Card 3: Security & Session settings */}
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 lg:col-span-2">
            <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Chính sách Bảo mật & Phiên làm việc
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Login Attempts */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide">
                  Số lần đăng nhập sai tối đa
                </label>
                <input
                  type="number"
                  required
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2.5 px-3.5 text-xs font-medium outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">Số lần gõ sai mật khẩu trước khi tạm khóa IP của tài khoản (mặc định: 5).</p>
              </div>

              {/* Session Timeout */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-650 uppercase tracking-wide">
                  Thời gian duy trì phiên đăng nhập (Giờ)
                </label>
                <input
                  type="number"
                  required
                  value={sessionTimeoutHours}
                  onChange={(e) => setSessionTimeoutHours(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-800 rounded-xl py-2.5 px-3.5 text-xs font-medium outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">Số giờ token xác thực (JWT) có giá trị trước khi tự động hết hạn yêu cầu login lại.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

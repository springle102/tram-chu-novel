'use client';

import { useState, useEffect } from 'react';
import { fetchAdmin, getAdminUser } from '../utils';

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [role, setRole] = useState('');

  // Author specific states
  const [bio, setBio] = useState('');
  const [donationLink, setDonationLink] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetchAdmin('/api/admin/profile');
        if (res.success && res.data) {
          const profile = res.data;
          setUsername(profile.username || '');
          setEmail(profile.email || '');
          setAvatarUrl(profile.avatar_url || '');
          setCreatedAt(profile.created_at || '');
          setRole(profile.role || '');
          
          if (profile.role === 'author') {
            setBio(profile.bio || '');
            setDonationLink(profile.donation_link || '');
          }
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setMessage({ type: 'error', text: err.message || 'Không thể tải thông tin hồ sơ cá nhân.' });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh đại diện không được vượt quá 3MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDonationQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh QR Code không được vượt quá 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDonationLink(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!username.trim()) {
      setMessage({ type: 'error', text: 'Tên hiển thị/bút danh không được để trống.' });
      return;
    }
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Email không được để trống.' });
      return;
    }
    if (password && password.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không trùng khớp.' });
      return;
    }

    setSubmitting(true);

    try {
      const body: any = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        avatarUrl: avatarUrl.trim() || null,
        password: password || null,
      };

      if (role === 'author') {
        body.bio = bio.trim();
        body.donationLink = donationLink.trim();
      }

      const res = await fetchAdmin('/api/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (res.success && res.data) {
        setMessage({ type: 'success', text: 'Cập nhật hồ sơ cá nhân thành công!' });
        
        // Clear password fields
        setPassword('');
        setConfirmPassword('');

        // Sync with localStorage
        const adminUser = getAdminUser();
        if (adminUser) {
          const updatedUser = {
            ...adminUser,
            fullName: res.data.fullName,
            email: res.data.email,
            avatarUrl: res.data.avatarUrl || undefined,
          };
          localStorage.setItem('admin_user', JSON.stringify(updatedUser));
          
          // Dispatch custom event to notify layout.tsx
          window.dispatchEvent(new Event('adminUserUpdated'));
        }
      } else {
        throw new Error(res.error || 'Cập nhật thất bại.');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối khi cập nhật hồ sơ.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-purple-600 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-500 text-sm">Đang tải thông tin hồ sơ...</span>
        </div>
      </div>
    );
  }

  const isAuthor = role === 'author';
  const displayRoleName = role === 'admin' ? 'Quản trị viên (Admin)' : 'Tác giả (Author)';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <p className="text-sm text-gray-500 mt-1">Xem và quản lý thông tin tài khoản của bạn trên hệ thống</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-start border ${
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
        {/* Left Column: Avatar & Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center">
            {/* Avatar image preview */}
            <div className="relative w-32 h-32 mb-4 group">
              <img
                src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=7c3aed&color=fff&size=128`}
                alt={username}
                className="w-full h-full rounded-2xl object-cover border-2 border-purple-500/20 shadow-inner"
              />
            </div>

            <h2 className="text-lg font-bold text-gray-950 text-center truncate w-full">{username}</h2>
            <p className="text-xs text-gray-500 mt-0.5 break-all max-w-full">{email}</p>
            
            <div className="mt-4 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-100 uppercase tracking-wider">
              {displayRoleName}
            </div>

            <div className="w-full border-t border-gray-100 mt-6 pt-4 space-y-2.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Ngày tham gia:</span>
                <span className="font-medium text-gray-800">
                  {createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : '---'}
                </span>
              </div>
              {isAuthor && (
                <div className="flex justify-between">
                  <span>Vai trò hệ thống:</span>
                  <span className="font-semibold text-purple-600">Nhà sáng tạo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-md font-bold text-gray-900 mb-6">Thông tin chi tiết</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    {isAuthor ? 'Bút danh (Pen Name)' : 'Tên quản trị viên'}
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isAuthor ? 'Nhập bút danh viết truyện...' : 'Nhập tên hiển thị...'}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Email đăng nhập
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email của bạn..."
                    className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Tải ảnh đại diện mới từ máy tính (Tối đa 3MB)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100
                      cursor-pointer focus:outline-none"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="text-xs text-red-500 hover:text-red-600 font-semibold shrink-0"
                    >
                      Xoá ảnh
                    </button>
                  )}
                </div>
              </div>

              {/* Author Specific Fields */}
              {isAuthor && (
                <>
                  {/* Donation QR Code */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      Ảnh Mã QR Donate Ủng Hộ (Tối đa 2MB)
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDonationQrChange}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-xl file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100
                            cursor-pointer focus:outline-none"
                        />
                        {donationLink && (
                          <button
                            type="button"
                            onClick={() => setDonationLink('')}
                            className="text-xs text-red-500 hover:text-red-600 font-semibold shrink-0"
                          >
                            Xoá mã QR
                          </button>
                        )}
                      </div>
                      
                      {donationLink && (donationLink.startsWith('data:image/') || donationLink.startsWith('http')) && (
                        <div className="bg-white border border-gray-200 p-2 rounded-xl shadow-sm inline-block">
                          <img
                            src={donationLink}
                            alt="Mã QR Donation Preview"
                            className="w-32 h-32 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      Tiểu sử tác giả (Bio)
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Nhập giới thiệu ngắn về bản thân..."
                      rows={4}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all resize-none"
                    />
                  </div>
                </>
              )}

              {/* Password Section */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Đổi mật khẩu (Tuỳ chọn)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl px-6 py-2.5 shadow-md shadow-purple-900/10 hover:shadow-purple-700/20 flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

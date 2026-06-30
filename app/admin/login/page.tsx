'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '../utils';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'author'>('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin' || user.role === 'author') {
          router.push('/admin');
        }
      } catch (e) {
        // Clear corrupt data
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = getApiBaseUrl();
      const endpoint = role === 'admin' ? '/api/admin/login' : '/api/auth/login';
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }

      const responseData = data.data || data;
      if (responseData && responseData.token && responseData.user) {
        const loggedUser = responseData.user;
        if (loggedUser.role !== 'admin' && loggedUser.role !== 'author') {
          throw new Error('Tài khoản của bạn không có quyền truy cập trang quản trị.');
        }

        if (loggedUser.role !== role) {
          throw new Error(`Vai trò đã chọn không khớp với vai trò của tài khoản này.`);
        }

        localStorage.setItem('admin_token', responseData.token);
        localStorage.setItem('admin_user', JSON.stringify(loggedUser));
        router.push('/admin');
      } else {
        throw new Error('Không nhận được thông tin đăng nhập hợp lệ từ hệ thống.');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0f0c1b] overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Main Container */}
      <div className="relative w-full max-w-md px-6 py-8">
        {/* Back Link */}
        <div className="mb-6 text-center">
          <a
            href="/"
            className="inline-flex items-center text-sm text-purple-300 hover:text-purple-200 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại trang chủ Trạm Chữ Novel
          </a>
        </div>

        {/* Card */}
        <div className="bg-[#1a162e]/80 border border-purple-500/20 backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-purple-950/30">
          <div className="flex flex-col items-center mb-8">
            {/* Logo Icon */}
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4 border border-purple-400/20">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Trạm Chữ Novel</h1>
            <p className="text-xs text-purple-400 mt-1 uppercase tracking-widest font-semibold">Cổng quản trị hệ thống</p>
          </div>

          {/* Role Toggle Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#130f24] rounded-xl border border-purple-500/10 mb-6">
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`py-2 px-1 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                role === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Administrator
            </button>
            <button
              type="button"
              onClick={() => setRole('author')}
              className={`py-2 px-1 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                role === 'author'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Tác giả (Author)
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-200 text-sm px-4 py-3 rounded-xl mb-6 flex items-start">
              <svg className="w-5 h-5 mr-2 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">Email đăng nhập</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                 <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn..."
                  className="w-full bg-[#130f24] border border-purple-500/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder-purple-700"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn..."
                  className="w-full bg-[#130f24] border border-purple-500/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white rounded-xl py-3 pl-10 pr-12 text-sm outline-none transition-all placeholder-purple-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-400 hover:text-purple-300 outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl py-3 font-semibold text-sm transition-all duration-300 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                'Đăng nhập hệ thống'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

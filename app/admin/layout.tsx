'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getAdminUser, logoutAdmin, fetchAdmin } from './utils';
import NotificationDropdown from './components/NotificationDropdown';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; fullName: string; email: string; role: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Tự động đóng mobile sidebar khi thay đổi trang
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // If it's the login page, we don't need auth checks or sidebar
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      const adminUser = getAdminUser();

      if (!token || !adminUser) {
        router.push('/admin/login');
      } else {
        setUser(adminUser);
        setLoading(false);

        // Fetch fresh profile in background to sync localStorage
        try {
          const res = await fetchAdmin('/api/admin/profile');
          if (res.success && res.data) {
            const profile = res.data;
            if (
              adminUser.fullName !== profile.username ||
              adminUser.email !== profile.email ||
              adminUser.avatarUrl !== profile.avatar_url
            ) {
              const updatedUser = {
                ...adminUser,
                fullName: profile.username,
                email: profile.email,
                avatarUrl: profile.avatar_url || undefined,
              };
              localStorage.setItem('admin_user', JSON.stringify(updatedUser));
              setUser(updatedUser);
            }
          }
        } catch (err) {
          console.error('Failed to sync profile in background:', err);
        }
      }
    };

    checkAuth();

    const handleUserUpdate = () => {
      const adminUser = getAdminUser();
      if (adminUser) {
        setUser(adminUser);
      }
    };

    window.addEventListener('adminUserUpdated', handleUserUpdate);
    return () => {
      window.removeEventListener('adminUserUpdated', handleUserUpdate);
    };
  }, [isLoginPage, router]);

  const handleLogout = () => {
    logoutAdmin();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-purple-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 font-medium">Đang tải cấu hình quản trị...</span>
        </div>
      </div>
    );
  }

  // If it's the login page, render the child directly (without sidebar or headers)
  if (isLoginPage) {
    return <>{children}</>;
  }

  const isAdmin = user?.role === 'admin';

  // Navigation Items
  const navItems = isAdmin
    ? [
        {
          name: 'Dashboard',
          href: '/admin',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
        {
          name: 'Hồ sơ cá nhân',
          href: '/admin/profile',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
        {
          name: 'Quản lý Truyện',
          href: '/admin/stories',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          name: 'Quản lý Độc giả',
          href: '/admin/readers',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          name: 'Quản lý Tác giả',
          href: '/admin/authors',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          ),
        },
        {
          name: 'Thể loại',
          href: '/admin/categories',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          name: 'Bình luận',
          href: '/admin/comments',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          name: 'Quản lý Báo lỗi',
          href: '/admin/reports',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
        {
          name: 'Cài đặt hệ thống',
          href: '/admin/settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ]
    : [
        {
          name: 'Dashboard',
          href: '/admin',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
        {
          name: 'Hồ sơ cá nhân',
          href: '/admin/profile',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
        {
          name: 'Truyện của tôi',
          href: '/admin/stories',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          name: 'Bình luận',
          href: '/admin/comments',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
      ];

  // Get active tab name for breadcrumb
  const currentNav = navItems.find((item) => item.href === pathname) || navItems[0];

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden animate-in fade-in duration-200" 
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-[#0f0c1b] text-gray-300 flex flex-col border-r border-purple-900/10 shadow-xl z-30 transition-transform duration-300 md:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo */}
        <div className="p-6 border-b border-purple-900/30 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-white leading-tight">Trạm Chữ Novel</h2>
            <span className="text-[10px] bg-purple-600/30 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/20 uppercase tracking-widest mt-1 inline-block">
              {isAdmin ? 'Admin' : 'Tác giả'}
            </span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 font-semibold'
                    : 'hover:bg-purple-950/20 hover:text-purple-300'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile details */}
        <div className="p-4 border-t border-purple-900/30 bg-[#0d0917]">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=7c3aed&color=fff`}
              alt={user?.fullName}
              className="w-10 h-10 rounded-xl border border-purple-500/20 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight">{user?.fullName}</p>
              <p className="text-xs text-purple-400 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/10 hover:border-red-500/20 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 md:pl-64 pl-0 flex flex-col min-h-screen min-w-0 transition-all duration-300">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          {/* Breadcrumb & Menu Toggle */}
          <div className="flex items-center">
            {/* Hamburger menu button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors focus:outline-none mr-2"
              title="Mở menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 font-medium">
              <span className="font-semibold text-purple-600 hidden xs:inline">Admin Panel</span>
              <span className="text-gray-400 hidden xs:inline">/</span>
              <span className="font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-none">{currentNav.name}</span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 md:gap-4">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-all duration-200"
            >
              Xem trang chủ
              <svg className="w-3.5 h-3.5 ml-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            
            <NotificationDropdown />

            <div className="flex items-center gap-2">
              <img
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=7c3aed&color=fff`}
                alt={user?.fullName}
                className="w-8 h-8 rounded-full border border-gray-200 object-cover"
              />
              <span className="text-sm font-semibold text-gray-700 hidden md:block">{user?.fullName}</span>
            </div>
          </div>
        </header>

        {/* Content Box */}
        <main className="flex-1 p-4 md:p-8 bg-gray-50 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

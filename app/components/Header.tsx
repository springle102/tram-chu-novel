"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import logoImg from "@/app/logo.png";
import type { HeaderProps } from "@/app/types";
import { useSearchParams } from "next/navigation";

// ===========================
// SVG Icons (inline, no external deps)
// ===========================

function BookIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" />
      <path d="M8 11h4" />
    </svg>
  );
}

function SearchIcon({ className = "text-white/70" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ===========================
// Header Component
// ===========================

export default function Header({
  isLoggedIn,
  user,
  onLogin,
  onLogout,
  onSearch,
  onCategoryChange,
  selectedCategory: propSelectedCategory,
}: HeaderProps) {
  const searchParams = useSearchParams();
  const activeStatus = searchParams.get("status");

  const [categories, setCategories] = useState<string[]>(["Tất cả"]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Sync selectedCategory from prop
  useEffect(() => {
    if (propSelectedCategory) {
      setSelectedCategory(propSelectedCategory);
    }
  }, [propSelectedCategory]);

  // Load categories from database
  useEffect(() => {
    async function loadCategories() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const names = json.data.map((cat: any) => cat.name);
            setCategories(["Tất cả", ...names]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }
    loadCategories();
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const mobileCategoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
      if (
        mobileCategoryDropdownRef.current &&
        !mobileCategoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMobileCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setIsCategoryMenuOpen(false);
        setIsMobileCategoryMenuOpen(false);
        setIsNotifDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Fetch reader notifications
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadNotifCount(0);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    async function loadNotifications() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setNotifications(json.data);
            setUnreadNotifCount(json.data.filter((n: any) => !n.is_read).length);
          }
        }
      } catch (err) {
        console.error("Failed to load reader notifications:", err);
      }
    }

    loadNotifications();

    // Poll notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Click outside and key Esc listener for notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markNotifAsRead = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${apiBaseUrl}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc thông báo:", err);
    }
  };

  const markAllNotifsAsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${apiBaseUrl}/api/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotifCount(0);
      }
    } catch (err) {
      console.error("Lỗi đánh dấu tất cả đã đọc thông báo:", err);
    }
  };

  const formatNotifTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'new_comment':
      case 'comment_reply':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'new_rating':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        );
      case 'new_bookmark':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
        );
      case 'new_like':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        );
      case 'story_approved':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'story_rejected':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch?.(searchQuery);
  }

  return (
    <header
      id="main-header"
      className="sticky top-0 z-50 bg-gradient-to-r from-indigo-950 via-purple-900 to-violet-900 shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 sm:py-3 sm:px-6 lg:px-8">
        {/* ── Logo (Left) ── */}
        <div className="flex items-center gap-6 shrink-0">
          <a
            href="/"
            id="logo-link"
            className="flex items-center group transition-all duration-300 ml-4"
          >
            <div className="drop-shadow-[0_0_6px_rgba(192,132,252,0.4)] group-hover:drop-shadow-[0_0_10px_rgba(192,132,252,0.7)] transition-all duration-300">
              <Image 
                src={logoImg} 
                alt="Trạm Chữ Novel Logo" 
                width={180}
                height={68}
                className="object-contain h-10 w-auto sm:h-12 md:h-14"
                priority
              />
            </div>
          </a>

          {/* ── Navigation Tabs ── */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold tracking-wide">
            <a
              href="/?status=ongoing"
              className={`transition-colors duration-200 py-1 ${
                activeStatus === "ongoing"
                  ? "text-fuchsia-400 border-b-2 border-fuchsia-400"
                  : "text-white/80 hover:text-fuchsia-300"
              }`}
            >
              Truyện chưa hoàn
            </a>
            <a
              href="/?status=completed"
              className={`transition-colors duration-200 py-1 ${
                activeStatus === "completed"
                  ? "text-fuchsia-400 border-b-2 border-fuchsia-400"
                  : "text-white/80 hover:text-fuchsia-300"
              }`}
            >
              Truyện đã hoàn
            </a>
          </nav>
        </div>

        {/* ── Search Bar & Category Filter (Center) ── */}
        <form
          onSubmit={handleSearchSubmit}
          className="mx-4 hidden w-full max-w-md sm:block lg:max-w-lg"
        >
          <div className="flex items-center gap-2">
            {/* Custom Category Dropdown */}
            <div ref={categoryDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/20 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                aria-expanded={isCategoryMenuOpen}
                aria-haspopup="true"
              >
                <span className="max-w-[80px] truncate md:max-w-none">{selectedCategory}</span>
                <ChevronDownIcon />
              </button>
              {isCategoryMenuOpen && (
                <ul
                  className="absolute left-0 mt-2 w-48 origin-top-left rounded-xl border border-white/15 bg-indigo-950 py-1.5 shadow-[0_4px_20px_rgba(217,70,239,0.3)] z-50 animate-in fade-in duration-100 focus:outline-none max-h-72 overflow-y-auto"
                  role="menu"
                >
                  {categories.map((cat) => (
                    <li key={cat}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryMenuOpen(false);
                          onCategoryChange?.(cat);
                        }}
                        className={`flex w-full items-center px-4 py-2 text-sm text-left transition-colors hover:bg-fuchsia-600 hover:text-white ${
                          selectedCategory === cat ? "bg-white/10 text-fuchsia-300 font-semibold" : "text-white/90"
                        }`}
                      >
                        {cat}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Input & Search Button */}
            <div className="relative flex-1">
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên truyện hoặc tác giả cần tìm..."
                className="w-full rounded-full bg-white/25 backdrop-blur-md py-2 pl-4 pr-10 text-sm text-white placeholder:text-white/60 border border-white/20 outline-none transition-all duration-200 focus:bg-white/35 focus:border-white/40 focus:ring-1 focus:ring-white/20"
              />
              <button
                type="submit"
                id="search-button"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors hover:bg-white/10"
                aria-label="Tìm kiếm"
              >
                <SearchIcon className="text-white/70 hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </form>

        {/* ── Auth Section (Right) ── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile search button */}
          <button
            id="mobile-search-toggle"
            onClick={() => setIsMobileSearchOpen(prev => !prev)}
            className={`rounded-full p-2 text-white transition-colors sm:hidden ${
              isMobileSearchOpen ? "bg-white/20" : "hover:bg-white/10"
            }`}
            aria-label="Mở tìm kiếm"
          >
            <SearchIcon />
          </button>

          {!isLoggedIn ? (
            /* ── Logged Out: Login Button ── */
            <button
              id="login-button"
              onClick={onLogin}
              className="rounded-full border-2 border-white/80 px-5 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:border-white hover:bg-white hover:text-indigo-950"
            >
              Đăng Nhập
            </button>
          ) : (
            /* ── Logged In: Controls ── */
            <div className="flex items-center gap-3">
              {/* ── Notification Dropdown ── */}
              <div ref={notifDropdownRef} className="sm:relative">
                <button
                  id="reader-notif-button"
                  onClick={() => setIsNotifDropdownOpen((prev) => !prev)}
                  className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all focus:outline-none"
                  aria-label="Thông báo"
                >
                  <BellIcon />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border border-indigo-950">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>

                {isNotifDropdownOpen && (
                  <div
                    id="reader-notif-dropdown"
                    className="absolute left-4 right-4 sm:left-auto sm:right-0 top-full mt-2 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in"
                  >
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-gray-800 text-sm">Thông báo</h3>
                      {unreadNotifCount > 0 && (
                        <button
                          onClick={markAllNotifsAsRead}
                          className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3.5 flex gap-2.5 transition-colors hover:bg-gray-50 cursor-pointer ${
                                !notification.is_read ? 'bg-purple-50/30' : ''
                              }`}
                              onClick={() => {
                                if (!notification.is_read) markNotifAsRead(notification.id);
                                if (notification.link) {
                                  window.location.href = notification.link;
                                }
                                setIsNotifDropdownOpen(false);
                              }}
                            >
                               {getNotifIcon(notification.type)}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                  {notification.message}
                                </p>
                                <p className="text-[9px] text-gray-400 mt-1 font-medium">
                                  {formatNotifTime(notification.created_at)}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center flex flex-col items-center">
                          <svg className="w-10 h-10 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-xs text-gray-500">Bạn chưa có thông báo nào</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Avatar Dropdown ── */}
              <div ref={dropdownRef} className="relative">
                <button
                  id="avatar-button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-full p-1 text-white transition-colors hover:bg-white/15"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  {/* Avatar circle — default icon, no real photo */}
                  <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary-light ring-2 ring-white/30">
                    {user?.avatarUrl ? (
                      <span
                        className="h-full w-full rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${user.avatarUrl})` }}
                      />
                    ) : (
                      <UserIcon />
                    )}
                  </span>
                  <ChevronDownIcon />
                </button>

                {/* ── Dropdown Menu ── */}
                {isDropdownOpen && (
                  <div
                    id="user-dropdown"
                    className="absolute right-0 top-full mt-2 w-52 origin-top-right animate-in rounded-xl border border-border-light bg-white py-1 shadow-lg"
                    role="menu"
                  >
                    {/* User info header */}
                    {user?.displayName && (
                      <div className="border-b border-border-light px-4 py-3">
                        <p className="text-sm font-semibold text-text-heading">
                          {user.displayName}
                        </p>
                      </div>
                    )}

                    {user?.role === 'author' && (
                      <a
                        href="/author-dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        id="menu-author-dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-body transition-colors hover:bg-primary-surface hover:text-primary"
                        role="menuitem"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Quản lý truyện
                      </a>
                    )}

                    <a
                      href={user?.role === 'author' ? `/author/${user.id}` : "/profile"}
                      id="menu-profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-body transition-colors hover:bg-primary-surface hover:text-primary"
                      role="menuitem"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Hồ Sơ Cá Nhân
                    </a>

                    <div className="my-1 border-t border-border-light" />

                    <button
                      id="menu-logout"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        localStorage.removeItem("admin_token");
                        localStorage.removeItem("admin_user");
                        onLogout?.();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
                      role="menuitem"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Đăng Xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Navigation Links (Always visible, very compact) ── */}
      <div className="border-t border-white/5 bg-white/5 py-1.5 px-4 sm:hidden flex justify-around items-center text-xs font-semibold text-white/90">
        <a
          href="/?status=ongoing"
          className={`transition-colors duration-200 ${
            activeStatus === "ongoing"
              ? "text-fuchsia-400 font-bold"
              : "text-white/80 hover:text-fuchsia-300"
          }`}
        >
          Truyện chưa hoàn
        </a>
        <a
          href="/?status=completed"
          className={`transition-colors duration-200 ${
            activeStatus === "completed"
              ? "text-fuchsia-400 font-bold"
              : "text-white/80 hover:text-fuchsia-300"
          }`}
        >
          Truyện đã hoàn
        </a>
      </div>

      {/* ── Mobile Search Bar & Category Filter (expandable) ── */}
      {isMobileSearchOpen && (
        <div className="border-t border-white/10 px-4 py-2 sm:hidden animate-in slide-in-from-top duration-200">
          <form onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2">
              {/* Custom Category Dropdown (Mobile) */}
              <div ref={mobileCategoryDropdownRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileCategoryMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-white/20 focus:outline-none"
                  aria-expanded={isMobileCategoryMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="max-w-[70px] truncate">{selectedCategory}</span>
                  <ChevronDownIcon />
                </button>
                {isMobileCategoryMenuOpen && (
                  <ul
                    className="absolute left-0 mt-2 w-40 origin-top-left rounded-xl border border-white/15 bg-indigo-950 py-1 shadow-[0_4px_20px_rgba(217,70,239,0.3)] z-50 focus:outline-none max-h-72 overflow-y-auto"
                    role="menu"
                  >
                    {categories.map((cat) => (
                      <li key={cat}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsMobileCategoryMenuOpen(false);
                            onCategoryChange?.(cat);
                          }}
                          className={`flex w-full items-center px-3 py-1.5 text-xs text-left transition-colors hover:bg-fuchsia-600 hover:text-white ${
                            selectedCategory === cat ? "bg-white/10 text-fuchsia-300 font-semibold" : "text-white/90"
                          }`}
                        >
                          {cat}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Mobile Input Field */}
              <div className="relative flex-1">
                <input
                  id="mobile-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên truyện cần tìm..."
                  className="w-full rounded-full bg-white/25 backdrop-blur-md py-2 pl-4 pr-10 text-sm text-white placeholder:text-white/60 border border-white/20 outline-none transition-all duration-200 focus:bg-white/35 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-white/10"
                  aria-label="Tìm kiếm"
                >
                  <SearchIcon className="text-white/70 hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}

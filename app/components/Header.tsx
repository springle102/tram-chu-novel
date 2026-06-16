"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import logoImg from "@/app/logo.png";
import type { HeaderProps } from "@/app/types";

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
      width="22"
      height="22"
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

const categories = [
  "Tất cả",
  "Tu tiên",
  "Huyền huyễn",
  "Đam mỹ",
  "Hiện đại",
  "Đô thị",
  "Cung đình",
  "Âm mưu",
  "Ma pháp",
];

// ===========================
// Header Component
// ===========================

export default function Header({
  isLoggedIn,
  user,
  onLogin,
  onLogout,
  onSearch,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch?.(searchQuery);
  }

  return (
    <header
      id="main-header"
      className="sticky top-0 z-50 bg-gradient-to-r from-indigo-950 via-purple-900 to-violet-900 shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* ── Logo (Left) ── */}
        <a
          href="/"
          id="logo-link"
          className="flex items-center group transition-all duration-300 shrink-0 ml-4"
        >
          <div className="drop-shadow-[0_0_6px_rgba(192,132,252,0.4)] group-hover:drop-shadow-[0_0_10px_rgba(192,132,252,0.7)] transition-all duration-300">
            <Image 
              src={logoImg} 
              alt="Novel Violet Logo" 
              width={200}
              height={75}
              className="object-contain"
              style={{ height: '75px', width: 'auto' }}
              priority
            />
          </div>
        </a>

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
                  className="absolute left-0 mt-2 w-48 origin-top-left rounded-xl border border-white/15 bg-indigo-950 py-1.5 shadow-[0_4px_20px_rgba(217,70,239,0.3)] z-50 animate-in fade-in duration-100 focus:outline-none"
                  role="menu"
                >
                  {categories.map((cat) => (
                    <li key={cat}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryMenuOpen(false);
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
                placeholder="Tìm kiếm truyện, tác giả..."
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
            className="rounded-full p-2 text-white transition-colors hover:bg-white/10 sm:hidden"
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
            /* ── Logged In: Avatar + Dropdown ── */
            <div ref={dropdownRef} className="relative">
              <button
                id="avatar-button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full p-1 text-white transition-colors hover:bg-white/15"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                {/* Avatar circle — default icon, no real photo */}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light ring-2 ring-white/30">
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

                  <a
                    href="/profile"
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
          )}
        </div>
      </div>

      {/* ── Mobile Search Bar & Category Filter (expandable) ── */}
      <div className="border-t border-white/10 px-4 py-2 sm:hidden">
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
                  className="absolute left-0 mt-2 w-40 origin-top-left rounded-xl border border-white/15 bg-indigo-950 py-1 shadow-[0_4px_20px_rgba(217,70,239,0.3)] z-50 focus:outline-none"
                  role="menu"
                >
                  {categories.map((cat) => (
                    <li key={cat}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsMobileCategoryMenuOpen(false);
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
                placeholder="Tìm kiếm truyện..."
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
    </header>
  );
}

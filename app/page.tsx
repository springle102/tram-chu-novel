"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import logoImg from "@/app/logo.png";
import type { Story, User } from "@/app/types";
import Header from "@/app/components/Header";
import StoryGrid from "@/app/components/StoryGrid";
import Pagination from "@/app/components/Pagination";

// ===========================
// Homepage
// ===========================

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Auth State ──
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // ── Story Data (to be fetched from API) ──
  const [stories, setStories] = useState<Story[]>([]);
  const [matchingAuthors, setMatchingAuthors] = useState<any[]>([]);

  // ── Filter & Search State ──
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Fetch Stories from Backend API ──
  async function fetchStories(page: number, category: string, search: string, status?: string | null) {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      console.log(`[FRONTEND] Đang gọi API lấy danh sách truyện trang ${page}...`);
      let url = `${apiBaseUrl}/api/stories?page=${page}&limit=10`;
      if (category && category !== "Tất cả" && category !== "null" && category !== "undefined") {
        url += `&category=${encodeURIComponent(category)}`;
      }
      if (search && search !== "null" && search !== "undefined") {
        url += `&search=${encodeURIComponent(search)}`;
      }
      if (status && status !== "null" && status !== "undefined") {
        url += `&status=${encodeURIComponent(status)}`;
      }
      
      const res = await fetch(url, { cache: "no-store" });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Data nhận được ở Frontend:", data);

      if (data.success && data.data) {
        // Ánh xạ dữ liệu snake_case từ DB sang camelCase của interface Story
        const mappedStories = (data.data.stories || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          author: s.author_display_name || s.author_name || "Vô danh",
          coverImageUrl: s.cover_image || null,
          rating: Number(s.rating) || 0,
          chapterCount: s.chapter_count || 0,
          slug: s.slug,
          categories: s.categories || [],
        }));
        
        setStories(mappedStories);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }

      // Fetch matching authors if search query exists
      if (search && search.trim() && search !== "null" && search !== "undefined") {
        try {
          const authorRes = await fetch(`${apiBaseUrl}/api/authors?search=${encodeURIComponent(search.trim())}`, { cache: "no-store" });
          if (authorRes.ok) {
            const authorData = await authorRes.json();
            if (authorData.success && Array.isArray(authorData.data)) {
              setMatchingAuthors(authorData.data);
            } else {
              setMatchingAuthors([]);
            }
          } else {
            setMatchingAuthors([]);
          }
        } catch (err) {
          console.error("Lỗi khi tải thông tin tác giả:", err);
          setMatchingAuthors([]);
        }
      } else {
        setMatchingAuthors([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách truyện ở Frontend:", err);
    }
  }

  // ── Fetch stories when current page, category, search, or status changes ──
  useEffect(() => {
    fetchStories(currentPage, selectedCategory, searchQuery, selectedStatus);
  }, [currentPage, selectedCategory, searchQuery, selectedStatus]);

  // ── Sync with URL parameters reactively ──
  useEffect(() => {
    const cat = searchParams.get("category") || "Tất cả";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || null;
    setSelectedCategory(cat);
    setSearchQuery(search);
    setSelectedStatus(status);
  }, [searchParams]);

  // ── Load Auth State on Mount ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Failed to parse user details from localStorage:", err);
      }
    }
  }, []);

  // ── Handlers ──
  function handleLogin() {
    router.push("/auth");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setCurrentPage(1);
    
    // Đồng bộ URL query params
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      router.push(`/?${params.toString()}`);
    }
  }

  function handleCategoryChange(category: string) {
    setSelectedCategory(category);
    setCurrentPage(1);

    // Đồng bộ URL query params
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (category && category !== "Tất cả") {
        params.set("category", category);
      } else {
        params.delete("category");
      }
      router.push(`/?${params.toString()}`);
    }
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Header ── */}
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        selectedCategory={selectedCategory}
      />

      {/* ── Main Content ── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Matching Authors (Related Profiles) ── */}
        {matchingAuthors.length > 0 && (
          <div className="mb-8 rounded-2xl bg-purple-50/50 p-4 border border-purple-200/50 shadow-sm animate-in fade-in duration-300">
            <h2 className="text-sm font-bold text-purple-950 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20 11.5 11.5 0 015 19.128v-.109c0-1.11-.283-2.158-.783-3.069m0 0a3.003 3.003 0 00-2.254-2.235m2.254 2.235a9.339 9.339 0 012.625-.372 9.337 9.337 0 014.121.952m-8.995-2.78c-.702.095-1.353.409-1.895.882m17.4-.882a10.742 10.742 0 01-.12 1.348M10.5 8.25a3 3 0 11-6 0 3 3 0 016 0zm2.25 2.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              Tác giả liên quan
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matchingAuthors.map((author: any) => (
                <div 
                  key={author.id}
                  onClick={() => router.push(`/author/${author.id}`)}
                  className="flex items-center gap-4 bg-white border border-purple-500/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-500/20 cursor-pointer"
                >
                  <img
                    src={author.avatar_url || "/logo.png"}
                    alt={author.pen_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-purple-400/50 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-purple-950 truncate">
                      {author.pen_name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 italic line-clamp-2">
                      {author.bio || "Chưa có lời giới thiệu."}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSearch(author.pen_name);
                      }}
                      className="px-3 py-1 bg-gradient-to-r from-purple-700 to-fuchsia-600 text-[11px] font-bold text-white rounded-full mt-2 inline-block shadow-sm hover:opacity-90 transition-opacity"
                    >
                      Xem truyện
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <StoryGrid stories={stories} />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border-light bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Image 
                src={logoImg} 
                alt="Trạm Chữ Novel Logo" 
                width={140}
                height={44}
                className="object-contain h-10 w-auto"
              />
              <span>— Đọc truyện tiểu thuyết online</span>
            </div>
            <p className="text-xs text-text-light">
              © 2026 Trạm Chữ Novel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0c1b] flex items-center justify-center text-white/50">Đang tải...</div>}>
      <HomeContent />
    </Suspense>
  );
}

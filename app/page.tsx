"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logoImg from "@/app/logo.png";
import type { Story, User } from "@/app/types";
import Header from "@/app/components/Header";
import StoryGrid from "@/app/components/StoryGrid";
import Pagination from "@/app/components/Pagination";

// ===========================
// Homepage
// ===========================

export default function Home() {
  const router = useRouter();

  // ── Auth State ──
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // ── Story Data (to be fetched from API) ──
  const [stories, setStories] = useState<Story[]>([]);

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Fetch Stories from Backend API ──
  async function fetchStories(page: number) {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      console.log(`[FRONTEND] Đang gọi API lấy danh sách truyện trang ${page}...`);
      const res = await fetch(`${apiBaseUrl}/api/stories?page=${page}&limit=10`);
      
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
    } catch (err) {
      console.error("Lỗi khi tải danh sách truyện ở Frontend:", err);
    }
  }

  // ── Fetch stories when current page changes ──
  useEffect(() => {
    fetchStories(currentPage);
  }, [currentPage]);

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
    // TODO: Integrate with search API
    console.log("Search:", query);
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
      />

      {/* ── Main Content ── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8">
        <StoryGrid stories={stories} />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border-light bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Image 
                src={logoImg} 
                alt="Novel Violet Logo" 
                width={140}
                height={44}
                className="object-contain"
                style={{ height: '44px', width: 'auto' }}
              />
              <span>— Đọc truyện tiểu thuyết online</span>
            </div>
            <p className="text-xs text-text-light">
              © 2026 Novel Violet. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

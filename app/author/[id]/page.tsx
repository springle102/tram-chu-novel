"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import logoImg from "@/app/logo.png";
import Header from "@/app/components/Header";
import type { User } from "@/app/types";
import Link from "next/link";

interface AuthorProfile {
  id: string;
  pen_name: string;
  avatar_url: string | null;
  bio: string | null;
  donation_link: string | null;
}

interface Story {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  description: string | null;
  status: string;
  view_count: number;
  rating: number;
  chapter_count: number;
  like_count: number;
  categories: { id: string; name: string }[];
}

export default function AuthorProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  // Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Data States
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Failed to parse user details:", err);
      }
    }

    async function fetchAuthorProfile() {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/authors/${id}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) throw new Error("Không tìm thấy thông tin tác giả.");
          throw new Error("Có lỗi xảy ra khi tải thông tin tác giả.");
        }
        const json = await res.json();
        if (json.success && json.data) {
          setAuthor(json.data.author);
          setStories(json.data.stories);
        }
      } catch (err: any) {
        console.error("Error fetching author details:", err);
        setErrorMsg(err.message || "Không thể tải hồ sơ tác giả.");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchAuthorProfile();
    }
  }, [id]);

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
    router.push(`/?search=${encodeURIComponent(query)}`);
  }

  function handleCategoryChange(category: string) {
    if (category && category !== "Tất cả") {
      router.push(`/?category=${encodeURIComponent(category)}`);
    } else {
      router.push("/");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header isLoggedIn={isLoggedIn} user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center py-20 text-purple-950 font-semibold">
          Đang tải thông tin tác giả...
        </main>
      </div>
    );
  }

  if (errorMsg || !author) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header isLoggedIn={isLoggedIn} user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center py-20 text-red-600 font-semibold">
          {errorMsg || "Không tìm thấy thông tin tác giả."}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="mb-6 flex gap-2 text-xs text-text-light font-medium">
          <span className="cursor-pointer hover:text-purple-700" onClick={() => router.push("/")}>Trang chủ</span>
          <span>/</span>
          <span className="text-purple-900 font-semibold">Hồ sơ tác giả</span>
        </div>

        {/* ── Author Profile Card ── */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-purple-500/10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Avatar */}
          <div className="relative w-28 h-28 shrink-0 overflow-hidden rounded-full border-2 border-purple-500/20 shadow">
            <img
              src={author.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
              alt={`Avatar của tác giả ${author.pen_name}`}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
              }}
            />
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col text-center md:text-left">
            <h1 className="text-2xl font-extrabold text-purple-950">
              {author.pen_name}
            </h1>
            
            <p className="mt-2 text-sm text-gray-500 max-w-2xl leading-relaxed">
              {author.bio || "Tác giả hiện tại chưa cập nhật tiểu sử giới thiệu."}
            </p>

            {/* Donation section */}
            <div className="mt-6 rounded-xl bg-purple-50/50 p-4 border border-purple-500/5 max-w-md self-center md:self-start w-full">
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-2 flex items-center justify-center md:justify-start gap-1">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ủng hộ tác giả (Donate)
              </h3>
              {author.donation_link ? (
                <p className="text-xs text-purple-900 break-all bg-white p-2 rounded border border-purple-100 font-medium">
                  {author.donation_link}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Tác giả chưa cấu hình liên kết ủng hộ/donate.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Stories Showcase Section ── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-purple-500/10">
          <div className="mb-6 flex items-center justify-between border-b border-border-light pb-4">
            <h2 className="text-base font-extrabold text-purple-950 uppercase tracking-wider">
              Tác phẩm đã đăng ({stories.length})
            </h2>
          </div>

          {stories.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-light italic">
              Tác giả chưa đăng tải bộ truyện nào trên hệ thống.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-purple-500/5 bg-white p-4 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-300"
                >
                  <div className="flex gap-4">
                    {/* Cover image */}
                    <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg border border-gray-100 shadow-sm">
                      {story.cover_image ? (
                        <img
                          src={story.cover_image}
                          alt={`Bìa truyện ${story.title}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-purple-950 group-hover:text-purple-700 truncate transition-colors leading-tight">
                          <Link href={`/stories/${story.slug}`}>
                            {story.title}
                          </Link>
                        </h3>
                        <p className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block font-semibold mt-1">
                          {story.status === "completed" ? "Đã hoàn" : "Đang ra"}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-2 leading-snug">
                          {story.description || "Chưa có mô tả."}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {story.categories.slice(0, 2).map((cat) => (
                          <span
                            key={cat.id}
                            className="text-[9px] font-semibold bg-gray-50 text-gray-600 border border-gray-100 px-1.5 py-0.2 rounded"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats inside Card */}
                  <div className="mt-4 border-t border-gray-50 pt-3 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                    <span className="flex items-center gap-0.5">
                      👁 {story.view_count}
                    </span>
                    <span className="flex items-center gap-0.5 text-star-yellow">
                      ★ {Number(story.rating).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-0.5 text-red-500">
                      ♥ {story.like_count}
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold hover:underline">
                      <Link href={`/stories/${story.slug}`}>Đọc ngay →</Link>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border-light bg-white mt-16">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Image src={logoImg} alt="Trạm Chữ Novel Logo" width={140} height={44} className="object-contain h-10 w-auto" />
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

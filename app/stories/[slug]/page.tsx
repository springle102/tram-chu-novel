"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logoImg from "@/app/logo.png";
import Header from "@/app/components/Header";
import dynamic from "next/dynamic";
const LoginModal = dynamic(() => import("@/app/components/LoginModal"), { ssr: false });
import type { User } from "@/app/types";

export const runtime = 'edge';

// ===========================
// SVG Icons (Magical Badges)
// ===========================
const BADGE_VERSION = 1; // 1: Magical Glow, 2: Rune Emblem

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  );
}

function CrownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

interface StoryDetail {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  description: string | null;
  status: string;
  viewCount: number;
  rating: number;
  chapterCount: number;
  likeCount: number;
  categories: { id: string; name: string }[];
  author_id: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    bio: string | null;
  };
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  view_count: number;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  chapterId: string | null;
  chapterNumber: number | null;
  chapterTitle: string | null;
  parentId?: string | null;
  authorId?: string;
  author_id?: string;
  commenter: {
    name: string;
    avatar: string | null;
    isAuthor: boolean;
  };
}

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  // ── Auth State ──
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ── Data States ──
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── User Interaction States ──
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // ── Reply States ──
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // ── Login Modal Control ──
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMsg, setLoginModalMsg] = useState("");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // ── Load Auth and Fetch Data on Mount/Slug Change ──
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    let currentUserToken = storedToken;

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
        setToken(storedToken);
      } catch (err) {
        console.error("Failed to parse user details from localStorage:", err);
      }
    }

    async function loadData() {
      setIsLoading(true);
      try {
        // 1. Fetch Story Detail
        const storyRes = await fetch(`${apiBaseUrl}/api/stories/${slug}`, { cache: "no-store" });
        if (!storyRes.ok) throw new Error("Story not found");
        const storyJson = await storyRes.json();
        
        if (storyJson.success && storyJson.data) {
          setStory(storyJson.data);

          // 2. Fetch Chapters
          const chaptersRes = await fetch(`${apiBaseUrl}/api/stories/${slug}/chapters`, { cache: "no-store" });
          if (chaptersRes.ok) {
            const chaptersJson = await chaptersRes.json();
            if (chaptersJson.success) setChapters(chaptersJson.data);
          }

          // 3. Fetch Comments
          const commentsRes = await fetch(`${apiBaseUrl}/api/stories/${slug}/comments?onlyStory=true`, { cache: "no-store" });
          if (commentsRes.ok) {
            const commentsJson = await commentsRes.json();
            if (commentsJson.success) setComments(commentsJson.data);
          }

          // 4. Fetch User Interactions (if logged in)
          if (currentUserToken) {
            const interactRes = await fetch(`${apiBaseUrl}/api/stories/${slug}/interact`, {
              headers: { Authorization: `Bearer ${currentUserToken}` },
              cache: "no-store",
            });
            if (interactRes.ok) {
              const interactJson = await interactRes.json();
              if (interactJson.success && interactJson.data) {
                setIsBookmarked(interactJson.data.bookmarked);
                setIsLiked(interactJson.data.liked || false);
                setUserRating(interactJson.data.ratingScore);
              }
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết truyện:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      loadData();
    }
  }, [slug]);

  // ── Header Actions ──
  function handleLogin() {
    router.push("/auth");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
    setToken(null);
    setIsBookmarked(false);
    setIsLiked(false);
    setUserRating(null);
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

  // ── Bookmark Action ──
  async function handleBookmarkToggle() {
    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để lưu truyện vào tủ sách cá nhân.");
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/stories/${slug}/bookmark`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setIsBookmarked(json.data.bookmarked);
        }
      }
    } catch (err) {
      console.error("Lỗi toggle bookmark:", err);
    }
  }

  // ── Like Action ──
  async function handleLikeToggle() {
    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để yêu thích bộ truyện này.");
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/stories/${slug}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setIsLiked(json.data.liked);
          if (story) {
            setStory({ ...story, likeCount: json.data.likeCount });
          }
        }
      }
    } catch (err) {
      console.error("Lỗi toggle like:", err);
    }
  }

  // ── Rating Action ──
  async function handleRatingSubmit(score: number) {
    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để đánh giá bộ truyện này.");
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/stories/${slug}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setUserRating(score);
          // Cập nhật điểm rating hiển thị trên UI
          if (story) {
            setStory({ ...story, rating: json.data.rating });
          }
        }
      }
    } catch (err) {
      console.error("Lỗi đánh giá truyện:", err);
    }
  }

  // ── Comment Submit Action ──
  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentInput.trim()) return;

    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để gửi bình luận truyện.");
      setIsLoginModalOpen(true);
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/stories/${slug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentInput }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setComments([json.data, ...comments]);
          setCommentInput("");
        }
      }
    } catch (err) {
      console.error("Lỗi gửi bình luận:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  // ── Reply Actions ──
  function handleReplyClick(commentId: string) {
    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để trả lời bình luận.");
      setIsLoginModalOpen(true);
      return;
    }
    setReplyingToId(commentId);
    setReplyInput("");
  }

  async function handleReplySubmit(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyInput.trim()) return;

    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để trả lời bình luận.");
      setIsLoginModalOpen(true);
      return;
    }

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/stories/${slug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: replyInput,
          parentId,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setComments([...comments, json.data]);
          setReplyInput("");
          setReplyingToId(null);
        }
      }
    } catch (err) {
      console.error("Lỗi gửi phản hồi:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  }

  // Phân tách bình luận cấp 1 và các phản hồi
  const topLevelComments = comments.filter((c) => !c.parentId);
  const getRepliesForComment = (parentId: string) => {
    return comments
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header isLoggedIn={isLoggedIn} user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center py-20 text-purple-950 font-semibold">
          Đang tải dữ liệu truyện...
        </main>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header isLoggedIn={isLoggedIn} user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center py-20 text-red-600 font-semibold">
          Không tìm thấy truyện hoặc truyện đã bị xóa.
        </main>
      </div>
    );
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
      />

      {/* ── Main Layout ── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <div className="mb-6 flex flex-wrap gap-2 text-xs text-text-light font-medium">
          <span className="cursor-pointer hover:text-purple-700" onClick={() => router.push("/")}>Trang chủ</span>
          <span>/</span>
          {story.categories.length > 0 && (
            <>
              <span 
                className="cursor-pointer hover:text-purple-700"
                onClick={() => router.push(`/?category=${encodeURIComponent(story.categories[0].name)}`)}
              >
                {story.categories[0].name}
              </span>
              <span>/</span>
            </>
          )}
          <span className="text-purple-900 font-semibold">{story.title}</span>
        </div>

        {/* ── Story Header Info Card ── */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-purple-500/10 flex flex-col md:flex-row gap-6">
          {/* Cover image left */}
          <div className="relative aspect-[2/3] w-full max-w-[180px] self-center md:self-start overflow-hidden rounded-xl shadow-md border border-gray-100 shrink-0">
            {story.coverImage ? (
              <img
                src={story.coverImage}
                alt={`Ảnh bìa ${story.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
            )}
            
            {/* Overlay status */}
            <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-white">
                {story.status === "completed" ? "Đã hoàn" : "Đang ra"}
              </span>
            </div>
          </div>

          {/* Details right */}
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-purple-950 leading-tight">
                {story.title}
              </h1>

              {/* Author */}
              <p className="mt-1 text-sm text-text-muted">
                Tác giả: <Link href={`/author/${story.author_id}`} className="font-semibold text-purple-800 hover:underline">{story.author.displayName}</Link>
              </p>

              {/* Badges / Categories */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {story.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 cursor-pointer"
                    onClick={() => handleCategoryChange(cat.name)}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>

              {/* Stats Section */}
              <div className="mt-4 grid grid-cols-4 gap-2 border-y border-border-light py-2 text-center">
                <div>
                  <p className="text-[10px] text-text-light uppercase tracking-wider">Đánh giá</p>
                  <p className="text-sm font-bold text-star-yellow mt-0.5 flex items-center justify-center gap-1">
                    ★ <span className="text-purple-950">{Number(story.rating).toFixed(1)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-light uppercase tracking-wider">Yêu thích</p>
                  <p className="text-sm font-bold text-red-500 mt-0.5 flex items-center justify-center gap-1">
                    ♥ <span className="text-purple-950">{story.likeCount || 0}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-light uppercase tracking-wider">Số chương</p>
                  <p className="text-sm font-bold text-purple-950 mt-0.5">{story.chapterCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-light uppercase tracking-wider">Lượt xem</p>
                  <p className="text-sm font-bold text-purple-950 mt-0.5">{Number(story.viewCount).toLocaleString("vi-VN")}</p>
                </div>
              </div>

              {/* Rating action area */}
              <div className="mt-4 flex items-center gap-2 bg-purple-50/50 p-2.5 rounded-xl border border-purple-500/5">
                <span className="text-xs font-semibold text-purple-950">Đánh giá của bạn:</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingSubmit(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      className="text-xl focus:outline-none transition-all duration-150 transform hover:scale-125 active:scale-110"
                      title={`Đánh giá ${star} sao`}
                    >
                      <span className={
                        (hoveredRating !== null ? hoveredRating >= star : (userRating && userRating >= star))
                          ? "text-yellow-400 drop-shadow-sm font-bold"
                          : "text-gray-300"
                      }>★</span>
                    </button>
                  ))}
                </div>
                {userRating && (
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/50 px-2 py-0.5 rounded-full ml-1">
                    Đã đánh giá {userRating}/5 ★
                  </span>
                )}
              </div>

              {/* Integrated Synopsis / Synopsis text directly here */}
              <div className="mt-4">
                <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
                  Tóm tắt nội dung
                </h3>
                <p className="text-xs md:text-sm text-text-body leading-relaxed whitespace-pre-line">
                  {story.description || "Chưa có tóm tắt chi tiết cho truyện này."}
                </p>
              </div>
            </div>

            {/* Action Buttons at bottom of card */}
            <div className="mt-6 flex flex-wrap gap-3">
              {chapters.length > 0 ? (
                <button
                  onClick={() => router.push(`/stories/${slug}/1`)}
                  className="rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity"
                >
                  Đọc từ đầu
                </button>
              ) : (
                <button
                  disabled
                  className="rounded-full bg-gray-300 px-6 py-2.5 text-xs font-bold text-white cursor-not-allowed"
                >
                  Chưa có chương
                </button>
              )}

              {/* Yêu thích (Like) Button */}
              <button
                onClick={handleLikeToggle}
                className={`rounded-full border px-6 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isLiked
                    ? "bg-red-50 border-red-200 text-red-600 shadow-sm hover:bg-red-100"
                    : "bg-white border-border-light text-text-heading hover:bg-red-50/50 hover:border-red-100"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.2 2.067 1.018 2.457 2.127.39 1.11.196 2.378-.52 3.238l-7.098 8.16a.75.75 0 01-1.127 0L4.208 8.687c-.716-.86-.91-2.128-.52-3.238.39-1.109 1.357-1.928 2.457-2.127 1.484-.269 3.018.156 4.105 1.14l.75.679.75-.68c1.087-.983 2.62-1.408 4.104-1.139z" />
                </svg>
                {isLiked ? `Đã thích (${story.likeCount})` : `Yêu thích (${story.likeCount})`}
              </button>

              {/* Lưu truyện (Bookmark) Button */}
              <button
                onClick={handleBookmarkToggle}
                className={`rounded-full border px-6 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isBookmarked
                    ? "bg-purple-900 border-purple-900 text-white shadow-sm hover:bg-purple-950"
                    : "bg-white border-border-light text-text-heading hover:bg-purple-50 hover:border-purple-200"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {isBookmarked ? "Đã lưu truyện" : "Lưu truyện"}
              </button>
            </div>
          </div>
        </section>

        {/* ── Chapters List Section ── */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-purple-500/10">
          <div className="mb-4 flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-base font-extrabold text-purple-950 uppercase tracking-wider">
              Danh Sách Chương
            </h2>
            <span className="text-xs text-text-light">{chapters.length} chương</span>
          </div>

          {chapters.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-light">
              Tác giả đang biên soạn nội dung, vui lòng quay lại sau!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => router.push(`/stories/${slug}/${ch.chapter_number}`)}
                  className="group flex items-center justify-between rounded-xl border border-transparent bg-gray-50 px-4 py-3 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-xs font-bold text-purple-950 group-hover:text-purple-700 truncate">
                      Chương {ch.chapter_number}: {ch.title}
                    </p>
                    <p className="text-[10px] text-text-light mt-0.5">
                      {ch.word_count} chữ — {Number(ch.view_count).toLocaleString("vi-VN")} lượt xem
                    </p>
                  </div>
                  
                  {/* Arrow Icon */}
                  <svg className="w-4 h-4 text-text-light group-hover:text-purple-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Comments Section ── */}
        <section id="comment-section" className="rounded-2xl bg-white p-6 shadow-sm border border-purple-500/10">
          <div className="mb-4 flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-base font-extrabold text-purple-950 uppercase tracking-wider">
              Bình Luận Độc Giả
            </h2>
            <span className="text-xs text-text-light">{comments.length} bình luận</span>
          </div>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Bạn nghĩ gì về bộ truyện này? Hãy chia sẻ ý kiến..."
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-border-light p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-text-light">
                {commentInput.length}/500 ký tự
              </span>
              <button
                type="submit"
                disabled={isSubmittingComment || !commentInput.trim()}
                className="rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-600 px-5 py-2 text-xs font-bold text-white shadow hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? "Đang gửi..." : "Gửi bình luận"}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {topLevelComments.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-light italic">
              Chưa có bình luận nào. Hãy trở thành người đầu tiên chia sẻ cảm nhận!
            </p>
          ) : (
            <div className="space-y-6">
              {topLevelComments.map((comment) => {
                const replies = getRepliesForComment(comment.id);
                return (
                  <div key={comment.id} className="border-b border-border-light/50 pb-6 last:border-b-0 last:pb-0 animate-in fade-in duration-300">
                    {/* Top Level Comment */}
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <img
                        src={comment.commenter.avatar || "/logo.png"}
                        alt={comment.commenter.name}
                        className={`w-9 h-9 rounded-full object-cover shrink-0 ${comment.commenter.isAuthor ? "border-2 border-purple-500" : "border border-gray-100"}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
                        }}
                      />

                      {/* Bubble */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xs font-bold ${comment.commenter.isAuthor ? "text-purple-800" : "text-text-heading"}`}>
                            {comment.commenter.name}
                          </span>
                          {((comment.authorId && story?.author_id && comment.authorId === story.author_id) || (comment.author_id && story?.author_id && comment.author_id === story.author_id)) ? (
                            BADGE_VERSION === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                                <SparklesIcon className="w-3 h-3 text-white animate-pulse" />
                                Tác giả
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-400/60 bg-amber-950/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest shadow-[0_0_8px_rgba(251,191,36,0.3)] backdrop-blur-sm">
                                <CrownIcon className="w-3 h-3 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
                                Tác giả
                              </span>
                            )
                          ) : comment.commenter.isAuthor && (
                            <span className="inline-block px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[8px] font-bold rounded">
                              Tác giả
                            </span>
                          )}
                          <span className="text-[10px] text-text-light">
                            {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-body whitespace-pre-wrap leading-relaxed">
                          {comment.content}
                        </p>
                        
                        {/* Action buttons (Reply button) */}
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => handleReplyClick(comment.id)}
                            className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition-colors"
                          >
                            Trả lời
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies List */}
                    {replies.length > 0 && (
                      <div className="mt-4 ml-9 pl-4 border-l-2 border-purple-100 space-y-4">
                        {replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3 animate-in fade-in duration-200">
                            <img
                              src={reply.commenter.avatar || "/logo.png"}
                              alt={reply.commenter.name}
                              className={`w-8 h-8 rounded-full object-cover shrink-0 ${reply.commenter.isAuthor ? "border-2 border-purple-500" : "border border-gray-100"}`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className={`text-xs font-bold ${reply.commenter.isAuthor ? "text-purple-800" : "text-text-heading"}`}>
                                  {reply.commenter.name}
                                </span>
                                {((reply.authorId && story?.author_id && reply.authorId === story.author_id) || (reply.author_id && story?.author_id && reply.author_id === story.author_id)) ? (
                                  BADGE_VERSION === 1 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                                      <SparklesIcon className="w-3 h-3 text-white animate-pulse" />
                                      Tác giả
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-400/60 bg-amber-950/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest shadow-[0_0_8px_rgba(251,191,36,0.3)] backdrop-blur-sm">
                                      <CrownIcon className="w-3 h-3 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
                                      Tác giả
                                    </span>
                                  )
                                ) : reply.commenter.isAuthor && (
                                  <span className="inline-block px-1 py-0.1 bg-purple-100 text-purple-700 text-[7px] font-bold rounded">
                                    Tác giả
                                  </span>
                                )}
                                <span className="text-[10px] text-text-light">
                                  {new Date(reply.createdAt).toLocaleDateString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-text-body whitespace-pre-wrap leading-relaxed">
                                {reply.content}
                              </p>
                              
                              {/* Action buttons (Reply button inside reply - redirects to parent comment) */}
                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  onClick={() => handleReplyClick(comment.id)}
                                  className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition-colors"
                                >
                                  Trả lời
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    {replyingToId === comment.id && (
                      <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-4 ml-9 pl-4 border-l-2 border-purple-200">
                        <textarea
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder={`Phản hồi bình luận của ${comment.commenter.name}...`}
                          rows={2}
                          maxLength={500}
                          className="w-full rounded-xl border border-border-light p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-text-light">
                            {replyInput.length}/500 ký tự
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToId(null);
                                setReplyInput("");
                              }}
                              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Huỷ
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingReply || !replyInput.trim()}
                              className="rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmittingReply ? "Đang gửi..." : "Gửi phản hồi"}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Login Modal Overlay ── */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        message={loginModalMsg}
      />

      {/* ── Footer ── */}
      <footer className="border-t border-border-light bg-white mt-12">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
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

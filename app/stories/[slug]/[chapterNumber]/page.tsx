"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface Story {
  id: string;
  title: string;
  slug: string;
  author_id?: string;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  view_count: number;
  created_at: string;
}

interface ChapterSummary {
  id: string;
  chapter_number: number;
  title: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  chapterId: string | null;
  parentId?: string | null;
  authorId?: string;
  author_id?: string;
  commenter: {
    name: string;
    avatar: string | null;
    isAuthor: boolean;
  };
}

export default function ChapterReadingPage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const chapterNumber = typeof params?.chapterNumber === "string" ? params.chapterNumber : "";
  const currentChNum = parseInt(chapterNumber, 10);

  // ── Auth State ──
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ── Data States ──
  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chaptersList, setChaptersList] = useState<ChapterSummary[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Reader Settings ──
  const [fontSize, setFontSize] = useState(18); // default size in px
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("light");

  // ── User Interaction States ──
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

  // ── Load Auth and Fetch Data on Mount/Params Change ──
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

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
        // 1. Fetch Current Chapter Details
        const res = await fetch(`${apiBaseUrl}/api/stories/${slug}/chapters/${chapterNumber}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Chapter not found");
        const json = await res.json();
        
        if (json.success && json.data) {
          setStory(json.data.story);
          setChapter(json.data.chapter);

          // 2. Fetch comments for this chapter
          const commentsRes = await fetch(
            `${apiBaseUrl}/api/stories/${slug}/comments?chapterNumber=${chapterNumber}`,
            { cache: "no-store" }
          );
          if (commentsRes.ok) {
            const commentsJson = await commentsRes.json();
            if (commentsJson.success) setComments(commentsJson.data);
          }
        }

        // 3. Fetch Chapters List for Navigation Linkages
        const listRes = await fetch(`${apiBaseUrl}/api/stories/${slug}/chapters`, { cache: "no-store" });
        if (listRes.ok) {
          const listJson = await listRes.json();
          if (listJson.success) setChaptersList(listJson.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải chương truyện:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug && chapterNumber) {
      loadData();
    }
  }, [slug, chapterNumber]);

  // ── Navigation Logic ──
  const currentIndex = chaptersList.findIndex((ch) => ch.chapter_number === currentChNum);
  const prevChapter = currentIndex > 0 ? chaptersList[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chaptersList.length - 1 ? chaptersList[currentIndex + 1] : null;

  function navigateToChapter(num: number) {
    setIsLoading(true);
    router.push(`/stories/${slug}/${num}`);
  }

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

  // ── Comment Action ──
  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentInput.trim() || !chapter) return;

    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để gửi bình luận chương truyện.");
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
        body: JSON.stringify({
          content: commentInput,
          chapterId: chapter.id,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setComments([json.data, ...comments]);
          setCommentInput("");
        }
      }
    } catch (err) {
      console.error("Lỗi gửi bình luận chương:", err);
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
    if (!replyInput.trim() || !chapter) return;

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
          chapterId: chapter.id,
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
          Đang tải nội dung chương...
        </main>
      </div>
    );
  }

  if (!story || !chapter) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header isLoggedIn={isLoggedIn} user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center py-20 text-red-600 font-semibold">
          Không tìm thấy chương truyện hoặc truyện không tồn tại.
        </main>
      </div>
    );
  }

  // Define theme classes
  const themeClasses = {
    light: "bg-white text-gray-900 border-gray-100",
    sepia: "bg-[#F7F2E8] text-[#5C3E21] border-[#EADFC9]",
    dark: "bg-[#1E1E2F] text-gray-200 border-gray-800",
  };

  const bodyBgClasses = {
    light: "bg-[#F3F4F6]",
    sepia: "bg-[#EFE8D8]",
    dark: "bg-[#12121E]",
  };

  const settingsBarClasses = {
    light: "bg-white/95 border-purple-500/10 text-gray-800",
    sepia: "bg-[#F7F2E8]/95 border-[#EADFC9] text-[#5C3E21]",
    dark: "bg-[#1E1E2F]/95 border-gray-800 text-gray-200",
  };

  const settingsButtonClasses = {
    light: "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
    sepia: "bg-[#F7F2E8] border-[#EADFC9] text-[#5C3E21] hover:bg-[#EADFC9]/50",
    dark: "bg-[#1E1E2F] border-gray-750 text-gray-300 hover:bg-gray-850",
  };

  const sizeLabelClasses = {
    light: "text-purple-950",
    sepia: "text-[#5C3E21]",
    dark: "text-white font-bold",
  };

  return (
    <div className={`flex min-h-screen flex-col ${bodyBgClasses[theme]} transition-colors duration-300`}>
      {/* ── Header ── */}
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
      />

      {/* ── Reading Content Area ── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        
        {/* Breadcrumbs */}
        <div className="mb-6 flex flex-wrap gap-2 text-xs text-text-muted font-medium">
          <span className="cursor-pointer hover:text-purple-700" onClick={() => router.push("/")}>Trang chủ</span>
          <span>/</span>
          <span className="cursor-pointer hover:text-purple-700" onClick={() => router.push(`/stories/${slug}`)}>{story.title}</span>
          <span>/</span>
          <span className="text-purple-900 font-semibold">Chương {chapter.chapter_number}</span>
        </div>

        {/* ── Reader Control Settings Bar ── */}
        <div className={`mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 rounded-xl p-3 shadow-sm border backdrop-blur-sm ${settingsBarClasses[theme]}`}>
          {/* Font Sizes */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold focus:outline-none transition-colors ${settingsButtonClasses[theme]}`}
            >
              A-
            </button>
            <span className={`text-xs px-2 font-bold ${sizeLabelClasses[theme]}`}>{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(30, fontSize + 2))}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold focus:outline-none transition-colors ${settingsButtonClasses[theme]}`}
            >
              A+
            </button>
          </div>

          {/* Color Themes */}
          <div className="flex gap-2">
            {(["light", "sepia", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all border ${
                  theme === t
                    ? "bg-purple-900 border-purple-900 text-white shadow-sm"
                    : `${settingsButtonClasses[theme]}`
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Reading Card ── */}
        <article className={`rounded-2xl p-6 md:p-10 shadow-sm border ${themeClasses[theme]} transition-colors duration-300`}>
          {/* Header */}
          <header className="mb-8 text-center border-b border-border-light/20 pb-6">
            <h2 className="text-sm font-semibold text-purple-600 uppercase tracking-widest cursor-pointer hover:underline" onClick={() => router.push(`/stories/${slug}`)}>
              {story.title}
            </h2>
            <h1 className="mt-3 text-xl md:text-2xl font-extrabold leading-tight">
              Chương {chapter.chapter_number}: {chapter.title}
            </h1>
            <p className="mt-3 text-[11px] opacity-75">
              {chapter.word_count} chữ — Cập nhật: {new Date(chapter.created_at).toLocaleDateString("vi-VN")}
            </p>
          </header>

          {/* Reading text body */}
          <div 
            style={{ fontSize: `${fontSize}px` }}
            className="leading-relaxed whitespace-pre-wrap font-sans text-justify"
          >
            {chapter.content}
          </div>

          {/* Bottom chapter navigation */}
          <div className="mt-12 flex items-center justify-between border-t border-border-light/20 pt-8">
            <button
              onClick={() => prevChapter && navigateToChapter(prevChapter.chapter_number)}
              disabled={!prevChapter}
              className="rounded-full border border-border-light bg-white/5 px-5 py-2.5 text-xs font-bold hover:bg-purple-50 hover:text-purple-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Chương trước
            </button>

            <button
              onClick={() => router.push(`/stories/${slug}`)}
              className="rounded-full border border-border-light bg-white/5 px-5 py-2.5 text-xs font-bold hover:bg-purple-50 hover:text-purple-900 transition-colors"
            >
              Mục lục
            </button>

            <button
              onClick={() => nextChapter && navigateToChapter(nextChapter.chapter_number)}
              disabled={!nextChapter}
              className="rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:opacity-95 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Chương sau →
            </button>
          </div>
        </article>

        {/* ── Comments Section (specifically for this chapter) ── */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-purple-500/10 text-gray-900">
          <div className="mb-4 flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-sm font-extrabold text-purple-950 uppercase tracking-wider">
              Bình Luận Chương {chapter.chapter_number}
            </h2>
            <span className="text-xs text-text-light">{comments.length} bình luận</span>
          </div>

          {/* Form */}
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Chia sẻ suy nghĩ của bạn về chương này với các độc giả khác..."
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-border-light p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-text-light">{commentInput.length}/500 ký tự</span>
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
            <p className="py-6 text-center text-xs text-text-light italic">
              Chương này chưa có bình luận nào. Hãy gửi ý kiến đầu tiên của bạn!
            </p>
          ) : (
            <div className="space-y-6">
              {topLevelComments.map((comment) => {
                const replies = getRepliesForComment(comment.id);
                return (
                  <div key={comment.id} className="border-b border-border-light/50 pb-6 last:border-b-0 last:pb-0 animate-in fade-in duration-300">
                    {/* Top Level Comment */}
                    <div className="flex gap-3">
                      <img
                        src={comment.commenter.avatar || "/logo.png"}
                        alt={comment.commenter.name}
                        className={`w-8 h-8 rounded-full object-cover shrink-0 ${comment.commenter.isAuthor ? "border-2 border-purple-500" : "border border-gray-100"}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
                        }}
                      />
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
                            <span className="inline-block px-1 bg-purple-100 text-purple-700 text-[7px] font-bold rounded">
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
                      <div className="mt-4 ml-8 pl-4 border-l-2 border-purple-100 space-y-4">
                        {replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3 animate-in fade-in duration-200">
                            <img
                              src={reply.commenter.avatar || "/logo.png"}
                              alt={reply.commenter.name}
                              className={`w-7 h-7 rounded-full object-cover shrink-0 ${reply.commenter.isAuthor ? "border-2 border-purple-500" : "border border-gray-100"}`}
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
                                  <span className="inline-block px-1 bg-purple-100 text-purple-700 text-[7px] font-bold rounded">
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
                      <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-4 ml-8 pl-4 border-l-2 border-purple-200">
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

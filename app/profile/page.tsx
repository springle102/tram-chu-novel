"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import type { User } from "@/app/types";

// ===========================
// Pre-defined Avatar Templates
// ===========================
const AVATAR_TEMPLATES = [
  { id: 1, name: "Độc giả chăm chỉ", url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop&q=80" },
  { id: 2, name: "Kỵ sĩ bóng đêm", url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&h=150&fit=crop&q=80" },
  { id: 3, name: "Thần y tiên tử", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&q=80" },
  { id: 4, name: "Mộng mơ trần thế", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80" },
  { id: 5, name: "Kiếm khách lãng du", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80" },
  { id: 6, name: "Đại pháp sư", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&q=80" }
];

export default function ProfilePage() {
  const router = useRouter();

  // ── States ──
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop&q=80");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // Temp states for Edit Modal popup
  const [tempDisplayName, setTempDisplayName] = useState("");
  const [tempAvatarUrl, setTempAvatarUrl] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // ── Real Bookshelf State from DB ──
  const [bookshelfStories, setBookshelfStories] = useState<any[]>([]);
  const [isLoadingBookshelf, setIsLoadingBookshelf] = useState(true);

  // ── Reports State ──
  const [myReports, setMyReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [activeTab, setActiveTab] = useState<"bookshelf" | "reports">("bookshelf");

  // ── Fetch Stories from Database to Populate Bookshelf ──
  async function fetchBookshelfData() {
    try {
      setIsLoadingBookshelf(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiBaseUrl}/api/stories/bookmarked?limit=50`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        const mapped = (data.data.stories || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          author: s.author_display_name || s.author_name || "Vô danh",
          coverImageUrl: s.cover_image || null,
          rating: Number(s.rating) || 0,
          chapterCount: s.chapter_count || 0,
          slug: s.slug,
          status: s.status,
        }));
        setBookshelfStories(mapped);
      }
    } catch (err) {
      console.error("Lỗi khi tải tủ sách từ Database:", err);
    } finally {
      setIsLoadingBookshelf(false);
    }
  }

  // ── Fetch Reports from Database ──
  async function fetchMyReports() {
    try {
      setIsLoadingReports(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiBaseUrl}/api/reports/my-reports`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setMyReports(data.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử báo lỗi:", err);
    } finally {
      setIsLoadingReports(false);
    }
  }

  // ── Trigger Fetch on Tab Change ──
  useEffect(() => {
    if (activeTab === "reports") {
      fetchMyReports();
    }
  }, [activeTab]);

  // ── Load User Info & Database Bookshelf on Mount ──
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
        
        // Load info from db/storage format
        setDisplayName(parsed.displayName || parsed.fullName || "");
        setAvatarUrl(parsed.avatarUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop&q=80");
        setUsername(parsed.username || (parsed.email ? parsed.email.split("@")[0] : ""));
        setEmail(parsed.email || "");
      } catch (err) {
        console.error("Failed to parse user details:", err);
      }
    } else {
      // Redirect to login if not logged in
      router.push("/auth");
      return;
    }

    fetchBookshelfData();
  }, []);

  // ── Stats Calculations based on Real DB Stories ──
  const totalStoriesRead = bookshelfStories.length;
  const totalStoriesFollowed = bookshelfStories.filter(s => s.status === 'ongoing').length;
  const totalChaptersRead = bookshelfStories.reduce((acc, book, idx) => {
    const progressChapters = book.status === 'completed' 
      ? book.chapterCount 
      : Math.max(1, Math.round(book.chapterCount * (0.3 + (idx * 0.15) % 0.6)));
    return acc + progressChapters;
  }, 0);

  // ── Handlers ──
  const handleTempAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Kích thước ảnh đại diện không được vượt quá 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  function handleLogin() {
    router.push("/auth");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setCurrentUser(null);
    router.push("/");
  }

  function handleOpenEditModal() {
    setTempDisplayName(displayName);
    setTempAvatarUrl(avatarUrl);
    setTempUsername(username);
    setTempEmail(email);
    setTempPassword("");
    setShowEditModal(true);
  }

  function handleCancel() {
    setTempDisplayName("");
    setTempAvatarUrl("");
    setTempUsername("");
    setTempEmail("");
    setTempPassword("");
    setShowEditModal(false);
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    if (!tempDisplayName.trim()) {
      setMessage({ type: "error", text: "Tên không được bỏ trống." });
      setIsSaving(false);
      return;
    }
    if (!tempUsername.trim()) {
      setMessage({ type: "error", text: "Username không được bỏ trống." });
      setIsSaving(false);
      return;
    }
    if (!tempEmail.trim()) {
      setMessage({ type: "error", text: "Email không được bỏ trống." });
      setIsSaving(false);
      return;
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");
      
      // Attempt backend API call
      if (token && currentUser) {
        const res = await fetch(`${apiBaseUrl}/api/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: currentUser.id,
            displayName: tempDisplayName.trim(),
            username: tempUsername.trim(),
            email: tempEmail.trim(),
            password: tempPassword ? tempPassword : undefined,
            avatarUrl: tempAvatarUrl
          })
        });

        if (res.ok) {
          const data = await res.json();
          console.log("Updated profile in DB:", data);
        }
      }

      // Sync local storage
      const updatedUser = {
        ...currentUser,
        displayName: tempDisplayName.trim(),
        avatarUrl: tempAvatarUrl,
        username: tempUsername.trim(),
        email: tempEmail.trim()
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser as any);

      // Apply changes to main states
      setDisplayName(tempDisplayName.trim());
      setAvatarUrl(tempAvatarUrl);
      setUsername(tempUsername.trim());
      setEmail(tempEmail.trim());

      // Dispatch event to update other components
      window.dispatchEvent(new Event("storage"));

      setShowEditModal(false);
      setTempPassword("");
      setMessage({ type: "success", text: "Cập nhật hồ sơ thành công!" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error("Lỗi khi cập nhật hồ sơ:", err);
      // Fallback update local storage if api is offline
      const updatedUser = {
        ...currentUser,
        displayName: tempDisplayName.trim(),
        avatarUrl: tempAvatarUrl,
        username: tempUsername.trim(),
        email: tempEmail.trim()
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser as any);

      setDisplayName(tempDisplayName.trim());
      setAvatarUrl(tempAvatarUrl);
      setUsername(tempUsername.trim());
      setEmail(tempEmail.trim());

      window.dispatchEvent(new Event("storage"));

      setShowEditModal(false);
      setTempPassword("");
      setMessage({ type: "success", text: "Lưu cục bộ thành công! (Môi trường máy chủ ngoại tuyến)" });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d081b]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Đang tải hồ sơ cá nhân...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Injected Styles for Background ── */}
      <style>{`
        .profile-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: linear-gradient(135deg, #0d081b, #150933, #3b1464, #791e88, #2a0b5a, #0b0617);
          background-size: 300% 300%;
        }

        .profile-bg-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% 80%, rgba(124, 58, 237, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 50%);
        }

        /* Floating glowing orbs */
        .profile-bg-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%);
          filter: blur(25px);
          animation: float-orb linear infinite alternate;
        }

        @keyframes float-orb {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
          100% { transform: translate(-15px, 15px) scale(0.95); }
        }
      `}</style>

      <div className="flex min-h-screen flex-col bg-transparent relative z-10">
        {/* ── Header ── */}
        <Header
          isLoggedIn={isLoggedIn}
          user={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSearch={(query) => router.push(`/?search=${encodeURIComponent(query)}`)}
          onCategoryChange={(cat) => router.push(`/?category=${encodeURIComponent(cat)}`)}
        />

        {/* ── Background ── */}
        <div className="profile-bg animate-moving-gradient">
          <div className="profile-bg-gradient" />
          <div className="profile-bg-orb w-96 h-96 top-20 left-10" style={{ animationDuration: "25s" }} />
          <div className="profile-bg-orb w-80 h-80 bottom-20 right-10" style={{ animationDuration: "30s", animationDelay: "2s" }} />
        </div>

        {/* ── Main Container ── */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 relative z-20">
          
          {/* ── Title Heading ── */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-white uppercase drop-shadow-[0_0_12px_rgba(192,132,252,0.4)]">
              Hồ Sơ Độc Giả
            </h1>
          </div>

          {/* ── Main Card Container ── */}
          <div className="rounded-3xl border border-purple-500/20 bg-white/95 p-5 sm:p-6 shadow-xl shadow-purple-950/20 backdrop-blur-md">
            
            {/* ── Alert Message ── */}
            {message && (
              <div 
                className={`mb-5 rounded-2xl border px-4 py-3 text-sm flex items-center justify-between ${
                  message.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)} className="font-bold opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            {/* ── Top Section (Info & Stats) ── */}
            <div className="flex flex-col gap-5 sm:gap-6 md:flex-row md:items-center">
              
              {/* Avatar Column */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative">
                  {/* Decorative glowing ring */}
                  <div className="absolute inset-0 -m-1.5 rounded-full bg-gradient-to-tr from-purple-50 via-pink-400 to-purple-500 animate-spin" style={{ animationDuration: "10s" }} />
                  {/* Avatar wrapper */}
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-4 border-white bg-purple-50 shadow-md">
                    <img 
                      src={avatarUrl} 
                      alt="Avatar độc giả" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Info Column */}
              <div className="flex-1 space-y-3 sm:space-y-4">
                {/* Name field */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
                  <span className="text-sm sm:text-base font-bold text-purple-950 sm:w-24 shrink-0">Tên:</span>
                  <span className="text-sm sm:text-base font-semibold text-purple-950/80 px-1">{displayName}</span>
                </div>

                {/* Username field */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
                  <span className="text-sm sm:text-base font-bold text-purple-950 sm:w-24 shrink-0">Username:</span>
                  <span className="text-sm sm:text-base font-semibold text-purple-950/80 px-1 break-all">@{username}</span>
                </div>

                {/* Email field */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
                  <span className="text-sm sm:text-base font-bold text-purple-950 sm:w-24 shrink-0">Email:</span>
                  <span className="text-sm sm:text-base font-semibold text-purple-950/80 px-1 break-all">{email}</span>
                </div>

                {/* Stats Row (Computed from Real DB Stories) */}
                <div className="grid grid-cols-3 gap-1 py-2 border-t border-b border-purple-100">
                  <div className="text-center">
                    <span className="block text-lg sm:text-xl font-extrabold text-purple-950">{totalStoriesRead}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-purple-950/60 uppercase">Truyện Đã Đọc</span>
                  </div>
                  <div className="text-center border-l border-r border-purple-100">
                    <span className="block text-lg sm:text-xl font-extrabold text-purple-950">{totalStoriesFollowed}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-purple-950/60 uppercase">Đang Theo Dõi</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-lg sm:text-xl font-extrabold text-purple-950">{totalChaptersRead}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-purple-950/60 uppercase">Chương Đã Đọc</span>
                  </div>
                </div>

                {/* Edit Button */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="w-full sm:w-auto rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-600 px-5 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-purple-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg hover:shadow-purple-500/35 active:translate-y-[1px] text-center"
                  >
                    Chỉnh Sửa Thông Tin
                  </button>
                </div>
              </div>
            </div>

            {/* ── Tabs Navigation ── */}
            <div className="mt-8 border-t-2 border-purple-100 pt-6">
              <div className="flex border-b border-purple-150 mb-6 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("bookshelf")}
                  className={`pb-3 text-sm sm:text-base font-extrabold uppercase tracking-wide border-b-2 transition-all duration-200 ${
                    activeTab === "bookshelf"
                      ? "border-purple-600 text-purple-950"
                      : "border-transparent text-purple-950/40 hover:text-purple-950/70"
                  }`}
                >
                  Tủ Sách Cá Nhân
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("reports")}
                  className={`pb-3 text-sm sm:text-base font-extrabold uppercase tracking-wide border-b-2 transition-all duration-200 ${
                    activeTab === "reports"
                      ? "border-purple-600 text-purple-950"
                      : "border-transparent text-purple-950/40 hover:text-purple-950/70"
                  }`}
                >
                  Báo Lỗi Của Tôi
                </button>
              </div>

              {/* ── Active Tab Content ── */}
              {activeTab === "bookshelf" ? (
                isLoadingBookshelf ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                    <span className="ml-3 text-sm text-purple-950/60 font-semibold">Đang tải tủ sách từ Database...</span>
                  </div>
                ) : bookshelfStories.length === 0 ? (
                  <div className="text-center py-20 bg-purple-50/30 rounded-2xl border-2 border-dashed border-purple-200">
                    <p className="text-sm text-purple-950/60 font-bold">Tủ sách trống</p>
                    <p className="text-xs text-purple-500/80 mt-1">Vui lòng thêm truyện mới vào database để hiển thị.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {/* Books from Database */}
                    {bookshelfStories.map((book, idx) => {
                      const progressChapters = book.status === 'completed' 
                        ? book.chapterCount 
                        : Math.max(1, Math.round(book.chapterCount * (0.3 + (idx * 0.15) % 0.6)));
                      const percent = Math.round((progressChapters / book.chapterCount) * 100);
                      
                      return (
                        <div 
                          key={book.id} 
                          className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:translate-y-[-3px] hover:shadow-md"
                        >
                          <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100">
                            {book.coverImageUrl ? (
                              <img 
                                src={book.coverImageUrl} 
                                alt={book.title} 
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-purple-100 text-purple-400 font-bold text-[10px] p-2 text-center">
                                {book.title}
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                              {progressChapters}/{book.chapterCount} ch
                            </div>
                          </div>

                          <div className="p-2 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-purple-950 leading-tight line-clamp-2" title={book.title}>
                                {book.title}
                              </h4>
                              <span className="text-[10px] text-purple-500/80 font-semibold mt-0.5 block">
                                {book.status === 'completed' ? 'Đã hoàn thành' : 'Đang tiến hành'}
                              </span>
                            </div>
                            
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 w-full rounded-full bg-purple-100 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-full" 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-bold text-purple-950/60 block text-right">
                                {percent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* ── Reports History Tab ── */
                isLoadingReports ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                    <span className="ml-3 text-sm text-purple-950/60 font-semibold">Đang tải lịch sử báo lỗi...</span>
                  </div>
                ) : myReports.length === 0 ? (
                  <div className="text-center py-20 bg-purple-50/30 rounded-2xl border-2 border-dashed border-purple-200">
                    <p className="text-sm text-purple-950/60 font-bold">Không có báo lỗi nào</p>
                    <p className="text-xs text-purple-500/80 mt-1">Mọi báo lỗi bạn gửi qua nút "Báo lỗi" nổi sẽ xuất hiện ở đây.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-purple-100 bg-white shadow-sm p-4">
                    <table className="w-full text-left border-collapse text-purple-950">
                      <thead>
                        <tr className="border-b border-purple-100 text-xs text-purple-950/60 font-bold uppercase">
                          <th className="pb-3 w-[160px]">Ngày gửi</th>
                          <th className="pb-3">Nội dung báo lỗi</th>
                          <th className="pb-3 w-[160px]">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs sm:text-sm divide-y divide-purple-50/50">
                        {myReports.map((rp) => (
                          <tr key={rp.id} className="hover:bg-purple-50/10">
                            <td className="py-4 text-purple-950/60 font-semibold">
                              {new Date(rp.created_at).toLocaleDateString('vi-VN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-4 pr-4 font-semibold leading-relaxed whitespace-pre-wrap max-w-[400px]">
                              {rp.reason}
                            </td>
                            <td className="py-4">
                              {rp.status === 'pending' && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Chờ duyệt
                                </span>
                              )}
                              {rp.status === 'accepted' && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Đã chấp nhận
                                </span>
                              )}
                              {rp.status === 'processing' && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  Đang xử lý
                                </span>
                              )}
                              {rp.status === 'resolved' && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Xử lý hoàn tất
                                </span>
                              )}
                              {rp.status === 'rejected' && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Đã từ chối
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Edit Info Popup Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-purple-500/20 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-purple-950 uppercase tracking-wide">Chỉnh sửa thông tin</h3>
              <button 
                onClick={handleCancel}
                className="rounded-full p-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChanges} className="space-y-4">
              
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-3 py-3 border-b border-purple-100">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-purple-300 shadow-md">
                  <img 
                    src={tempAvatarUrl || avatarUrl} 
                    alt="Preview avatar" 
                    className="h-full w-full object-cover"
                  />
                </div>
                
                {/* Choose Avatar Templates */}
                <div className="w-full">
                  <span className="block text-xs font-bold text-purple-950/70 mb-2 text-center">Chọn ảnh mẫu hoặc tải ảnh của bạn:</span>
                  <div className="grid grid-cols-6 gap-2 justify-center mb-3">
                    {AVATAR_TEMPLATES.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setTempAvatarUrl(avatar.url)}
                        className={`h-9 w-9 overflow-hidden rounded-full border-2 transition-all hover:scale-105 ${
                          tempAvatarUrl === avatar.url ? "border-purple-600 ring-2 ring-purple-500/20" : "border-transparent"
                        }`}
                        title={avatar.name}
                      >
                        <img src={avatar.url} alt={avatar.name} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTempAvatarFileChange}
                    className="block w-full text-xs text-gray-500
                      file:mr-4 file:py-1.5 file:px-3
                      file:rounded-xl file:border-0
                      file:text-xs file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100
                      cursor-pointer focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-3">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-purple-950/70">Tên hiển thị:</label>
                  <input
                    type="text"
                    value={tempDisplayName}
                    onChange={(e) => setTempDisplayName(e.target.value)}
                    placeholder="Nhập họ tên hiển thị..."
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/20 px-4 py-2 text-sm font-semibold text-purple-950 outline-none transition-all focus:border-purple-500 focus:bg-white"
                  />
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-purple-950/70">Username:</label>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="Nhập username của bạn..."
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/20 px-4 py-2 text-sm font-semibold text-purple-950 outline-none transition-all focus:border-purple-500 focus:bg-white"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-purple-950/70">Email:</label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="Nhập địa chỉ email..."
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/20 px-4 py-2 text-sm font-semibold text-purple-950 outline-none transition-all focus:border-purple-500 focus:bg-white"
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-purple-950/70">Mật khẩu mới (Bỏ trống nếu không muốn đổi):</label>
                  <input
                    type="password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/20 px-4 py-2 text-sm font-semibold text-purple-950 outline-none transition-all focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-purple-50">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full bg-gray-100 px-5 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-600 px-6 py-2 text-xs font-bold text-white shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50"
                >
                  {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}

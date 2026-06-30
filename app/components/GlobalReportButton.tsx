"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import LoginModal from "./LoginModal";

export default function GlobalReportButton() {
  const pathname = usePathname();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Hide on admin and auth routes
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/auth")) {
    return null;
  }

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleCloseModal = () => {
    setIsReportModalOpen(false);
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMsg, setLoginModalMsg] = useState("");
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  // Tooltip state for floating reminder window
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setIsLoggedIn(true);
      setToken(storedToken);
    }

    // Check if user has already dismissed the tooltip
    const isDismissed = localStorage.getItem("report_tooltip_dismissed");
    if (!isDismissed) {
      setShowTooltip(true);
    }
  }, []);

  const handleDismissTooltip = () => {
    localStorage.setItem("report_tooltip_dismissed", "true");
    setShowTooltip(false);
  };

  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
    if (showTooltip) {
      handleDismissTooltip();
    }
  };

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reportReason.trim()) return;

    if (!isLoggedIn || !token) {
      setLoginModalMsg("Bạn cần đăng nhập để gửi báo lỗi.");
      setIsReportModalOpen(false);
      setIsLoginModalOpen(true);
      return;
    }

    setIsSubmittingReport(true);
    try {
      // Determine context based on URL
      let contextInfo = "Lỗi chung hệ thống";
      let storyIdStr = null;

      if (pathname?.includes("/stories/")) {
        const parts = pathname.split("/");
        // /stories/[slug]/[chapterNumber]
        if (parts.length >= 4) {
          contextInfo = `Lỗi tại Truyện: ${parts[2]}, Chương: ${parts[3]}`;
        } else if (parts.length === 3) {
          contextInfo = `Lỗi tại Truyện: ${parts[2]}`;
        }
      }

      const finalReason = `[${contextInfo}] ${reportReason}`;

      const res = await fetch(`${apiBaseUrl}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storyId: null, // Since we don't fetch story ID globally, we just send context in reason
          reason: finalReason,
        }),
      });

      if (res.ok) {
        alert("Báo lỗi của bạn đã được gửi thành công. Cảm ơn bạn đã đóng góp!");
        setReportReason("");
        setIsReportModalOpen(false);
      } else {
        const json = await res.json();
        alert(json.error || "Có lỗi xảy ra khi gửi báo lỗi.");
      }
    } catch (err) {
      console.error("Lỗi gửi báo lỗi:", err);
      alert("Có lỗi xảy ra khi gửi báo lỗi.");
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <>
      {/* ── Login Modal Overlay ── */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        message={loginModalMsg}
      />

      {/* ── Report Modal Overlay ── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Báo lỗi hệ thống
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Vui lòng mô tả chi tiết lỗi bạn gặp phải. Nếu báo lỗi liên quan đến truyện, vui lòng ghi rõ tên truyện và số chương. Báo cáo sẽ được gửi cho Quản trị viên xử lý.
            </p>
            <form onSubmit={handleReportSubmit}>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Mô tả lỗi (VD: sai chính tả, lặp chương, nội dung không phù hợp...)"
                rows={4}
                required
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-50 text-gray-900"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full px-5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportReason.trim()}
                  className="rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReport ? "Đang gửi..." : "Gửi báo lỗi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tooltip Reminder Window ── */}
      {showTooltip && (
        <div className="fixed bottom-20 right-6 z-40 max-w-[260px] bg-white rounded-2xl border border-red-100 p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Close button */}
          <button
            onClick={handleDismissTooltip}
            className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-650 transition-colors focus:outline-none"
            aria-label="Đóng"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Content */}
          <div className="flex gap-2.5 items-start pr-4">
            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500 mt-0.5">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-gray-800">Bạn gặp sự cố?</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-normal">
                Nếu phát hiện lỗi chương, lỗi dịch hoặc lỗi hệ thống, hãy nhấn vào đây để báo cáo nhé!
              </p>
            </div>
          </div>
          
          {/* Arrow pointing down */}
          <div className="absolute bottom-[-6px] right-5 w-3 h-3 bg-white border-r border-b border-red-100 rotate-45"></div>
        </div>
      )}

      {/* ── Floating Report Button ── */}
      <button
        onClick={handleOpenReportModal}
        title="Báo lỗi hệ thống"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-700 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>
    </>
  );
}

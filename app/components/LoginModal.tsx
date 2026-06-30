"use client";

import { useRouter } from "next/navigation";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function LoginModal({ isOpen, onClose, message }: LoginModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-purple-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sparkle Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-center text-lg font-bold text-purple-950">
          Yêu Cầu Đăng Nhập
        </h3>

        {/* Message */}
        <p className="mt-2 text-center text-sm text-text-body leading-relaxed">
          {message || "Bạn cần đăng nhập tài khoản Độc giả để thực hiện chức năng này."}
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              onClose();
              router.push("/auth");
            }}
            className="w-full rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-600 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-95 transition-opacity"
          >
            Đăng nhập ngay
          </button>
          
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-border-light bg-white py-2.5 text-sm font-semibold text-text-muted hover:bg-gray-50 transition-colors"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

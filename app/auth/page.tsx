"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logoImg from "@/app/logo.png";

// ===========================
// Types
// ===========================

interface FormErrors {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

// ===========================
// SVG Icons — Sleek Theme
// ===========================

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ChevronDoubleRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  );
}

// ===========================
// Particle/Star Background (Vibrant & Active)
// ===========================

function MagicalBackground() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: string;
    top: string;
    size: number;
    delay: string;
    duration: string;
    opacity: number;
    type: number;
  }>>([]);
  const [floatingOrbs, setFloatingOrbs] = useState<Array<{
    id: number;
    left: string;
    top: string;
    size: number;
    delay: string;
    duration: string;
  }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 70 }, (_, i) => {
        const type = i % 3; // 0: fast, 1: medium, 2: slow
        let duration = '';
        if (type === 0) {
          duration = `${Math.random() * 1.5 + 2.5}s`; // 2.5s - 4s (Active movement)
        } else if (type === 1) {
          duration = `${Math.random() * 2 + 4.5}s`; // 4.5s - 6.5s
        } else {
          duration = `${Math.random() * 3 + 7}s`; // 7s - 10s
        }
        return {
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          size: Math.random() * 3.5 + 1.5,
          delay: `${Math.random() * 4}s`,
          duration,
          opacity: Math.random() * 0.75 + 0.25,
          type,
        };
      })
    );
    setFloatingOrbs(
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 90}%`,
        top: `${Math.random() * 90}%`,
        size: Math.random() * 150 + 150, // Larger glowing blobs (150px - 300px)
        delay: `${Math.random() * 4}s`,
        duration: `${Math.random() * 8 + 8}s`, // Active dynamic floating (8s - 16s)
      }))
    );
  }, []);

  return (
    <div className="auth-bg">
      {/* Base gradient overlays */}
      <div className="auth-bg-gradient" />

      {/* Floating orbs */}
      {floatingOrbs.map((orb) => (
        <div
          key={`orb-${orb.id}`}
          className="auth-bg-orb"
          style={{
            left: orb.left,
            top: orb.top,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            animationDelay: orb.delay,
            animationDuration: orb.duration,
          }}
        />
      ))}

      {/* Star particles with active drift animations */}
      {particles.map((p) => {
        const speedClass =
          p.type === 0
            ? "animate-drift-fast-active"
            : p.type === 1
              ? "animate-drift-medium-active"
              : "animate-drift-slow-active";
        return (
          <div
            key={`star-${p.id}`}
            className={`absolute rounded-full bg-purple-100 ${speedClass}`}
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: p.opacity,
            }}
          />
        );
      })}
    </div>
  );
}

// ===========================
// Main AuthPage Component
// ===========================

export default function AuthPage() {
  const router = useRouter();

  // ── States ──
  // view: 'login' | 'register_reader' | 'register_author'
  const [view, setView] = useState<"login" | "register_reader" | "register_author">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [registerAuthorSuccess, setRegisterAuthorSuccess] = useState(false);

  // ── Form Data ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Represent name for readers, and pen name (bút danh) for authors
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Clear Form Data
  function clearForm() {
    setEmail("");
    setPassword("");
    setFullName("");
    setUsername("");
    setConfirmPassword("");
    setErrors({});
    setSuccessMessage("");
    setRegisterAuthorSuccess(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  // ── Validation ──
  function validateLogin(): boolean {
    const newErrors: FormErrors = {};

    const emailVal = email.trim();
    if (!emailVal) {
      newErrors.email = "Vui lòng nhập email hoặc username.";
    } else if (emailVal.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      newErrors.email = "Email không hợp lệ.";
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateRegister(isAuthor: boolean): boolean {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = isAuthor ? "Vui lòng nhập bút danh." : "Vui lòng nhập họ và tên.";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = isAuthor ? "Bút danh phải có ít nhất 2 ký tự." : "Họ tên phải có ít nhất 2 ký tự.";
    }

    if (!isAuthor) {
      if (!username.trim()) {
        newErrors.username = "Vui lòng nhập username.";
      } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
        newErrors.username = "Username chỉ chứa chữ cái, số, dấu gạch dưới và dài từ 3-30 ký tự.";
      }
    }

    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email không hợp lệ.";
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit Handlers ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage("");

    if (!validateLogin()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // Readers login via general auth endpoint with role: 'reader'
      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "reader" }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errMsg = "Đăng nhập thất bại.";
        if (data.errors && Array.isArray(data.errors)) {
          errMsg = data.errors.join(" ");
        } else if (data.error) {
          errMsg = data.error;
        }

        // Tự động điều hướng nếu sai vai trò (Tác giả/Admin đăng nhập nhầm vào trang Độc giả)
        if (data.roleMismatch && (data.correctRole === "author" || data.correctRole === "admin")) {
          setErrors({ general: `${errMsg} Hệ thống sẽ tự động chuyển hướng bạn đến trang đăng nhập quản trị sau 3 giây.` });
          setTimeout(() => {
            router.push("/admin/login");
          }, 3000);
          return;
        }

        setErrors({ general: errMsg });
        return;
      }

      const userPayload = {
        id: data.data.user.id,
        displayName: data.data.user.displayName || data.data.user.fullName,
        fullName: data.data.user.displayName || data.data.user.fullName,
        avatarUrl: data.data.user.avatarUrl,
        email: data.data.user.email,
        username: data.data.user.username,
        role: data.data.user.role,
      };

      // Save user details & token
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(userPayload));

      if (data.data.user.role === 'author') {
        localStorage.setItem("admin_token", data.data.token);
        localStorage.setItem("admin_user", JSON.stringify(userPayload));
      }

      // Dispatch a storage event so layout components can sync
      window.dispatchEvent(new Event("storage"));

      router.push("/");
      console.log("Reader login success:", data);
    } catch (err) {
      console.error("Connection error during login:", err);
      setErrors({ general: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage("");
    const isAuthor = view === "register_author";

    if (!validateRegister(isAuthor)) return;

    setIsLoading(true);
    setErrors({});

    const role = isAuthor ? "author" : "reader";

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role, username }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errMsg = "Đăng ký thất bại.";
        if (data.errors && Array.isArray(data.errors)) {
          errMsg = data.errors.join(" ");
        } else if (data.error) {
          errMsg = data.error;
        }
        setErrors({ general: errMsg });
        return;
      }

      // Success flows
      if (isAuthor) {
        setRegisterAuthorSuccess(true);
      } else {
        setSuccessMessage("Đăng ký tài khoản Độc giả thành công! Vui lòng đăng nhập.");
        setView("login");
        // Clear fields
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFullName("");
        setUsername("");
      }
    } catch (err) {
      console.error("Connection error during registration:", err);
      setErrors({ general: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* ── Injected Styles for High Dynamic Fluid Background & Dark Glassmorphism ── */}
      <style>{`
        /* ========== VIBRANT MAGICAL BACKGROUND ========== */
        .auth-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: linear-gradient(-45deg, #070312, #160731, #3e0b61, #6b148c, #13042d, #06020c);
          background-size: 400% 400%;
          animation: moving-gradient-active 10s ease infinite alternate;
        }

        @keyframes moving-gradient-active {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 50% 100%; }
        }

        .auth-bg-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 15% 85%, rgba(168, 85, 247, 0.22) 0%, transparent 55%),
            radial-gradient(circle at 85% 15%, rgba(236, 72, 153, 0.18) 0%, transparent 55%),
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.12) 0%, transparent 65%);
        }

        /* Large Active Glowing Orbs */
        .auth-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.75;
          animation: float-orb-active linear infinite alternate;
        }

        .auth-bg-orb:nth-child(2n) {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.32) 0%, rgba(139, 92, 246, 0.05) 60%, transparent 100%);
        }
        .auth-bg-orb:nth-child(2n+1) {
          background: radial-gradient(circle, rgba(236, 72, 153, 0.28) 0%, rgba(217, 70, 239, 0.05) 60%, transparent 100%);
        }
        .auth-bg-orb:nth-child(3n) {
          background: radial-gradient(circle, rgba(6, 182, 212, 0.24) 0%, rgba(59, 130, 246, 0.04) 60%, transparent 100%);
        }

        @keyframes float-orb-active {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(70px, -60px) scale(1.3) rotate(120deg); }
          66% { transform: translate(-50px, 50px) scale(0.8) rotate(240deg); }
          100% { transform: translate(40px, -30px) scale(1.15) rotate(360deg); }
        }

        /* Active drifting star particles */
        .animate-drift-fast-active {
          animation: drift-fast-active 4s ease-in-out infinite alternate;
        }
        .animate-drift-medium-active {
          animation: drift-medium-active 6.5s ease-in-out infinite alternate;
        }
        .animate-drift-slow-active {
          animation: drift-slow-active 9s ease-in-out infinite alternate;
        }

        @keyframes drift-fast-active {
          0% { opacity: 0.1; transform: translateY(0px) translateX(0px) scale(0.6); }
          50% { opacity: 0.95; transform: translateY(-50px) translateX(25px) scale(1.3); }
          100% { opacity: 0.1; transform: translateY(-100px) translateX(-10px) scale(0.7); }
        }
        @keyframes drift-medium-active {
          0% { opacity: 0.2; transform: translateY(0px) translateX(0px) scale(0.7); }
          50% { opacity: 0.85; transform: translateY(-70px) translateX(-30px) scale(1.2); }
          100% { opacity: 0.2; transform: translateY(-140px) translateX(20px) scale(0.6); }
        }
        @keyframes drift-slow-active {
          0% { opacity: 0.1; transform: translateY(0px) translateX(0px) scale(0.8); }
          50% { opacity: 0.75; transform: translateY(-100px) translateX(35px) scale(1.4); }
          100% { opacity: 0.1; transform: translateY(-200px) translateX(-25px) scale(0.8); }
        }

        /* ========== FORM CONTAINER - DARK GLASSMORPHISM ========== */
        .auth-card {
          background: rgba(22, 16, 43, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 1.75rem;
          box-shadow:
            0 0 35px rgba(168, 85, 247, 0.18),
            0 10px 40px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(168, 85, 247, 0.25);
          position: relative;
          overflow: hidden;
        }

        .auth-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #a855f7, #ec4899, #a855f7, transparent);
          opacity: 0.8;
        }

        /* Subtle local card glow spots */
        .auth-card-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.55;
          mix-blend-mode: screen;
          pointer-events: none;
          z-index: 0;
        }

        .auth-card-orb-1 {
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, transparent 70%);
          top: -80px;
          left: -100px;
        }

        .auth-card-orb-2 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, transparent 70%);
          bottom: -100px;
          right: -120px;
        }

        /* ========== INPUT FIELDS ========== */
        .auth-input {
          width: 100%;
          border-radius: 0.875rem;
          border: 1.5px solid rgba(168, 85, 247, 0.2);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.8rem 1rem 0.8rem 2.75rem;
          font-size: 0.9rem;
          color: #ffffff;
          outline: none;
          transition: all 0.25s ease;
        }

        .auth-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .auth-input:focus {
          border-color: #c084fc;
          box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.25), 0 0 12px rgba(192, 132, 252, 0.15);
          background: rgba(255, 255, 255, 0.08);
        }

        .auth-input-error {
          border-color: rgba(239, 68, 68, 0.55);
          background: rgba(239, 68, 68, 0.04);
        }

        .auth-input-error:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }

        /* ========== SUBMIT BUTTON ========== */
        .auth-submit {
          width: 100%;
          padding: 0.9rem 2rem;
          border-radius: 9999px;
          border: none;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow:
            0 4px 15px rgba(124, 58, 237, 0.35),
            0 2px 4px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
        }

        .auth-submit:hover {
          transform: translateY(-1px);
          box-shadow:
            0 6px 20px rgba(124, 58, 237, 0.45),
            0 4px 8px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .auth-submit:active {
          transform: translateY(1px);
          box-shadow:
            0 2px 8px rgba(124, 58, 237, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* ========== DIVIDER ========== */
        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.35), transparent);
        }

        /* ========== LINK ========== */
        .auth-link {
          color: #c084fc;
          font-weight: 600;
          transition: color 0.2s;
          cursor: pointer;
          background: none;
          border: none;
          font-size: inherit;
        }

        .auth-link:hover {
          color: #d8b4fe;
          text-decoration: underline;
        }

        .auth-accent-flower {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        @keyframes auth-fade-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-animate-in {
          animation: auth-fade-in 0.45s ease-out;
        }
      `}</style>

      {/* ── Animated Magical Background ── */}
      <MagicalBackground />

      {/* ── Main content layout ── */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md auth-animate-in">
          {/* Logo */}
          <div className="mb-8 text-center">
            <a href="/" className="flex items-center group transition-transform duration-300 hover:scale-105 justify-center">
              <div className="relative w-60 h-20 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(192,132,252,0.8)] transition-all duration-300">
                <Image
                  src={logoImg}
                  alt="Trạm Chữ Novel Logo"
                  fill
                  sizes="240px"
                  className="object-contain"
                  priority
                />
              </div>
            </a>
          </div>

          {/* Form Card */}
          <div className="relative">
            {/* Card Background Glow spots */}
            <div className="auth-card-orb auth-card-orb-1" />
            <div className="auth-card-orb auth-card-orb-2" />

            <div className="auth-card p-8 relative z-10">
              {/* Decorative mystical center flower */}
              <div className="auth-accent-flower">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="#c084fc" />
                  <ellipse cx="12" cy="6" rx="2.5" ry="4" fill="#d8b4fe" opacity="0.7" />
                  <ellipse cx="12" cy="18" rx="2.5" ry="4" fill="#d8b4fe" opacity="0.7" />
                  <ellipse cx="6" cy="12" rx="4" ry="2.5" fill="#d8b4fe" opacity="0.7" />
                  <ellipse cx="18" cy="12" rx="4" ry="2.5" fill="#d8b4fe" opacity="0.7" />
                  <circle cx="12" cy="12" r="1.5" fill="#f3e8ff" />
                </svg>
              </div>

              {/* Success Screen for Author Registration */}
              {registerAuthorSuccess ? (
                <div className="text-center py-6 auth-animate-in">
                  <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Đăng Ký Thành Công!</h3>
                  <p className="text-sm text-purple-200 mb-6 leading-relaxed">
                    Tài khoản Tác giả với bút danh <strong>{fullName}</strong> đã được tạo. Hãy đăng nhập tại trang dành riêng cho Tác giả để bắt đầu đăng truyện của bạn.
                  </p>
                  <a
                    href="/admin/login"
                    className="auth-submit no-underline block text-center"
                  >
                    Đến Trang Quản Trị Tác Giả
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      clearForm();
                    }}
                    className="mt-4 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Quay lại Đăng nhập Độc giả
                  </button>
                </div>
              ) : (
                <>
                  {/* Header Title */}
                  <div className="flex items-center gap-3 mb-6 mt-2">
                    <div className="auth-divider-line" />
                    <span className="text-md font-bold uppercase tracking-wider text-purple-300 whitespace-nowrap">
                      {view === "login"
                        ? "Đăng Nhập Độc Giả"
                        : view === "register_reader"
                          ? "Đăng Ký Độc Giả"
                          : "Đăng Ký Tác Giả"}
                    </span>
                    <div className="auth-divider-line" />
                  </div>

                  {/* General Notification Messages */}
                  {successMessage && (
                    <div className="mb-4 rounded-xl px-4 py-3 text-sm border bg-emerald-950/40 text-emerald-400 border-emerald-500/20">
                      {successMessage}
                    </div>
                  )}
                  {errors.general && (
                    <div className="mb-4 rounded-xl px-4 py-3 text-sm border bg-rose-950/40 text-rose-400 border-rose-500/20">
                      {errors.general}
                    </div>
                  )}

                  {/* ═══════════════════════════════════════════════ */}
                  {/* READER LOGIN VIEW                              */}
                  {/* ═══════════════════════════════════════════════ */}
                  {view === "login" && (
                    <form onSubmit={handleLogin} noValidate className="auth-animate-in">
                      {/* Email / Username */}
                      <div className="mb-4">
                        <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold tracking-wider text-purple-300 uppercase">
                          Email hoặc Username
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <MailIcon />
                          </span>
                          <input
                            id="login-email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email hoặc username..."
                            className={`auth-input ${errors.email ? "auth-input-error" : ""}`}
                            autoComplete="username"
                          />
                        </div>
                        {errors.email && (
                          <p className="mt-1 text-xs text-rose-400">{errors.email}</p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="mb-6">
                        <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold tracking-wider text-purple-300 uppercase">
                          Mật khẩu
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <LockIcon />
                          </span>
                          <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu của bạn..."
                            className={`auth-input ${errors.password ? "auth-input-error" : ""}`}
                            style={{ paddingRight: "2.75rem" }}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-xs text-rose-400">{errors.password}</p>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        id="btn-login"
                        type="submit"
                        disabled={isLoading}
                        className="auth-submit"
                      >
                        {isLoading ? <SpinnerIcon /> : null}
                        {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
                        {!isLoading && <ChevronDoubleRight />}
                      </button>

                      {/* Link to Reader Registration */}
                      <p className="mt-6 text-center text-sm text-purple-200">
                        Chưa có tài khoản độc giả?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setView("register_reader");
                            setErrors({});
                            setSuccessMessage("");
                          }}
                          className="auth-link"
                        >
                          Đăng ký ngay
                        </button>
                      </p>

                      {/* CALL TO ACTION (CTA) Redirect to Author Registration */}
                      <div className="mt-8 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all duration-300 text-center">
                        <p className="text-sm text-purple-200 leading-relaxed">
                          Bạn muốn trở thành Tác giả?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setView("register_author");
                              clearForm();
                            }}
                            className="text-pink-400 font-bold hover:text-pink-300 transition-colors duration-200 underline underline-offset-4 ml-1"
                          >
                            Đăng ký tại đây để đăng truyện
                          </button>
                        </p>
                      </div>
                    </form>
                  )}

                  {/* ═══════════════════════════════════════════════ */}
                  {/* READER / AUTHOR REGISTRATION VIEW              */}
                  {/* ═══════════════════════════════════════════════ */}
                  {(view === "register_reader" || view === "register_author") && (
                    <form onSubmit={handleRegister} noValidate className="auth-animate-in">
                      {/* Name / Pen name */}
                      <div className="mb-4">
                        <label htmlFor="register-name" className="mb-1.5 block text-xs font-semibold tracking-wider text-purple-300 uppercase">
                          {view === "register_author" ? "Bút danh (Tên tác giả)" : "Họ và Tên"}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <UserIcon />
                          </span>
                          <input
                            id="register-name"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={view === "register_author" ? "Nhập bút danh của bạn..." : "Nhập họ và tên của bạn..."}
                            className={`auth-input ${errors.fullName ? "auth-input-error" : ""}`}
                            autoComplete="name"
                          />
                        </div>
                        {errors.fullName && (
                          <p className="mt-1 text-xs text-rose-400">{errors.fullName}</p>
                        )}
                      </div>

                      {/* Username (Only for Readers) */}
                      {view === "register_reader" && (
                        <div className="mb-4">
                          <label htmlFor="register-username" className="mb-1.5 block text-xs font-semibold tracking-wider text-purple-300 uppercase">
                            Username
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                              </svg>
                            </span>
                            <input
                              id="register-username"
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Nhập username của bạn..."
                              className={`auth-input ${errors.username ? "auth-input-error" : ""}`}
                            />
                          </div>
                          {errors.username && (
                            <p className="mt-1 text-xs text-rose-400">{errors.username}</p>
                          )}
                        </div>
                      )}

                      {/* Email */}
                      <div className="mb-4">
                        <label htmlFor="register-email" className="mb-1.5 block text-xs font-semibold tracking-wider text-purple-300 uppercase">
                          Email
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <MailIcon />
                          </span>
                          <input
                            id="register-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email của bạn..."
                            className={`auth-input ${errors.email ? "auth-input-error" : ""}`}
                            autoComplete="email"
                          />
                        </div>
                        {errors.email && (
                          <p className="mt-1 text-xs text-rose-400">{errors.email}</p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="mb-4">
                        <label htmlFor="register-password" className="mb-1.5 block text-xs font-semibold tracking-wider text-purple-300 uppercase">
                          Mật khẩu
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <LockIcon />
                          </span>
                          <input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu của bạn..."
                            className={`auth-input ${errors.password ? "auth-input-error" : ""}`}
                            style={{ paddingRight: "2.75rem" }}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-xs text-rose-400">{errors.password}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="mb-6">
                        <label htmlFor="register-confirm" className="mb-1.5 block text-xs font-semibold tracking-wider text-purple-300 uppercase">
                          Xác nhận mật khẩu
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <LockIcon />
                          </span>
                          <input
                            id="register-confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu của bạn..."
                            className={`auth-input ${errors.confirmPassword ? "auth-input-error" : ""}`}
                            style={{ paddingRight: "2.75rem" }}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                            aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword}</p>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        id="btn-register"
                        type="submit"
                        disabled={isLoading}
                        className="auth-submit"
                      >
                        {isLoading ? <SpinnerIcon /> : null}
                        {isLoading ? "Đang xử lý..." : view === "register_author" ? "Đăng Ký Tác Giả" : "Đăng Ký Độc Giả"}
                        {!isLoading && <ChevronDoubleRight />}
                      </button>

                      {/* Switch options */}
                      <p className="mt-6 text-center text-sm text-purple-200">
                        {view === "register_author" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setView("login");
                              clearForm();
                            }}
                            className="auth-link font-semibold"
                          >
                            Quay lại đăng nhập
                          </button>
                        ) : (
                          <>
                            Đã có tài khoản?{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setView("login");
                                clearForm();
                              }}
                              className="auth-link"
                            >
                              Đăng nhập
                            </button>
                          </>
                        )}
                      </p>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-purple-400/50">
            © 2026 Trạm Chữ Novel. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </>
  );
}

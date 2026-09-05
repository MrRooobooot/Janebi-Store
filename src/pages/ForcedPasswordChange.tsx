import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { KeyRound, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// Mandatory first-login password change for admins. The backend refuses every
// admin API with code PASSWORD_CHANGE_REQUIRED until /api/users/me/password
// succeeds (which clears the must_change_password flag server-side).
export default function ForcedPasswordChange() {
  const { user, clearMustChangePassword } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      addToast("رمز عبور جدید باید حداقل ۸ کاراکتر باشد", "error");
      return;
    }
    if (newPassword === "1234") {
      addToast("رمز عبور جدید نمی‌تواند همان رمز اولیه باشد", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("رمز عبور و تکرار آن یکسان نیستند", "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      addToast("نشست شما منقضی شده است. دوباره وارد شوید", "error");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ currentPassword: "1234", newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        clearMustChangePassword();
        addToast("رمز عبور با موفقیت تغییر کرد. خوش آمدید!", "success");
        navigate("/admin");
      } else {
        addToast(data.error || data.message || "خطا در تغییر رمز عبور", "error");
      }
    } catch {
      addToast("خطا در برقراری ارتباط با سرور", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-right">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            تغییر اجباری رمز عبور
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-6">
            {user?.name} عزیز، برای حفظ امنیت پنل مدیریت باید رمز عبور اولیه خود را
            تغییر دهید. تا زمان تغییر رمز، دسترسی به پنل مدیریت فعال نمی‌شود.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              رمز عبور جدید *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="حداقل ۸ کاراکتر"
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 pr-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                required
              />
              <KeyRound className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "مخفی‌سازی رمز عبور" : "نمایش رمز عبور"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              تکرار رمز عبور جدید *
            </label>
            <div className="relative">
              <input
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز جدید"
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                required
              />
              <KeyRound className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 text-sm mt-6 disabled:opacity-60"
          >
            <span>{isLoading ? "در حال ثبت..." : "ثبت رمز جدید و ورود به پنل"}</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

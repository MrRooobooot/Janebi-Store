import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Phone, Lock, Eye, EyeOff, LogIn, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { isValidIranianMobile, normalizeIranianMobile } from "../lib/utils";

export default function Login() {
  const { login, verifyOtp } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"password" | "otp" | "forgot">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const startCountdown = (sec: number = 120) => {
    setOtpCountdown(sec);
    const interval = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const normalizedPhone = normalizeIranianMobile(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      addToast("لطفاً شماره موبایل معتبر وارد کنید (مثلا ۰۹۱۲۳۴۵۶۷۸۹)", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        startCountdown(data.expiresIn || 120);
        addToast(data.message || "کد تایید ارسال شد", "success");
      } else {
        addToast(data.message || "خطا در ارسال کد تایید", "error");
      }
    } catch {
      addToast("خطا در برقراری ارتباط با سرور", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizeIranianMobile(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      addToast("لطفاً شماره موبایل معتبر وارد کنید", "error");
      return;
    }
    if (!otpSent) {
      addToast("ابتدا کد تایید را دریافت کنید", "error");
      return;
    }
    if (!otpCode || otpCode.length !== 5) {
      addToast("کد تایید باید ۵ رقم باشد", "error");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      addToast("رمز عبور جدید باید حداقل ۶ کاراکتر باشد", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("رمز عبور و تکرار آن یکسان نیستند", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code: otpCode, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || "رمز عبور با موفقیت تغییر کرد", "success");
        setMode("password");
        setPassword("");
        setOtpCode("");
        setOtpSent(false);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        addToast(data.message || "خطا در تغییر رمز عبور", "error");
      }
    } catch {
      addToast("خطا در برقراری ارتباط با سرور", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizeIranianMobile(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      addToast("لطفاً شماره موبایل معتبر وارد کنید (مثلا ۰۹۱۲۳۴۵۶۷۸۹)", "error");
      return;
    }

    if (mode === "otp") {
      if (!otpCode || otpCode.length !== 5) {
        addToast("کد تایید باید ۵ رقم باشد", "error");
        return;
      }
      setIsLoading(true);
      const success = await verifyOtp(normalizedPhone, otpCode);
      setIsLoading(false);
      if (success) {
        navigate("/profile");
      }
      return;
    }

    if (!password || password.length < 4) {
      addToast("رمز عبور باید حداقل ۴ کاراکتر باشد", "error");
      return;
    }

    setIsLoading(true);
    const success = await login(normalizedPhone, password);
    setIsLoading(false);
    if (success) {
      navigate("/profile");
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
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 mb-3">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {mode === "forgot" ? "بازیابی رمز عبور" : "ورود به حساب کاربری"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
            {mode === "forgot"
              ? "شماره موبایل و کد تایید را وارد و رمز جدید بگذارید."
              : "خوش آمدید! برای مدیریت سفارش‌ها وارد شوید."}
          </p>
        </div>

        {/* Tab switch for Password vs OTP */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              mode === "password"
                ? "bg-[var(--color-surface-light)] dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            ورود با رمز عبور
          </button>
          <button
            type="button"
            onClick={() => setMode("otp")}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              mode === "otp"
                ? "bg-[var(--color-surface-light)] dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            ورود با پیامک (OTP)
          </button>
        </div>

        <form
          onSubmit={mode === "forgot" ? handleResetPassword : handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              شماره موبایل *
            </label>
            <div className="relative">
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <Phone className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {mode === "forgot" ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    کد تایید پیامک‌شده *
                  </label>
                  {otpSent && (
                    <span className="text-[11px] text-orange-600 dark:text-orange-400 font-mono">
                      {otpCountdown > 0 ? `${otpCountdown} ثانیه تا ارسال مجدد` : "کد منقضی شد"}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={5}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="12345"
                      className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-center tracking-widest text-sm font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    />
                    <KeyRound className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading || otpCountdown > 0}
                    className="px-4 py-3.5 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-extrabold hover:bg-orange-200 transition-all disabled:opacity-50"
                  >
                    {otpSent ? "ارسال مجدد" : "دریافت کد"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  رمز عبور جدید *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۶ کاراکتر"
                    className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    required
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    required
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </>
          ) : mode === "password" ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                رمز عبور *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 pr-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  required
                />
                <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  کد تایید پیامک‌شده *
                </label>
                {otpSent && (
                  <span className="text-[11px] text-orange-600 dark:text-orange-400 font-mono">
                    {otpCountdown > 0 ? `${otpCountdown} ثانیه تا ارسال مجدد` : "کد منقضی شد"}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={5}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="12345"
                    className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-center tracking-widest text-sm font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                  <KeyRound className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading || otpCountdown > 0}
                  className="px-4 py-3.5 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-extrabold hover:bg-orange-200 transition-all disabled:opacity-50"
                >
                  {otpSent ? "ارسال مجدد" : "دریافت کد"}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 text-sm mt-6 disabled:opacity-60"
          >
            <span>{mode === "otp" ? "تایید و ورود" : mode === "forgot" ? "تغییر رمز عبور" : "ورود به حساب"}</span>
            <ArrowLeft className="h-4 w-4" />
          </button>

          {mode === "password" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setOtpCode("");
                setOtpSent(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="w-full text-center text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              رمز عبور خود را فراموش کرده‌اید؟
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("password")}
              className="w-full text-center text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              بازگشت به ورود
            </button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-center text-xs font-medium text-gray-500">
          حساب کاربری ندارید؟{" "}
          <Link to="/register" className="font-extrabold text-orange-600 dark:text-orange-400 hover:underline">
            ثبت‌نام کنید
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Icon } from "@/components/Icon";
import { useAuthStore } from "@/store/authStore";
import { useSound } from "@/lib/sound";
import WaveformLoader from "@/components/ui/WaveformLoader";
import Seo from "@/components/Seo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { play } = useSound();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    play("tick");
    try {
      await login(email, password);
      play("confirm");
      navigate("/dashboard");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Seo
      title="Вход — Dicto"
      description="Вход в личный кабинет Dicto — транскрибация аудио и видео в текст."
      canonical="https://dicto.pro/login"
      noindex
    />
    <AuthLayout
      eyebrow="С возвращением"
      title={<>С возвращением <em className="italic text-acid-300">в Dicto</em>.</>}
      subtitle="Введите email и пароль — мы перенесём вас в кабинет."
      footer={
        <>
          Нет аккаунта?{" "}
          <Link to="/register" onClick={() => play("focus")} className="text-[var(--fg)] underline underline-offset-4 decoration-[var(--border-strong)] hover:decoration-acid-300 transition-colors">
            Создать
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <label htmlFor="login-email" className="label-editorial">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-editorial"
            required
            autoFocus
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="label-editorial">Пароль</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-editorial pr-10"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => {
                play("focus");
                setShowPassword((v) => !v);
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors rounded"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              <Icon icon={showPassword ? EyeOff : Eye} size={16} />
            </button>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <WaveformLoader size={14} label="Вход" /> Вход…
              </>
            ) : (
              <>Войти <span aria-hidden>→</span></>
            )}
          </button>
          <Link
            to="/forgot-password"
            onClick={() => play("focus")}
            className="text-[12px] text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors text-center"
          >
            Забыли пароль?
          </Link>
        </div>
      </form>
    </AuthLayout>
    </>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import WaveformLoader from "@/components/ui/WaveformLoader";
import { useSound } from "@/lib/sound";
import { authApi } from "@/api/auth";
import Seo from "@/components/Seo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { play } = useSound();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    play("tick");
    try {
      await authApi.requestPasswordReset(email);
      play("confirm");
      setSent(true);
    } catch {
      setError("Произошла ошибка. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <>
      <Seo title="Восстановление пароля — Dicto" canonical="https://dicto.pro/forgot-password" noindex />
      <AuthLayout
        eyebrow="Письмо отправлено"
        title={<>Проверьте <em className="italic text-[var(--accent)]">почту</em>.</>}
        subtitle={
          <>
            Если аккаунт с адресом <span className="text-[var(--fg)]">{email}</span> существует, мы прислали ссылку для сброса пароля.
          </>
        }
        footer={
          <Link to="/login" onClick={() => play("focus")} className="text-[var(--fg)] underline underline-offset-4 decoration-[var(--border-strong)] hover:decoration-[var(--accent)] transition-colors">
            ← Вернуться ко входу
          </Link>
        }
      >
        <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          → Проверьте папку «Спам», если письмо не пришло за 2 минуты.
        </div>
      </AuthLayout>
      </>
    );
  }

  return (
    <>
    <Seo title="Восстановление пароля — Dicto" canonical="https://dicto.pro/forgot-password" noindex />
    <AuthLayout
      eyebrow="Восстановление доступа"
      title={<>Забыли <em className="italic text-[var(--accent)]">пароль</em>?</>}
      subtitle="Введите email — пришлём ссылку для сброса."
      footer={
        <Link to="/login" onClick={() => play("focus")} className="text-[var(--fg)] underline underline-offset-4 decoration-[var(--border-strong)] hover:decoration-[var(--accent)] transition-colors">
          ← Вернуться ко входу
        </Link>
      }
    >
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <label htmlFor="forgot-email" className="label-editorial">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-editorial"
            placeholder="you@example.com"
            required
            autoFocus
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <WaveformLoader size={14} label="Отправка" /> Отправка…
            </>
          ) : (
            <>Отправить ссылку <span aria-hidden>→</span></>
          )}
        </button>
      </form>
    </AuthLayout>
    </>
  );
}

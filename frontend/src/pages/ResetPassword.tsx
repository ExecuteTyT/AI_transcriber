import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import WaveformLoader from "@/components/ui/WaveformLoader";
import { useSound } from "@/lib/sound";
import { authApi } from "@/api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const { play } = useSound();

  const isInvalidLink = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Минимум 8 символов");
      return;
    }

    setLoading(true);
    play("tick");
    try {
      await authApi.resetPassword(token, email, password);
      play("confirm");
      setDone(true);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Ошибка сброса пароля");
    } finally {
      setLoading(false);
    }
  };

  if (isInvalidLink) {
    return (
      <AuthLayout
        eyebrow="Ссылка устарела"
        title={<>Ссылка <em className="italic text-acid-300">недействительна</em>.</>}
        subtitle="Запросите новую — старая могла устареть или быть использована."
      >
        <Link to="/forgot-password" onClick={() => play("focus")} className="btn-accent w-full justify-center">
          Запросить новую ссылку <span aria-hidden>→</span>
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        eyebrow="Готово"
        title={<>Пароль <em className="italic text-acid-300">обновлён</em>.</>}
        subtitle="Войдите с новым паролем — мы перенесём вас в кабинет."
      >
        <Link to="/login" onClick={() => play("confirm")} className="btn-accent w-full justify-center">
          Войти <span aria-hidden>→</span>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow={`Сброс для ${email}`}
      title={<>Новый <em className="italic text-acid-300">пароль</em>.</>}
      subtitle="Минимум 8 символов. Старый пароль сразу перестаёт работать."
      footer={
        <Link to="/login" onClick={() => play("focus")} className="text-[var(--fg)] underline underline-offset-4 decoration-[var(--border-strong)] hover:decoration-acid-300 transition-colors">
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
          <label htmlFor="pwd" className="label-editorial">Новый пароль</label>
          <input
            id="pwd"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-editorial"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="confirm" className="label-editorial">Подтвердите пароль</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-editorial"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <WaveformLoader size={14} label="Сохранение" /> Сохранение…
            </>
          ) : (
            <>Установить пароль <span aria-hidden>→</span></>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

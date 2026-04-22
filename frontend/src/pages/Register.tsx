import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/components/auth/AuthLayout";
import { Icon } from "@/components/Icon";
import { useAuthStore } from "@/store/authStore";
import { useSound } from "@/lib/sound";
import WaveformLoader from "@/components/ui/WaveformLoader";
import Seo from "@/components/Seo";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consentMain, setConsentMain] = useState(false);
  const [consentCrossBorder, setConsentCrossBorder] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const { play } = useSound();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentMain) {
      setError("Необходимо принять политику конфиденциальности и пользовательское соглашение.");
      return;
    }
    if (!consentCrossBorder) {
      setError("Без согласия на трансграничную передачу мы не сможем запустить AI-обработку.");
      return;
    }
    setError("");
    setLoading(true);
    play("tick");
    try {
      await register(email, password, name);
      play("confirm");
      toast.success("🎉 Добро пожаловать! +180 минут на тест", { duration: 5000 });
      navigate("/dashboard");
    } catch {
      setError("Ошибка регистрации. Возможно, email уже занят.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Seo
      title="Регистрация — 180 минут бесплатно · Dicto"
      description="Создайте аккаунт Dicto — 180 минут транскрибации бесплатно без карты. AI-саммари, разметка спикеров, экспорт."
      canonical="https://dicto.pro/register"
    />
    <AuthLayout
      eyebrow="180 минут бесплатно — без карты"
      title={<>Создайте <em className="italic text-[var(--accent)]">аккаунт</em>.</>}
      subtitle="Транскрибация, разметка спикеров, AI-саммари и тезисы. Бесплатно."
      footer={
        <>
          Уже зарегистрированы?{" "}
          <Link to="/login" onClick={() => play("focus")} className="text-[var(--fg)] underline underline-offset-4 decoration-[var(--border-strong)] hover:decoration-[var(--accent)] transition-colors">
            Войти
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
          <label htmlFor="reg-name" className="label-editorial">Имя</label>
          <input
            id="reg-name"
            type="text"
            placeholder="Как вас зовут"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-editorial"
            autoFocus
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="label-editorial">Email</label>
          <input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-editorial"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="label-editorial">
            Пароль <span className="text-[var(--fg-subtle)] normal-case tracking-normal font-sans text-[10px]">· мин. 8 символов</span>
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-editorial pr-10"
              required
              minLength={8}
              autoComplete="new-password"
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

        <div className="pt-2 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consentMain}
              onChange={(e) => setConsentMain(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[var(--border-strong)] bg-transparent accent-[var(--accent)]"
            />
            <span className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Принимаю{" "}
              <Link to="/terms" target="_blank" className="text-[var(--fg)] underline underline-offset-2 decoration-[var(--border-strong)] hover:decoration-[var(--accent)]">
                пользовательское соглашение
              </Link>{" "}
              и{" "}
              <Link to="/privacy" target="_blank" className="text-[var(--fg)] underline underline-offset-2 decoration-[var(--border-strong)] hover:decoration-[var(--accent)]">
                политику обработки ПДн
              </Link>.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consentCrossBorder}
              onChange={(e) => setConsentCrossBorder(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[var(--border-strong)] bg-transparent accent-[var(--accent)]"
            />
            <span className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Согласен на трансграничную передачу обработчикам AI (Mistral, Google) для транскрибации и AI-анализа, ст. 12 152-ФЗ.
            </span>
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <WaveformLoader size={14} label="Регистрация" /> Регистрация…
              </>
            ) : (
              <>Создать аккаунт <span aria-hidden>→</span></>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-5 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          <span>Без карты</span>
          <span>·</span>
          <span>180 мин</span>
          <span>·</span>
          <span>Мгновенно</span>
        </div>
      </form>
    </AuthLayout>
    </>
  );
}

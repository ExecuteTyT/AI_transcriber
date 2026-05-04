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
  // 152-ФЗ: три раздельных согласия. Первые два — обязательные, третье — опционально.
  // По умолчанию все unchecked — никаких предзаполненных галочек (требование закона).
  const [consentPdProcessing, setConsentPdProcessing] = useState(false);
  const [consentCrossBorder, setConsentCrossBorder] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const { play } = useSound();

  // Кнопка регистрации активна только когда оба обязательных чекбокса отмечены.
  const canSubmit = consentPdProcessing && consentCrossBorder && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentPdProcessing) {
      setError("Необходимо согласие на обработку персональных данных.");
      return;
    }
    if (!consentCrossBorder) {
      setError("Необходимо согласие на трансграничную передачу данных в Mistral AI (Франция).");
      return;
    }
    setError("");
    setLoading(true);
    play("tick");
    try {
      await register(email, password, name, {
        consent_pd_processing: consentPdProcessing,
        consent_cross_border: consentCrossBorder,
        consent_marketing: consentMarketing,
      });
      play("confirm");
      toast.success("🎉 Добро пожаловать! +180 минут на тест", { duration: 5000 });
      navigate("/dashboard");
    } catch (err) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = axiosErr.response?.status;
      const detail = axiosErr.response?.data?.detail;
      if (status === 429) {
        setError("Слишком много попыток. Попробуйте через минуту.");
      } else if (status === 409) {
        setError("Этот email уже зарегистрирован. Попробуйте войти.");
      } else if (detail) {
        // Бэкенд возвращает понятные сообщения для 422 (валидация пароля),
        // 400 (некорректные данные) — показываем как есть.
        setError(detail);
      } else {
        setError("Не удалось создать аккаунт. Проверьте подключение и попробуйте ещё раз.");
      }
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
          {/* 1. Обязательное — обработка ПД (152-ФЗ ст. 6) */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consentPdProcessing}
              onChange={(e) => setConsentPdProcessing(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[var(--border-strong)] bg-transparent accent-[var(--accent)]"
            />
            <span className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Я ознакомился(-ась) с{" "}
              <Link to="/privacy" target="_blank" className="text-[var(--fg)] underline underline-offset-2 decoration-[var(--border-strong)] hover:decoration-[var(--accent)]">
                Политикой конфиденциальности
              </Link>{" "}
              и даю согласие на обработку моих персональных данных (email, имя) для целей использования сервиса Dicto.
            </span>
          </label>

          {/* 2. Обязательное — трансграничная передача (152-ФЗ ст. 12) */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consentCrossBorder}
              onChange={(e) => setConsentCrossBorder(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[var(--border-strong)] bg-transparent accent-[var(--accent)]"
            />
            <span className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Я даю согласие на передачу моих данных (включая загружаемые аудио и видеоматериалы) в Mistral AI SAS (Франция) для целей транскрибации в соответствии со ст. 12 Федерального закона № 152-ФЗ.
            </span>
          </label>

          {/* 3. Опциональное — маркетинговая рассылка */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consentMarketing}
              onChange={(e) => setConsentMarketing(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[var(--border-strong)] bg-transparent accent-[var(--accent)]"
            />
            <span className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Я согласен(-на) получать информационные письма о новых возможностях Dicto. Вы можете отписаться в любой момент.
            </span>
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
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

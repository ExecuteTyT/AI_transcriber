import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  Clock,
  Languages,
  Mail,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { fadeUp, staggerChildren } from "@/lib/motion";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { useSound } from "@/lib/sound";
import Seo from "@/components/Seo";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  start: "Старт",
  pro: "Про",
  business: "Бизнес",
  premium: "Премиум",
};

function pluralizeDays(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "дней";
  if (b > 1 && b < 5) return "дня";
  if (b === 1) return "дня";
  return "дней";
}

export default function Profile() {
  const { user, loadUser } = useAuthStore();
  const { play } = useSound();
  const [name, setName] = useState(user?.name || "");
  const [retentionDays, setRetentionDays] = useState<number>(user?.data_retention_days ?? 30);
  const [defaultLang, setDefaultLang] = useState<string>(user?.default_language || "auto");
  const [profileLoading, setProfileLoading] = useState(false);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [langLoading, setLangLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Имя не может быть пустым");
      return;
    }
    setProfileLoading(true);
    play("tick");
    try {
      await authApi.updateProfile({ name: name.trim() });
      await loadUser();
      play("confirm");
      toast.success("Профиль обновлён");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast.error(axiosErr.response?.data?.detail || "Ошибка обновления");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLangSave = async () => {
    setLangLoading(true);
    play("tick");
    try {
      await authApi.updateProfile({ default_language: defaultLang });
      await loadUser();
      play("confirm");
      toast.success("Язык сохранён");
    } catch {
      toast.error("Не удалось сохранить язык");
    } finally {
      setLangLoading(false);
    }
  };

  const handleRetentionSave = async () => {
    setRetentionLoading(true);
    play("tick");
    try {
      await authApi.updateProfile({ data_retention_days: retentionDays });
      await loadUser();
      play("confirm");
      toast.success(`Файлы будут удаляться после ${retentionDays} ${pluralizeDays(retentionDays)}`);
    } catch {
      toast.error("Не удалось сохранить настройку");
    } finally {
      setRetentionLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Минимум 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setPwdLoading(true);
    play("tick");
    try {
      await authApi.changePassword(currentPassword, newPassword);
      play("confirm");
      toast.success("Пароль успешно изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast.error(axiosErr.response?.data?.detail || "Ошибка смены пароля");
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return null;

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";
  const initial = (user.name || user.email || "U")[0].toUpperCase();

  return (
    <motion.div
      variants={staggerChildren(0.06)}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-2xl space-y-6"
    >
      <Seo title="Профиль — Dicto" noindex />
      {/* ── Header card ── */}
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]"
      >
        <div className="flex items-center gap-5 p-6 md:p-7">
          <div className="relative h-16 w-16 md:h-20 md:w-20 flex-shrink-0">
            <div className="flex h-full w-full items-center justify-center rounded-3xl border border-[var(--border-strong)] bg-[var(--bg)] font-display text-3xl md:text-4xl text-[var(--fg)]">
              {initial}
            </div>
            <span
              className="absolute -right-1 -bottom-1 block w-3 h-3 rounded-full ring-4 ring-[var(--bg-elevated)]"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 10px color-mix(in srgb, var(--accent) 60%, transparent)",
              }}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-1">
              /аккаунт
            </p>
            <h1 className="truncate font-display text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-[var(--fg)]">
              {user.name || "Пользователь"}
            </h1>
            <p className="mt-1 truncate text-[13px] text-[var(--fg-muted)]">{user.email}</p>
            <span className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              <span className="dot-accent" aria-hidden />
              План: {PLAN_NAMES[user.plan] || user.plan}
            </span>
          </div>
        </div>

        <div className="border-t border-[var(--border)]">
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Calendar} label="Регистрация" value={createdDate} />
          <InfoRow
            icon={UserRound}
            label="Использовано"
            value={`${user.minutes_used} из ${user.minutes_limit || (user.bonus_minutes ?? 0)} мин`}
          />
        </div>

        {user.plan === "free" && (
          <div className="border-t border-[var(--border)] p-4">
            <Link
              to="/app/pricing"
              onClick={() => play("tick")}
              className="group flex items-center gap-3 rounded-2xl border border-[var(--accent)]/25 bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] p-4 hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent)]/30 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]">
                <Icon icon={Sparkles} size={15} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[var(--fg)]">Больше минут и AI</p>
                <p className="text-[11px] text-[var(--fg-muted)]">Тариф Старт от 500 ₽/мес</p>
              </div>
              <Icon
                icon={ChevronRight}
                size={16}
                className="text-[var(--fg-subtle)] transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
              />
            </Link>
          </div>
        )}
      </motion.section>

      {/* ── Profile ── */}
      <motion.section variants={fadeUp}>
        <Card title="Профиль" icon={UserRound}>
          <form onSubmit={handleProfileSave} className="space-y-5">
            <Field id="name" label="Имя" value={name} onChange={(v) => setName(v)} placeholder="Ваше имя" required />
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-accent w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileLoading ? "Сохранение…" : "Сохранить"}
            </button>
          </form>
        </Card>
      </motion.section>

      {/* ── Language ── */}
      <motion.section variants={fadeUp}>
        <Card title="Язык распознавания" icon={Languages}>
          <p className="mb-5 text-[13px] text-[var(--fg-muted)] leading-[1.55]">
            Применяется по умолчанию для новых загрузок. Перед каждой — можно переопределить.
          </p>
          <p className="label-editorial">Язык по умолчанию</p>
          <LanguageSelect value={defaultLang} onChange={setDefaultLang} label="Язык по умолчанию" />
          <button
            type="button"
            onClick={handleLangSave}
            disabled={langLoading || defaultLang === (user.default_language || "auto")}
            className="btn-accent mt-5 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {langLoading ? "Сохранение…" : "Сохранить"}
          </button>
        </Card>
      </motion.section>

      {/* ── Retention ── */}
      <motion.section variants={fadeUp}>
        <Card title="Хранение данных" icon={Clock}>
          <p className="mb-5 text-[13px] text-[var(--fg-muted)] leading-[1.55]">
            Аудио-файлы и транскрипции автоматически удаляются через выбранное количество дней после создания.
          </p>
          <label htmlFor="retention-slider" className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              Удалять через
            </span>
            <span className="font-display text-xl leading-none text-[var(--fg)] tabular">
              {retentionDays}{" "}
              <span className="font-sans text-[13px] text-[var(--fg-muted)] font-normal">
                {pluralizeDays(retentionDays)}
              </span>
            </span>
          </label>
          <input
            id="retention-slider"
            type="range"
            min={1}
            max={30}
            step={1}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="w-full cursor-pointer accent-[var(--accent)]"
          />
          <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--fg-subtle)] tabular">
            <span>1</span>
            <span>7</span>
            <span>14</span>
            <span>21</span>
            <span>30</span>
          </div>
          {retentionDays < (user.data_retention_days ?? 30) && (
            <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-300 leading-[1.5]">
              Уменьшение срока затронет существующие записи — старые файлы будут удалены при ближайшей очистке.
            </p>
          )}
          <button
            type="button"
            onClick={handleRetentionSave}
            disabled={retentionLoading || retentionDays === (user.data_retention_days ?? 30)}
            className="btn-accent mt-5 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retentionLoading ? "Сохранение…" : "Сохранить настройку"}
          </button>
        </Card>
      </motion.section>

      {/* ── Security ── */}
      <motion.section variants={fadeUp}>
        <Card title="Безопасность" icon={Shield}>
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <Field
              id="current-pwd"
              label="Текущий пароль"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="••••••••"
              required
            />
            <Field
              id="new-pwd"
              label="Новый пароль"
              hint="мин. 8 символов"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="••••••••"
              required
              minLength={8}
            />
            <Field
              id="confirm-pwd"
              label="Подтверждение"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              required
              minLength={8}
            />
            <button
              type="submit"
              disabled={pwdLoading}
              className="btn-editorial-ghost w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pwdLoading ? "Сохранение…" : "Сменить пароль"}
            </button>
          </form>
        </Card>
      </motion.section>
    </motion.div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-3 last:border-b-0">
      <Icon icon={icon} size={14} className="flex-shrink-0 text-[var(--fg-subtle)]" />
      <span className="w-28 flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        {label}
      </span>
      <span className="truncate text-[13px] text-[var(--fg)]">{value}</span>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: typeof Shield;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-7">
      <div className="mb-5 flex items-center gap-2.5">
        <Icon icon={icon} size={14} className="text-[var(--accent)]" />
        <h2 className="font-display text-xl leading-tight tracking-[-0.01em] text-[var(--fg)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  minLength,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-editorial flex items-center gap-2">
        {label}
        {hint && <span className="text-[var(--fg-subtle)] normal-case tracking-normal font-sans text-[10px]">· {hint}</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-editorial"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
    </div>
  );
}

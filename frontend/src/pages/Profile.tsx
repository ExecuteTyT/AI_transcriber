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
import { cn } from "@/lib/cn";
import { LANGUAGES } from "@/lib/languages";

const PLAN_NAMES: Record<string, string> = { free: "Free", start: "Старт", pro: "Про", business: "Бизнес" };

function pluralizeDays(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "дней";
  if (b > 1 && b < 5) return "дня";
  if (b === 1) return "дня";
  return "дней";
}
const PLAN_STYLES: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  start: "bg-primary-50 text-primary-700",
  pro: "bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-glow-sm",
};

export default function Profile() {
  const { user, loadUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [retentionDays, setRetentionDays] = useState<number>(
    user?.data_retention_days ?? 30
  );
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
    try {
      await authApi.updateProfile({ name: name.trim() });
      await loadUser();
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
    try {
      await authApi.updateProfile({ default_language: defaultLang });
      await loadUser();
      toast.success("Язык сохранён");
    } catch {
      toast.error("Не удалось сохранить язык");
    } finally {
      setLangLoading(false);
    }
  };

  const handleRetentionSave = async () => {
    setRetentionLoading(true);
    try {
      await authApi.updateProfile({ data_retention_days: retentionDays });
      await loadUser();
      toast.success(
        `Файлы будут удаляться после ${retentionDays} ${pluralizeDays(retentionDays)}`
      );
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
    try {
      await authApi.changePassword(currentPassword, newPassword);
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
      className="mx-auto max-w-2xl space-y-5"
    >
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-raised"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(80% 60% at 0% 0%, rgba(99,102,241,0.10) 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, rgba(249,115,22,0.10) 0%, transparent 55%)",
          }}
        />
        <div className="relative flex items-center gap-4 p-5 md:p-6">
          <div className="relative h-16 w-16 flex-shrink-0 md:h-20 md:w-20">
            <div className="flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-2xl font-bold text-white shadow-glow md:text-3xl">
              {initial}
            </div>
            <span className="absolute inset-0 rounded-3xl ring-2 ring-white ring-offset-2 ring-offset-transparent" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
              {user.name || "Пользователь"}
            </h1>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
            <span
              className={cn(
                "mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                PLAN_STYLES[user.plan] || "bg-gray-100 text-gray-700"
              )}
            >
              {PLAN_NAMES[user.plan] || user.plan}
            </span>
          </div>
        </div>

        <div className="relative border-t border-gray-100">
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Calendar} label="Регистрация" value={createdDate} />
          <InfoRow
            icon={UserRound}
            label="Использовано"
            value={`${user.minutes_used} из ${user.minutes_limit} мин`}
          />
        </div>

        {user.plan === "free" && (
          <div className="relative border-t border-gray-100 bg-surface-50/60 p-4">
            <Link
              to="/app/pricing"
              className="group flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-primary-100 hover:ring-primary-200 transition-colors duration-base"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white">
                <Icon icon={Sparkles} size={16} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary-800">Больше минут и AI</p>
                <p className="text-xs text-gray-500">Тариф Старт от 290 ₽/мес</p>
              </div>
              <Icon
                icon={ChevronRight}
                size={16}
                className="text-primary-400 transition-transform duration-fast group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        )}
      </motion.section>

      <motion.section variants={fadeUp}>
        <Card title="Профиль" icon={UserRound}>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Field
              id="name"
              label="Имя"
              value={name}
              onChange={(v) => setName(v)}
              placeholder="Ваше имя"
              required
            />
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {profileLoading ? "Сохранение…" : "Сохранить"}
            </button>
          </form>
        </Card>
      </motion.section>

      <motion.section variants={fadeUp}>
        <Card title="Язык распознавания" icon={Languages}>
          <p className="mb-4 text-sm text-gray-500">
            Будет применяться по умолчанию для новых загрузок. Перед каждой
            можно переопределить.
          </p>
          <label htmlFor="default-lang" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Язык по умолчанию
          </label>
          <select
            id="default-lang"
            value={defaultLang}
            onChange={(e) => setDefaultLang(e.target.value)}
            className="input-field"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLangSave}
            disabled={langLoading || defaultLang === (user.default_language || "auto")}
            className="btn-primary mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {langLoading ? "Сохранение…" : "Сохранить"}
          </button>
        </Card>
      </motion.section>

      <motion.section variants={fadeUp}>
        <Card title="Хранение данных" icon={Clock}>
          <p className="mb-4 text-sm text-gray-500">
            Аудио-файлы и транскрипции автоматически удаляются через выбранное
            количество дней после создания.
          </p>
          <label htmlFor="retention-slider" className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Удалять через</span>
            <span className="text-sm font-bold tabular text-primary-700">
              {retentionDays} {pluralizeDays(retentionDays)}
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
            className="w-full cursor-pointer accent-primary-600"
          />
          <div className="mt-1 flex justify-between text-[10px] font-medium text-gray-400 tabular">
            <span>1 день</span>
            <span>7</span>
            <span>14</span>
            <span>21</span>
            <span>30 дней</span>
          </div>
          {retentionDays < (user.data_retention_days ?? 30) && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
              Уменьшение срока затронет существующие записи — старые файлы будут удалены
              при ближайшей очистке.
            </p>
          )}
          <button
            type="button"
            onClick={handleRetentionSave}
            disabled={retentionLoading || retentionDays === (user.data_retention_days ?? 30)}
            className="btn-primary mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retentionLoading ? "Сохранение…" : "Сохранить настройку"}
          </button>
        </Card>
      </motion.section>

      <motion.section variants={fadeUp}>
        <Card title="Безопасность" icon={Shield}>
          <form onSubmit={handlePasswordChange} className="space-y-4">
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
              className="btn-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
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
    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3 last:border-b-0 md:px-6">
      <Icon icon={icon} size={16} className="flex-shrink-0 text-gray-400" />
      <span className="w-24 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span className="truncate text-sm font-medium text-gray-800">{value}</span>
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
    <div className="rounded-3xl border border-gray-200/70 bg-white p-5 shadow-card md:p-6">
      <div className="mb-4 flex items-center gap-2 text-gray-900">
        <Icon icon={icon} size={16} className="text-gray-400" />
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
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
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700"
      >
        {label}
        {hint && <span className="text-xs font-normal text-gray-400">({hint})</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
    </div>
  );
}

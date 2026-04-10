import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Calendar, Clock, Shield, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

const planNames: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };
const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  start: "bg-primary-50 text-primary-600",
  pro: "bg-gradient-to-r from-primary-500 to-accent-500 text-white",
};

export default function Profile() {
  const { user, loadUser } = useAuthStore();

  const [name, setName] = useState(user?.name || "");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Имя не может быть пустым"); return; }
    setProfileLoading(true);
    try {
      await authApi.updateProfile({ name: name.trim() });
      await loadUser();
      toast.success("Профиль обновлён");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка обновления");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Минимум 8 символов"); return; }
    if (newPassword !== confirmPassword) { toast.error("Пароли не совпадают"); return; }
    setPwdLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success("Пароль успешно изменён");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка смены пароля");
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return null;

  const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "—";
  const usagePercent = Math.min(100, Math.round((user.minutes_used / user.minutes_limit) * 100));
  const initial = (user.name || user.email || "U")[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      {/* User card */}
      <div className="card p-5 md:p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">{user.name || "Пользователь"}</h2>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>
          <span className={`badge text-[11px] font-bold px-3 py-1 ${planColors[user.plan] || "bg-gray-100 text-gray-600"}`}>
            {planNames[user.plan] || user.plan}
          </span>
        </div>

        {/* Info rows */}
        <div className="space-y-0 divide-y divide-gray-100">
          <div className="flex items-center gap-3 py-3">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 w-24 flex-shrink-0">Email</span>
            <span className="text-sm font-medium text-gray-900 truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 w-24 flex-shrink-0">Регистрация</span>
            <span className="text-sm font-medium text-gray-900">{createdDate}</span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 w-24 flex-shrink-0">Использовано</span>
            <span className="text-sm font-medium text-gray-900">{user.minutes_used} / {user.minutes_limit} мин</span>
          </div>
        </div>

        {/* Usage bar */}
        <div className="mt-4 p-3 rounded-xl bg-surface-50">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Лимит минут</span>
            <span className="font-semibold tabular-nums">{usagePercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-gradient-to-r from-primary-500 to-accent-400"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent >= 80 && (
            <p className="text-xs mt-2 text-amber-600">
              {usagePercent >= 100 ? "Лимит исчерпан. " : "Лимит почти исчерпан. "}
              <Link to="/subscription" className="underline font-medium hover:text-amber-700">Перейти на расширенный тариф</Link>
            </p>
          )}
        </div>

        {/* Upgrade CTA */}
        {user.plan === "free" && (
          <Link
            to="/app/pricing"
            className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-primary-50 border border-primary-100 hover:bg-primary-100 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-700">Больше минут?</p>
              <p className="text-xs text-primary-500">Перейдите на тариф Старт — от 290 ₽/мес</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Edit profile */}
      <form onSubmit={handleProfileSave} className="card p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Редактировать профиль</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Имя</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Ваше имя"
              required
              minLength={1}
            />
          </div>
          <button
            type="submit"
            disabled={profileLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileLoading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="card p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Сменить пароль</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="current-pwd" className="block text-sm font-medium text-gray-700 mb-1.5">Текущий пароль</label>
            <input id="current-pwd" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" placeholder="••••••••" required />
          </div>
          <div>
            <label htmlFor="new-pwd" className="block text-sm font-medium text-gray-700 mb-1.5">
              Новый пароль <span className="text-gray-400 font-normal">(мин. 8)</span>
            </label>
            <input id="new-pwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" required minLength={8} />
          </div>
          <div>
            <label htmlFor="confirm-pwd" className="block text-sm font-medium text-gray-700 mb-1.5">Подтвердите пароль</label>
            <input id="confirm-pwd" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="••••••••" required minLength={8} />
          </div>
          <button
            type="submit"
            disabled={pwdLoading}
            className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwdLoading ? "Сохранение..." : "Сменить пароль"}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

export default function Profile() {
  const { user, loadUser } = useAuthStore();

  // Profile form
  const [name, setName] = useState(user?.name || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Auto-dismiss success messages after 4 seconds
  useEffect(() => {
    if (profileMsg) {
      const t = setTimeout(() => setProfileMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [profileMsg]);

  useEffect(() => {
    if (pwdMsg) {
      const t = setTimeout(() => setPwdMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [pwdMsg]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError("Имя не может быть пустым");
      return;
    }
    setProfileLoading(true);
    setProfileMsg("");
    setProfileError("");
    try {
      await authApi.updateProfile({ name: name.trim() });
      await loadUser();
      setProfileMsg("Профиль обновлён");
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || "Ошибка обновления");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg("");
    setPwdError("");

    if (newPassword.length < 8) {
      setPwdError("Минимум 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Пароли не совпадают");
      return;
    }

    setPwdLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwdMsg("Пароль успешно изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err.response?.data?.detail || "Ошибка смены пароля");
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return null;

  const planNames: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };
  const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "—";
  const usagePercent = Math.min(100, Math.round((user.minutes_used / user.minutes_limit) * 100));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Профиль</h1>
        <p className="text-sm text-gray-500">Управление аккаунтом и настройки</p>
      </div>

      {/* Account info */}
      <div className="card p-6 accent-top-border">
        <h2 className="font-semibold mb-4">Аккаунт</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Email</span>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Тариф</span>
            <p className="font-medium">{planNames[user.plan] || user.plan}</p>
          </div>
          <div>
            <span className="text-gray-500">Регистрация</span>
            <p className="font-medium">{createdDate}</p>
          </div>
          <div>
            <span className="text-gray-500">Использовано</span>
            <p className="font-medium">{user.minutes_used} / {user.minutes_limit} мин</p>
          </div>
        </div>

        {/* Usage bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Лимит минут</span>
            <span>{usagePercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={usagePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Использование лимита минут">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-gradient-to-r from-primary-500 to-accent-400"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent >= 80 && (
            <p className="text-xs mt-2 text-amber-600">
              {usagePercent >= 100
                ? "Лимит исчерпан. "
                : "Лимит почти исчерпан. "}
              <Link to="/subscription" className="underline font-medium hover:text-amber-700">Перейти на расширенный тариф</Link>
            </p>
          )}
        </div>
      </div>

      {/* Edit profile */}
      <form onSubmit={handleProfileSave} className="card p-6">
        <h2 className="font-semibold mb-4">Редактировать профиль</h2>
        <div className="space-y-5">
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

          {profileMsg && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm border border-green-100 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {profileMsg}
            </div>
          )}
          {profileError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">{profileError}</div>
          )}

          <button
            type="submit"
            disabled={profileLoading}
            className="btn-primary !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileLoading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="card p-6 accent-top-border">
        <h2 className="font-semibold mb-4">Сменить пароль</h2>
        <div className="space-y-5">
          <div>
            <label htmlFor="current-pwd" className="block text-sm font-medium text-gray-700 mb-1.5">Текущий пароль</label>
            <input
              id="current-pwd"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label htmlFor="new-pwd" className="block text-sm font-medium text-gray-700 mb-1.5">
              Новый пароль <span className="text-gray-400 font-normal">(мин. 8 символов)</span>
            </label>
            <input
              id="new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="confirm-pwd" className="block text-sm font-medium text-gray-700 mb-1.5">Подтвердите пароль</label>
            <input
              id="confirm-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {pwdMsg && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm border border-green-100 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {pwdMsg}
            </div>
          )}
          {pwdError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">{pwdError}</div>
          )}

          <button
            type="submit"
            disabled={pwdLoading}
            className="btn-secondary !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwdLoading ? "Сохранение..." : "Сменить пароль"}
          </button>
        </div>
      </form>
    </div>
  );
}

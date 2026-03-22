import { useState } from "react";
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

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg("");
    setProfileError("");
    try {
      await authApi.updateProfile({ name });
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

    if (newPassword !== confirmPassword) {
      setPwdError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("Минимум 8 символов");
      return;
    }

    setPwdLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwdMsg("Пароль изменён");
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Профиль</h1>
        <p className="text-sm text-gray-500">Управление аккаунтом и настройки</p>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Аккаунт</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Email</span>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Тариф</span>
            <p className="font-medium">{planNames[user.plan] || user.plan}</p>
          </div>
          <div>
            <span className="text-gray-500">Использовано</span>
            <p className="font-medium">{user.minutes_used} / {user.minutes_limit} мин</p>
          </div>
          <div>
            <span className="text-gray-500">Регистрация</span>
            <p className="font-medium">{createdDate}</p>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <form onSubmit={handleProfileSave} className="card p-6">
        <h2 className="font-semibold mb-4">Редактировать профиль</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
              placeholder="Ваше имя"
            />
          </div>

          {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
          {profileError && <p className="text-sm text-red-600">{profileError}</p>}

          <button
            type="submit"
            disabled={profileLoading}
            className="btn-primary !py-2.5"
          >
            {profileLoading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="card p-6">
        <h2 className="font-semibold mb-4">Сменить пароль</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="current-pwd" className="block text-sm font-medium text-gray-700 mb-1">Текущий пароль</label>
            <input
              id="current-pwd"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
              required
            />
          </div>
          <div>
            <label htmlFor="new-pwd" className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
            <input
              id="new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
              placeholder="Минимум 8 символов"
              required
            />
          </div>
          <div>
            <label htmlFor="confirm-pwd" className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль</label>
            <input
              id="confirm-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
              required
            />
          </div>

          {pwdMsg && <p className="text-sm text-green-600">{pwdMsg}</p>}
          {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}

          <button
            type="submit"
            disabled={pwdLoading}
            className="btn-secondary !py-2.5"
          >
            {pwdLoading ? "Сохранение..." : "Сменить пароль"}
          </button>
        </div>
      </form>
    </div>
  );
}

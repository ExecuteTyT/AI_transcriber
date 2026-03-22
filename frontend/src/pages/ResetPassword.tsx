import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
    if (!token || !email) {
      setError("Недействительная ссылка для сброса");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, email, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка сброса пароля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold gradient-text">AI Voice</Link>
        </div>

        <div className="card p-8">
          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Пароль изменён</h1>
              <p className="text-sm text-gray-500 mb-6">Теперь вы можете войти с новым паролем.</p>
              <Link to="/login" className="btn-primary inline-block !py-2.5 !px-8">Войти</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-2">Новый пароль</h1>
              <p className="text-sm text-gray-500 mb-6">Введите новый пароль для вашего аккаунта.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="pwd" className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
                  <input
                    id="pwd"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                    placeholder="Минимум 8 символов"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль</label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                  {loading ? "Сохранение..." : "Установить пароль"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

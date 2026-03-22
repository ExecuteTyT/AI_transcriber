import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch {
      setError("Произошла ошибка. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold gradient-text">Voitra</Link>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Письмо отправлено</h1>
              <p className="text-sm text-gray-500 mb-6">
                Если аккаунт с адресом <strong>{email}</strong> существует, мы отправили ссылку для сброса пароля. Проверьте почту.
              </p>
              <Link to="/login" className="text-primary-600 hover:underline text-sm">Вернуться ко входу</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-2">Забыли пароль?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Введите email, и мы отправим ссылку для сброса пароля.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">{error}</div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? "Отправка..." : "Отправить ссылку"}
                </button>
              </form>

              <p className="text-sm text-center text-gray-500 mt-6">
                <Link to="/login" className="text-primary-600 hover:underline">Вернуться ко входу</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-mesh opacity-40" />
      <div className="absolute top-1/4 right-[20%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-[10%] w-96 h-96 bg-accent-400/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md mx-4 animate-fade-up">
        {/* Logo */}
        <Link to="/" className="flex justify-center mb-8">
          <span className="text-2xl font-bold gradient-text">Voitra</span>
        </Link>

        <div className="card p-8 shadow-elevated">
          <h1 className="text-2xl font-bold mb-1 text-center">С возвращением</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Войдите в свой аккаунт</p>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
              <input
                id="login-password"
                type="password"
                placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-primary-600 transition">
              Забыли пароль?
            </Link>
          </div>

          <div className="mt-4 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Нет аккаунта?{" "}
              <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700 transition">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

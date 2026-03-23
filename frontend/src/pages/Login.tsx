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
    <div className="min-h-screen flex">
      {/* Left panel — dark, hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-primary-950 bg-grid relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-accent-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />

        <div className="relative z-10">
          <Link to="/" className="text-2xl font-bold text-white">Voitra</Link>
        </div>

        {/* Wave bars */}
        <div className="relative z-10 flex items-end justify-center gap-1.5 h-24">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="w-1.5 bg-white/30 rounded-full animate-wave-bar"
              style={{ animationDelay: `${i * 0.1}s`, height: "100%" }}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="relative z-10 space-y-4">
          <div className="flex gap-4">
            {[
              { value: "98%", label: "Точность" },
              { value: "13", label: "Языков" },
              { value: "~2 мин", label: "На час аудио" },
            ].map((stat) => (
              <div key={stat.label} className="glass-dark rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-white font-bold text-lg">{stat.value}</div>
                <div className="text-primary-300 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
          <p className="text-primary-200/60 text-sm">Превращаем речь в структурированный текст</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <Link to="/" className="flex justify-center mb-8 md:hidden">
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
    </div>
  );
}

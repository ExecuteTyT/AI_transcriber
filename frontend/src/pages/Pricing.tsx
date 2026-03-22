import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { paymentsApi } from "@/api/payments";
import { useAuthStore } from "@/store/authStore";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0 ₽",
    period: "",
    features: ["15 минут/мес", "Файлы до 10 мин", "3 AI-саммари/мес", "Экспорт TXT"],
    notIncluded: ["Разметка спикеров", "RAG-чат", "Action items", "Экспорт SRT/DOCX"],
  },
  {
    id: "start",
    name: "Старт",
    price: "290 ₽",
    period: "/мес",
    popular: true,
    features: ["300 минут (5 ч)", "Файлы до 2 часов", "AI-саммари безлимит", "Разметка спикеров", "5 RAG-вопросов/транскрипт", "Экспорт TXT/SRT/DOCX"],
    notIncluded: ["Action items"],
  },
  {
    id: "pro",
    name: "Про",
    price: "590 ₽",
    period: "/мес",
    features: ["1200 минут (20 ч)", "Файлы до 3 часов", "AI-саммари безлимит", "Разметка спикеров", "RAG-чат безлимит", "Action items", "Экспорт TXT/SRT/DOCX"],
    notIncluded: [],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubscribe = async (planId: string) => {
    if (!user) { navigate("/register"); return; }
    if (planId === "free" || user.plan === planId) return;
    setLoading(planId);
    setError("");
    try {
      const result = await paymentsApi.subscribe(planId);
      window.location.href = result.confirmation_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания платежа");
    } finally {
      setLoading(null);
    }
  };

  // Detect if we're inside the app layout or standalone
  const isStandalone = !user;

  const content = (
    <div className={isStandalone ? "max-w-5xl mx-auto py-16 px-6" : ""}>
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Тарифы</p>
        <h1 className="section-heading mb-4">Простые и прозрачные</h1>
        <p className="text-gray-500 max-w-md mx-auto">Начните бесплатно. Переходите когда понадобится больше минут.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-8 text-sm text-center border border-red-100 max-w-md mx-auto">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.id;
          const isPopular = "popular" in plan && plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative card p-7 flex flex-col transition-all duration-300 ${
                isPopular ? "ring-2 ring-primary-500 shadow-glow" : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    Популярный
                  </span>
                </div>
              )}

              <h2 className="text-lg font-bold">{plan.name}</h2>
              <div className="mt-3 mb-6">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrent || loading !== null}
                className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                  isCurrent
                    ? "bg-surface-100 text-gray-400 cursor-default"
                    : isPopular
                      ? "btn-primary !shadow-md"
                      : "btn-secondary"
                }`}
              >
                {loading === plan.id ? "Перенаправление..." : isCurrent ? "Текущий план" : plan.id === "free" ? "Бесплатно" : "Оформить"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold gradient-text">AI Voice</Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-ghost text-sm">Войти</Link>
              <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5">Попробовать</Link>
            </div>
          </div>
        </header>
        {content}
      </div>
    );
  }

  return content;
}

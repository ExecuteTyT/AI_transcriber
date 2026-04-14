import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { paymentsApi } from "@/api/payments";
import { useAuthStore } from "@/store/authStore";

const plans = [
  {
    id: "free",
    name: "Free",
    desc: "Для знакомства",
    price: "0 ₽",
    period: "",
    features: ["15 минут/мес", "Файлы до 10 мин", "3 AI-саммари/мес", "Экспорт TXT"],
    notIncluded: ["Разметка спикеров", "RAG-чат", "Action items", "Экспорт SRT/DOCX"],
  },
  {
    id: "start",
    name: "Старт",
    desc: "Для подкастеров и бизнеса",
    price: "290 ₽",
    period: "/мес",
    popular: true,
    features: ["300 минут (5 ч)", "Файлы до 2 часов", "AI-саммари безлимит", "Разметка спикеров", "5 RAG-вопросов/транскрипт", "Экспорт TXT/SRT/DOCX"],
    notIncluded: ["Action items"],
  },
  {
    id: "pro",
    name: "Про",
    desc: "Для команд и продакшена",
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
      const axiosErr = err as { response?: { status?: number }; message?: string };
      if (axiosErr.response?.status === 502 || axiosErr.response?.status === 503) {
        setError("Платёжный сервис временно недоступен. Попробуйте позже.");
      } else {
        setError(axiosErr.response?.status === 500 ? "Ошибка сервера. Попробуйте позже." : (axiosErr.message || "Ошибка создания платежа"));
      }
    } finally {
      setLoading(null);
    }
  };

  const isStandalone = !user;

  /* ─── In-app version (inside Layout with sidebar) ─── */
  if (!isStandalone) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Тарифы</h1>
          <p className="text-gray-500 text-sm">Выберите подходящий план. Переход мгновенный.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm text-center border border-red-100">
            {error}
          </div>
        )}

        {/* Current plan badge */}
        {user && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-primary-50 border border-primary-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Текущий план: <span className="font-bold text-primary-700">{user.plan === "free" ? "Free" : user.plan === "start" ? "Старт" : "Про"}</span>
              </p>
              <p className="text-xs text-gray-500">
                Использовано {Math.round(user.minutes_used)} из {user.minutes_limit} мин
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrent = user?.plan === plan.id;
            const isPopular = "popular" in plan && plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl transition-all duration-300 ${
                  isCurrent
                    ? "ring-2 ring-primary-500 bg-primary-50/50 shadow-md"
                    : isPopular
                      ? "ring-2 ring-primary-400/50 bg-white shadow-elevated"
                      : "bg-white border border-gray-200/80 shadow-card hover:shadow-elevated"
                }`}
              >
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-md">
                      Популярный
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-md">
                      Текущий
                    </span>
                  </div>
                )}

                <div className="flex flex-col h-full p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.desc}</p>
                  </div>

                  <div className="mb-5">
                    <span className="text-3xl font-extrabold tracking-tight text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                  </div>

                  <ul className="flex-1 space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || loading !== null}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isCurrent
                        ? "bg-primary-100 text-primary-600 cursor-default"
                        : isPopular
                          ? "btn-primary"
                          : "border-2 border-primary-500 text-primary-600 hover:bg-primary-50"
                    }`}
                  >
                    {loading === plan.id
                      ? "Перенаправление..."
                      : isCurrent
                        ? "✓ Текущий план"
                        : plan.id === "free"
                          ? "Бесплатно"
                          : "Оформить"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ mini */}
        <div className="mt-10 p-6 rounded-2xl bg-surface-50 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Частые вопросы</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-700">Как работает смена тарифа?</p>
              <p className="text-gray-500 mt-0.5">Переход мгновенный. Новые лимиты начинают действовать сразу после оплаты.</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Можно ли отменить подписку?</p>
              <p className="text-gray-500 mt-0.5">Да, в любой момент на странице <Link to="/subscription" className="text-primary-600 hover:underline">Подписка</Link>. Доступ сохранится до конца оплаченного периода.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Standalone (public, not authenticated) ─── */
  return (
    <div className="min-h-screen bg-surface-50">
      <Helmet>
        <title>Тарифы Scribi — транскрибация от 290 ₽/мес</title>
        <meta name="description" content="Тарифы Scribi: Free (15 мин/мес бесплатно), Старт (290 ₽/мес, 5 часов), Про (590 ₽/мес, 20 часов). AI-саммари, разметка спикеров, экспорт." />
        <link rel="canonical" href="https://voitra.ru/pricing" />
      </Helmet>
      <header className="border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">Scribi</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Войти</Link>
            <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5">Попробовать</Link>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto py-16 px-6">
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
            const isPopular = "popular" in plan && plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col transition-all duration-300 ${
                  isPopular ? "gradient-border shadow-glow md:scale-[1.02]" : "bento-card hover:glow-ring"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                      Популярный
                    </span>
                  </div>
                )}

                <div className={`flex flex-col h-full ${isPopular ? "bg-white rounded-2xl p-7" : ""}`}>
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.desc}</p>
                  <div className="mt-3 mb-6">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                  </div>

                  <ul className="flex-1 space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <span className="w-5 h-5 rounded-full bg-green-50 shadow-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </span>
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
                    disabled={loading !== null}
                    className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                      isPopular ? "btn-primary !shadow-md" : "btn-secondary"
                    }`}
                  >
                    {loading === plan.id ? "Перенаправление..." : plan.id === "free" ? "Начать бесплатно" : "Оформить"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

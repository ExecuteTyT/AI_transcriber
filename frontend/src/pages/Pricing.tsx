import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { paymentsApi } from "@/api/payments";
import { useAuthStore } from "@/store/authStore";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0 ₽",
    period: "",
    features: [
      "15 минут/мес",
      "Файлы до 10 мин",
      "3 AI-саммари/мес",
      "Экспорт TXT",
    ],
    notIncluded: [
      "Разметка спикеров",
      "RAG-чат",
      "Action items",
      "Экспорт SRT/DOCX",
    ],
  },
  {
    id: "start",
    name: "Старт",
    price: "290 ₽",
    period: "/мес",
    popular: true,
    features: [
      "300 минут/мес (5 ч)",
      "Файлы до 2 часов",
      "AI-саммари безлимит",
      "Разметка спикеров",
      "5 RAG-вопросов/транскрипт",
      "Экспорт TXT/SRT/DOCX",
    ],
    notIncluded: ["Action items"],
  },
  {
    id: "pro",
    name: "Про",
    price: "590 ₽",
    period: "/мес",
    features: [
      "1200 минут/мес (20 ч)",
      "Файлы до 3 часов",
      "AI-саммари безлимит",
      "Разметка спикеров",
      "RAG-чат безлимит",
      "Action items",
      "Экспорт TXT/SRT/DOCX",
    ],
    notIncluded: [],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (planId === "free") return;
    if (user.plan === planId) return;

    setLoading(planId);
    setError("");

    try {
      const result = await paymentsApi.subscribe(planId);
      window.location.href = result.confirmation_url;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Ошибка создания платежа";
      setError(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-2">Тарифы AI Voice</h1>
      <p className="text-gray-500 text-center mb-10">
        Превращайте аудио и видео в структурированные инсайты
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-center">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.id;
          const isPopular = "popular" in plan && plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                isPopular
                  ? "border-primary-500 shadow-lg shadow-primary-100"
                  : "border-gray-200"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Популярный
                </div>
              )}

              <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
              <div className="mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-gray-500">{plan.period}</span>
                )}
              </div>

              <ul className="flex-1 space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    {f}
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-400"
                  >
                    <span className="mt-0.5">&#10007;</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrent || loading !== null}
                className={`w-full py-2.5 rounded-lg font-medium transition ${
                  isCurrent
                    ? "bg-gray-100 text-gray-400 cursor-default"
                    : isPopular
                      ? "bg-primary-500 text-white hover:bg-primary-600"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                {loading === plan.id
                  ? "Перенаправление..."
                  : isCurrent
                    ? "Текущий план"
                    : plan.id === "free"
                      ? "Бесплатно"
                      : "Оформить"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

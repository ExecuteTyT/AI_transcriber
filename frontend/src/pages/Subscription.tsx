import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paymentsApi, type SubscriptionInfo } from "@/api/payments";

export default function Subscription() {
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    paymentsApi
      .getSubscription()
      .then(setSub)
      .catch(() => setError("Не удалось загрузить подписку"))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    if (!confirm("Вы уверены, что хотите отменить подписку?")) return;

    setCancelling(true);
    try {
      await paymentsApi.cancel();
      const updated = await paymentsApi.getSubscription();
      setSub(updated);
    } catch {
      setError("Ошибка при отмене подписки");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="bg-red-50 text-red-600 p-4 rounded">{error || "Нет данных"}</div>
      </div>
    );
  }

  const usagePercent = sub.minutes_limit > 0
    ? Math.min(100, Math.round((sub.minutes_used / sub.minutes_limit) * 100))
    : 0;

  const planNames: Record<string, string> = {
    free: "Free",
    start: "Старт",
    pro: "Про",
  };

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Моя подписка</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Текущий план */}
        <div>
          <div className="text-sm text-gray-500 mb-1">Текущий тариф</div>
          <div className="text-xl font-bold">
            {planNames[sub.plan] || sub.plan}
          </div>
          {sub.status === "active" && sub.current_period_end && (
            <div className="text-sm text-gray-500 mt-1">
              Действует до{" "}
              {new Date(sub.current_period_end).toLocaleDateString("ru")}
            </div>
          )}
        </div>

        {/* Использование минут */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Использовано минут</span>
            <span className="font-medium">
              {sub.minutes_used} / {sub.minutes_limit}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                usagePercent >= 90
                  ? "bg-red-500"
                  : usagePercent >= 70
                    ? "bg-yellow-500"
                    : "bg-primary-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {usagePercent}% использовано
          </div>
        </div>

        {/* Действия */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/pricing")}
            className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
          >
            {sub.plan === "free" ? "Улучшить план" : "Сменить план"}
          </button>

          {sub.status === "active" && sub.plan !== "free" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              {cancelling ? "Отмена..." : "Отменить"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

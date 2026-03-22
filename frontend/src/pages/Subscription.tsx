import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paymentsApi, type SubscriptionInfo } from "@/api/payments";

const planNames: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };

export default function Subscription() {
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    paymentsApi.getSubscription()
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
      <div className="max-w-lg mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-surface-100 rounded-xl w-1/3" />
        <div className="card p-8 space-y-4">
          <div className="h-6 bg-surface-100 rounded-xl w-1/2" />
          <div className="h-3 bg-surface-100 rounded-full w-full" />
          <div className="h-10 bg-surface-100 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">{error || "Нет данных"}</div>
      </div>
    );
  }

  const usagePercent = sub.minutes_limit > 0 ? Math.min(100, Math.round((sub.minutes_used / sub.minutes_limit) * 100)) : 0;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Подписка</h1>
      <p className="text-sm text-gray-500 mb-8">Управляйте вашим тарифом и лимитами</p>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm border border-red-100">{error}</div>
      )}

      <div className="card p-7 space-y-6">
        {/* Current plan */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Текущий тариф</p>
            <p className="text-2xl font-bold">{planNames[sub.plan] || sub.plan}</p>
          </div>
          {sub.status === "active" && (
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">Активна</span>
          )}
        </div>

        {sub.status === "active" && sub.current_period_end && (
          <p className="text-sm text-gray-500">
            Действует до {new Date(sub.current_period_end).toLocaleDateString("ru")}
          </p>
        )}

        {/* Usage */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Использовано</span>
            <span className="font-medium text-gray-700">{sub.minutes_used} / {sub.minutes_limit} мин</span>
          </div>
          <div className="w-full bg-surface-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-gradient-to-r from-primary-500 to-accent-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{usagePercent}% использовано</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => navigate("/pricing")} className="btn-primary flex-1 text-sm">
            {sub.plan === "free" ? "Улучшить план" : "Сменить план"}
          </button>
          {sub.status === "active" && sub.plan !== "free" && (
            <button onClick={handleCancel} disabled={cancelling} className="btn-secondary text-sm !px-5">
              {cancelling ? "Отмена..." : "Отменить"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

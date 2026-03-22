import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { transcriptionApi, type TranscriptionListItem } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";

const STATUS_LABELS: Record<string, string> = {
  queued: "В очереди",
  processing: "Обработка",
  completed: "Готово",
  failed: "Ошибка",
};

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<TranscriptionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadTranscriptions = async () => {
    setLoading(true);
    try {
      const { data } = await transcriptionApi.list();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить транскрипцию?")) return;
    await transcriptionApi.delete(id);
    loadTranscriptions();
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div>
      {/* Usage meter */}
      {user && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Использовано: {user.minutes_used} из {user.minutes_limit} мин
            </span>
            <span className="font-medium">
              Тариф: {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all"
              style={{
                width: `${Math.min((user.minutes_used / user.minutes_limit) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Мои транскрипции{" "}
          <span className="text-gray-400 font-normal text-lg">({total})</span>
        </h1>
        <Link
          to="/upload"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          Загрузить файл
        </Link>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-500">Загрузка...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Нет транскрипций</p>
          <Link to="/upload" className="text-primary-600 hover:underline">
            Загрузите первый файл
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition"
            >
              <Link to={`/transcription/${item.id}`} className="flex-1">
                <h3 className="font-medium">{item.title}</h3>
                <div className="text-sm text-gray-500 mt-1 flex gap-3">
                  <span>{new Date(item.created_at).toLocaleDateString("ru")}</span>
                  <span>{formatDuration(item.duration_sec)}</span>
                  {item.language && <span>{item.language.toUpperCase()}</span>}
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[item.status] || ""}`}
                >
                  {STATUS_LABELS[item.status] || item.status}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

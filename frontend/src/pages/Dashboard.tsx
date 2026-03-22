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

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Мои транскрипции</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total > 0 ? `${total} записей` : "Загрузите первый файл для расшифровки"}
          </p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Загрузить
        </Link>
      </div>

      {/* Usage card */}
      {user && (
        <div className="card p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Использование</span>
            <span className="text-sm text-gray-500">
              {user.minutes_used} из {user.minutes_limit} мин
            </span>
          </div>
          <div className="w-full bg-surface-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((user.minutes_used / user.minutes_limit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-surface-100 rounded-full w-1/3 mb-3" />
              <div className="h-3 bg-surface-100 rounded-full w-1/5" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Пока пусто</h3>
          <p className="text-gray-500 mb-6">Загрузите аудио или видео для транскрибации</p>
          <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Загрузить файл
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="card-hover p-5 flex items-center gap-4 animate-fade-in"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>

              {/* Content */}
              <Link to={`/transcription/${item.id}`} className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                  <span>{new Date(item.created_at).toLocaleDateString("ru")}</span>
                  <span>{formatDuration(item.duration_sec)}</span>
                  {item.language && <span className="uppercase">{item.language}</span>}
                </div>
              </Link>

              {/* Status + actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`badge border ${STATUS_STYLES[item.status] || ""}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

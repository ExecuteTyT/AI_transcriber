import { useEffect, useMemo, useState } from "react";
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
  queued: "bg-amber-50 text-amber-600",
  processing: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  failed: "bg-red-50 text-red-600",
};

const STATUS_DOT: Record<string, string> = {
  queued: "bg-amber-400",
  processing: "bg-blue-400 animate-pulse",
  completed: "bg-emerald-400",
  failed: "bg-red-400",
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<TranscriptionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadTranscriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await transcriptionApi.list();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("Не удалось загрузить список транскрипций");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить "${title}"?`)) return;
    setDeletingId(id);
    try {
      await transcriptionApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      setError("Не удалось удалить транскрипцию");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Сегодня";
    if (days === 1) return "Вчера";
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.original_filename.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="animate-fade-up">
      {/* Welcome header */}
      <div className="mb-8 md:mb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <p className="text-sm font-medium text-primary-500 mb-1">
              {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              {user?.name ? `Привет, ${user.name.split(" ")[0]}` : "Транскрипции"}
            </h1>
          </div>
          <Link to="/upload" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Загрузить
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {user && total > 0 && (
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Записей</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Потрачено</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{user.minutes_used}<span className="text-sm font-normal text-gray-400 ml-1">мин</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Осталось</p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums">
              <span className="gradient-text">{Math.max(0, user.minutes_limit - user.minutes_used)}</span>
              <span className="text-sm font-normal text-gray-400 ml-1">мин</span>
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-11 !py-2.5 !bg-white !border-gray-100 focus:!bg-white focus:!border-primary-300"
            aria-label="Поиск транскрипций"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 px-5 py-4 rounded-2xl text-sm border border-red-100 mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadTranscriptions} className="text-red-700 hover:underline font-medium ml-4">Повторить</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-white border border-gray-100 animate-pulse flex items-center gap-4" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded-lg w-2/5 mb-2.5" />
                <div className="h-3 bg-gray-50 rounded-lg w-1/4" />
              </div>
              <div className="w-16 h-6 bg-gray-50 rounded-full" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 && items.length === 0 ? (
        /* Empty state */
        <div className="relative text-center py-16 md:py-24">
          {/* Glow background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-primary-500/5 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Начните с первой записи</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Загрузите аудио или видео — AI превратит его в текст с саммари, тезисами и action items за пару минут
            </p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2 !px-8 !py-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Загрузить файл
            </Link>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="text-center text-gray-400 py-16">Ничего не найдено</p>
      ) : (
        /* Transcription list */
        <div className="space-y-1.5">
          {filteredItems.map((item, idx) => (
            <Link
              key={item.id}
              to={`/transcription/${item.id}`}
              className="group flex items-center gap-3 md:gap-4 p-3.5 md:p-4 rounded-2xl bg-white border border-gray-100 hover:border-primary-100 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_4px_24px_-4px_rgba(99,102,241,0.1)] transition-all duration-300 animate-fade-up"
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 flex items-center justify-center flex-shrink-0 group-hover:from-primary-100 group-hover:to-primary-50 transition-all duration-300">
                {item.status === "processing" ? (
                  <svg className="w-5 h-5 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate text-sm group-hover:text-primary-700 transition-colors duration-200">{item.title}</h3>
                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                  <span>{formatDate(item.created_at)}</span>
                  {formatDuration(item.duration_sec) && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                      <span>{formatDuration(item.duration_sec)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status + Delete */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${STATUS_STYLES[item.status] || ""}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status] || ""}`} />
                  <span className="hidden sm:inline">{STATUS_LABELS[item.status] || item.status}</span>
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(item.id, item.title); }}
                  disabled={deletingId === item.id}
                  className="p-2.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 disabled:opacity-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Удалить ${item.title}`}
                >
                  {deletingId === item.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  )}
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

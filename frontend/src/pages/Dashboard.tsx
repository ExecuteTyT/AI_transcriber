import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, MoreVertical, Plus, Search, Trash2, Mic } from "lucide-react";
import { toast } from "sonner";
import { transcriptionApi, type TranscriptionListItem } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";
import IconButton from "@/components/ui/IconButton";
import MobileSheet from "@/components/ui/MobileSheet";
import Skeleton from "@/components/ui/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  queued: "Очередь",
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionItem, setActionItem] = useState<TranscriptionListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TranscriptionListItem | null>(null);

  const loadTranscriptions = async () => {
    setLoading(true);
    try {
      const { data } = await transcriptionApi.list();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error("Не удалось загрузить список транскрипций");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const handleDelete = async (item: TranscriptionListItem) => {
    setDeleteConfirm(null);
    setActionItem(null);
    setDeletingId(item.id);
    try {
      await transcriptionApi.delete(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((prev) => prev - 1);
      toast.success(`"${item.title}" удалена`);
    } catch {
      toast.error("Не удалось удалить транскрипцию");
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
      <div className="mb-6 md:mb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <p className="text-sm font-medium text-primary-500 mb-1">
              {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">
              {user?.name ? `Привет, ${user.name.split(" ")[0]}` : "Транскрипции"}
            </h1>
          </div>
          {/* Desktop-only upload button (mobile uses FAB in tab bar) */}
          <Link to="/upload" className="hidden sm:flex btn-primary items-center gap-2">
            <Plus className="w-4 h-4" />
            Загрузить
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {user && total > 0 && (
        <div className="grid grid-cols-3 gap-1.5 xs:gap-2.5 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-xl xs:rounded-2xl border border-gray-100 p-2.5 xs:p-4 md:p-5 overflow-hidden">
            <p className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5 truncate">Записей</p>
            <p className="text-lg xs:text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{total}</p>
          </div>
          <div className="bg-white rounded-xl xs:rounded-2xl border border-gray-100 p-2.5 xs:p-4 md:p-5 overflow-hidden">
            <p className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5 truncate">Потрачено</p>
            <p className="text-lg xs:text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{user.minutes_used}<span className="text-[10px] xs:text-xs font-normal text-gray-400 ml-0.5">мин</span></p>
          </div>
          <div className="bg-white rounded-xl xs:rounded-2xl border border-gray-100 p-2.5 xs:p-4 md:p-5 overflow-hidden">
            <p className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5 truncate">Осталось</p>
            <p className="text-lg xs:text-2xl md:text-3xl font-bold tabular-nums">
              <span className="gradient-text">{Math.max(0, user.minutes_limit - user.minutes_used)}</span>
              <span className="text-[10px] xs:text-xs font-normal text-gray-400 ml-0.5">мин</span>
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-11 !py-3 !bg-white !border-gray-100 focus:!bg-white focus:!border-primary-300"
            aria-label="Поиск транскрипций"
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-white border border-gray-100 flex items-center gap-4">
              <Skeleton variant="rect" className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" />
                <Skeleton width="30%" className="h-3" />
              </div>
              <Skeleton variant="rect" className="w-16 h-6 rounded-full" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 && items.length === 0 ? (
        /* Empty state */
        <div className="relative text-center py-12 md:py-24">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-primary-500/5 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow">
              <Mic className="w-9 h-9 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Начните с первой записи</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Загрузите аудио или видео — AI превратит его в текст с саммари, тезисами и action items за пару минут
            </p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2 !px-8">
              <Plus className="w-5 h-5" />
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
            <div
              key={item.id}
              className="group flex items-center gap-3 md:gap-4 rounded-2xl bg-white border border-gray-100 hover:border-primary-100 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_4px_24px_-4px_rgba(99,102,241,0.1)] transition-all duration-300 animate-fade-up"
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <Link
                to={`/transcription/${item.id}`}
                className="flex items-center gap-3 md:gap-4 p-3.5 md:p-4 flex-1 min-w-0"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 flex items-center justify-center flex-shrink-0 group-hover:from-primary-100 group-hover:to-primary-50 transition-all duration-300">
                  {item.status === "processing" ? (
                    <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5 text-primary-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate text-[15px] group-hover:text-primary-700 transition-colors duration-200">
                    {item.title}
                  </h3>
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

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0 ${STATUS_STYLES[item.status] || ""}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status] || ""}`} />
                  <span className="hidden xs:inline">{STATUS_LABELS[item.status] || item.status}</span>
                </span>
              </Link>

              {/* Actions button — always visible on mobile, hover on desktop */}
              <div className="pr-2 md:pr-3 flex-shrink-0">
                <IconButton
                  aria-label={`Действия: ${item.title}`}
                  className="md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  onClick={() => setActionItem(item)}
                >
                  <MoreVertical className="w-5 h-5" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row actions sheet */}
      <MobileSheet
        open={!!actionItem}
        onClose={() => setActionItem(null)}
        title={actionItem?.title}
      >
        {actionItem && (
          <div className="space-y-1">
            <Link
              to={`/transcription/${actionItem.id}`}
              onClick={() => setActionItem(null)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-target"
            >
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-[15px] font-medium">Открыть</span>
            </Link>
            <button
              onClick={() => {
                setDeleteConfirm(actionItem);
                setActionItem(null);
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors w-full touch-target"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[15px] font-medium">Удалить</span>
            </button>
          </div>
        )}
      </MobileSheet>

      {/* Delete confirmation sheet */}
      <MobileSheet
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Удалить транскрипцию?"
      >
        {deleteConfirm && (
          <div>
            <p className="text-gray-500 mb-4">
              «{deleteConfirm.title}» будет удалена без возможности восстановления.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deletingId === deleteConfirm.id}
                className="btn-primary !bg-red-600 hover:!bg-red-500 active:!bg-red-700 flex-1 !shadow-none"
              >
                {deletingId === deleteConfirm.id ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        )}
      </MobileSheet>
    </div>
  );
}

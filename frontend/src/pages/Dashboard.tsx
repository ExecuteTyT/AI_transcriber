import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Mic, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { transcriptionApi, type TranscriptionListItem } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";
import MobileSheet from "@/components/ui/MobileSheet";
import { Icon } from "@/components/Icon";
import { UsageCard } from "@/components/dashboard/UsageCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TranscriptionRow } from "@/components/dashboard/TranscriptionListItem";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingRows } from "@/components/states/LoadingState";
import { fadeUp, staggerChildren } from "@/lib/motion";

const PLAN_NAMES: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };

type FilterKey = "all" | "active" | "completed";

export default function Dashboard() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<TranscriptionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
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
      toast.success(`«${item.title}» удалена`);
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
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "active" && item.status !== "queued" && item.status !== "processing")
        return false;
      if (filter === "completed" && item.status !== "completed") return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.original_filename.toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const firstName = user?.name ? user.name.split(" ")[0] : null;
  const lastCompleted = items.find((i) => i.status === "completed");
  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <motion.div variants={staggerChildren(0.06)} initial="hidden" animate="visible" className="space-y-6">
      <motion.header variants={fadeUp} className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-500">
            {today}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {firstName ? `Привет, ${firstName}` : "Добро пожаловать"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {total > 0
              ? `У вас ${total} ${pluralize(total, ["запись", "записи", "записей"])}`
              : "Давайте превратим первую запись в текст"}
          </p>
        </div>
        <Link
          to="/upload"
          className="hidden sm:inline-flex btn-primary items-center gap-2"
        >
          <Icon icon={Plus} size={16} strokeWidth={2.25} />
          Загрузить
        </Link>
      </motion.header>

      {user && (
        <UsageCard
          minutesUsed={user.minutes_used}
          minutesLimit={user.minutes_limit}
          planName={PLAN_NAMES[user.plan] || user.plan}
          totalRecords={total}
        />
      )}

      <QuickActions
        lastTranscriptionId={lastCompleted?.id ?? null}
        canExport={items.some((i) => i.status === "completed")}
      />

      {items.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold tracking-tight text-gray-900 md:text-lg">
              История
            </h2>
            <div className="flex gap-1 rounded-full bg-surface-100 p-0.5 text-xs font-semibold text-gray-500">
              {(
                [
                  { key: "all" as const, label: "Все" },
                  { key: "active" as const, label: "В работе" },
                  { key: "completed" as const, label: "Готово" },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilter(opt.key)}
                  className={`rounded-full px-3 py-1 transition-colors duration-fast ${
                    filter === opt.key
                      ? "bg-white text-gray-900 shadow-card"
                      : "hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Icon
              icon={Search}
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              placeholder="Найти по названию или файлу…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !pl-11 !py-3 !bg-white"
              aria-label="Поиск транскрипций"
            />
          </div>
        </motion.div>
      )}

      {loading ? (
        <LoadingRows count={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="Начните с первой записи"
          description="Загрузите аудио или видео — AI превратит его в текст с саммари, тезисами и задачами за пару минут."
          action={
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2 !px-7">
              <Icon icon={Plus} size={18} strokeWidth={2.25} />
              Загрузить файл
            </Link>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Search}
          compact
          title="Ничего не найдено"
          description="Попробуйте изменить фильтр или поисковый запрос."
        />
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item, idx) => (
            <TranscriptionRow
              key={item.id}
              item={item}
              index={idx}
              formatDuration={formatDuration}
              formatDate={formatDate}
              onAction={setActionItem}
            />
          ))}
        </div>
      )}

      <MobileSheet open={!!actionItem} onClose={() => setActionItem(null)} title={actionItem?.title}>
        {actionItem && (
          <div className="space-y-1">
            <Link
              to={`/transcription/${actionItem.id}`}
              onClick={() => setActionItem(null)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-target"
            >
              <Icon icon={FileText} size={18} className="text-gray-400" />
              <span className="text-[15px] font-medium">Открыть</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirm(actionItem);
                setActionItem(null);
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors w-full touch-target"
            >
              <Icon icon={Trash2} size={18} />
              <span className="text-[15px] font-medium">Удалить</span>
            </button>
          </div>
        )}
      </MobileSheet>

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
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deletingId === deleteConfirm.id}
                className="btn-primary !bg-red-600 hover:!bg-red-500 active:!bg-red-700 flex-1 !shadow-none"
              >
                {deletingId === deleteConfirm.id ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        )}
      </MobileSheet>
    </motion.div>
  );
}

function pluralize(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

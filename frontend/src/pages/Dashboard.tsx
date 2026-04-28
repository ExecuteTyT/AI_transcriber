import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, FileText, Mic, Plus, RotateCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSound } from "@/lib/sound";
import { transcriptionApi, type TranscriptionListItem } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";
import MobileSheet from "@/components/ui/MobileSheet";
import { Icon } from "@/components/Icon";
import { UsageCard } from "@/components/dashboard/UsageCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TranscriptionRow } from "@/components/dashboard/TranscriptionListItem";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingRows } from "@/components/states/LoadingState";
import { fadeUp, staggerChildren, springTight } from "@/lib/motion";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";
import { cn } from "@/lib/cn";
import Seo from "@/components/Seo";

const PLAN_NAMES: Record<string, string> = { free: "Free", start: "Старт", pro: "Про", business: "Бизнес", premium: "Премиум" };

type FilterKey = "all" | "active" | "completed";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { play } = useSound();
  const [items, setItems] = useState<TranscriptionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [actionItem, setActionItem] = useState<TranscriptionListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TranscriptionListItem | null>(null);
  const firstLoadRef = useRef(true);

  const loadTranscriptions = useCallback(async (background = false) => {
    if (!background) setRefreshing(true);
    try {
      const { data } = await transcriptionApi.list();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      if (!background) toast.error("Не удалось загрузить список транскрипций");
    } finally {
      if (firstLoadRef.current) {
        setLoading(false);
        firstLoadRef.current = false;
      }
      if (!background) setRefreshing(false);
    }
  }, []);

  useVisibilityPolling(
    useCallback(() => {
      void loadTranscriptions(true);
    }, [loadTranscriptions]),
    { interval: 30000, immediate: true }
  );

  const handleManualRefresh = () => {
    if (refreshing) return;
    void loadTranscriptions(false);
  };

  const handleDelete = async (item: TranscriptionListItem) => {
    setDeleteConfirm(null);
    setActionItem(null);
    setDeletingId(item.id);
    try {
      await transcriptionApi.delete(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((prev) => prev - 1);
      toast.success(`«${item.title}» удалена`);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const detail = axiosErr.response?.data?.detail;
      const status = axiosErr.response?.status;
      if (status === 404) {
        // Уже удалено в другой вкладке — синхронизируем UI без ошибки.
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setTotal((prev) => Math.max(0, prev - 1));
        toast.success(`«${item.title}» удалена`);
      } else {
        toast.error(detail || `Не удалось удалить (код ${status ?? "сети"})`);
      }
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
    <motion.div variants={staggerChildren(0.06)} initial="hidden" animate="visible" className="space-y-8 md:space-y-10">
      <Seo title="Мои транскрипции — Dicto" noindex />
      <motion.header variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            {today}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.02em] text-[var(--fg)]">
            {firstName ? <>Привет, <em className="italic text-[var(--accent)]">{firstName}</em></> : "Добро пожаловать"}
          </h1>
          <p className="mt-3 text-[14px] text-[var(--fg-muted)] leading-[1.5]">
            {total > 0
              ? `${total} ${pluralize(total, ["запись", "записи", "записей"])} в вашей истории`
              : "Давайте превратим первую запись в текст"}
          </p>
        </div>
        <Link
          to="/upload"
          onClick={() => play("tick")}
          className="hidden sm:inline-flex btn-accent items-center gap-2"
        >
          <Icon icon={Plus} size={15} strokeWidth={2} />
          Загрузить
        </Link>
      </motion.header>

      {user && (
        <UsageCard
          minutesUsed={user.minutes_used}
          minutesLimit={user.minutes_limit}
          bonusMinutes={user.bonus_minutes ?? 0}
          planName={PLAN_NAMES[user.plan] || user.plan}
          totalRecords={total}
        />
      )}

      <QuickActions
        lastTranscriptionId={lastCompleted?.id ?? null}
        canExport={items.some((i) => i.status === "completed")}
      />

      {items.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                /история
              </p>
              <motion.button
                type="button"
                onClick={handleManualRefresh}
                whileTap={{ scale: 0.9 }}
                transition={springTight}
                disabled={refreshing}
                aria-label="Обновить список"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[var(--fg-subtle)] transition-colors duration-fast hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]",
                  refreshing && "pointer-events-none text-[var(--accent)]"
                )}
              >
                <Icon
                  icon={RotateCw}
                  size={13}
                  strokeWidth={1.75}
                  className={cn("transition-transform", refreshing && "animate-spin")}
                />
              </motion.button>
            </div>
            <div className="flex gap-px rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-[3px] font-mono text-[10px] uppercase tracking-[0.14em]">
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
                  onClick={() => {
                    play("focus");
                    setFilter(opt.key);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition-colors duration-fast",
                    filter === opt.key
                      ? "bg-[var(--highlight-bg)] text-[var(--highlight-fg)]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Icon
              icon={Search}
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]"
            />
            <input
              type="search"
              placeholder="Найти по названию или файлу…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-11 py-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
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
            <Link to="/upload" onClick={() => play("tick")} className="btn-accent inline-flex items-center gap-2">
              <Icon icon={Plus} size={16} strokeWidth={2} />
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
        <div className="border-t border-[var(--border)]">
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

      {user && user.data_retention_days != null && items.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3"
        >
          <Icon icon={Clock} size={14} className="flex-shrink-0 text-[var(--fg-subtle)]" />
          <span className="flex-1 text-[12px] text-[var(--fg-muted)]">
            По истечении{" "}
            <span className="font-medium text-[var(--fg)] tabular">{user.data_retention_days}</span>{" "}
            {pluralizeDays(user.data_retention_days)} данные безвозвратно удаляются
          </span>
          <Link
            to="/profile"
            onClick={() => play("focus")}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] hover:text-[var(--accent)] transition-colors"
          >
            Настроить →
          </Link>
        </motion.div>
      )}

      <MobileSheet open={!!actionItem} onClose={() => setActionItem(null)} title={actionItem?.title}>
        {actionItem && (
          <div className="space-y-1">
            <Link
              to={`/transcription/${actionItem.id}`}
              onClick={() => {
                play("tick");
                setActionItem(null);
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors touch-target"
            >
              <Icon icon={FileText} size={18} className="text-[var(--fg-subtle)]" />
              <span className="text-[15px] font-medium">Открыть</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirm(actionItem);
                setActionItem(null);
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors w-full touch-target"
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
            <p className="text-[14px] text-[var(--fg-muted)] mb-5 leading-[1.5]">
              «{deleteConfirm.title}» будет удалена без возможности восстановления.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="btn-editorial-ghost flex-1 justify-center"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deletingId === deleteConfirm.id}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500/90 px-5 py-3 text-[14px] font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
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

function pluralizeDays(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "дней";
  if (b > 1 && b < 5) return "дня";
  if (b === 1) return "день";
  return "дней";
}

function pluralize(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

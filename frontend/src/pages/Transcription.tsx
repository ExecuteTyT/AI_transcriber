import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  MessagesSquare,
  Pencil,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  transcriptionApi,
  type Transcription as TranscriptionType,
  type AiAnalysis,
  type ChatMessage as ChatMessageType,
} from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";
import MarkdownContent from "@/components/MarkdownContent";
import IconButton from "@/components/ui/IconButton";
import MobileSheet from "@/components/ui/MobileSheet";
import { Icon } from "@/components/Icon";
import { LockedState } from "@/components/states/LockedState";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { AudioPlayerBar } from "@/components/transcription/AudioPlayerBar";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { fadeUp, springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";
import Seo from "@/components/Seo";

// Editorial dark speaker palette — мягкие тона на ink, хорошо читаются.
const SPEAKER_COLORS = [
  "bg-blue-500/15 text-blue-300 ring-blue-500/25",
  "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  "bg-pink-500/15 text-pink-300 ring-pink-500/25",
  "bg-teal-500/15 text-teal-300 ring-teal-500/25",
];
const SPEAKER_DOT = [
  "bg-blue-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-pink-400",
  "bg-teal-400",
];
const SPEAKER_BORDER = [
  "border-l-blue-400/60",
  "border-l-violet-400/60",
  "border-l-amber-400/60",
  "border-l-emerald-400/60",
  "border-l-pink-400/60",
  "border-l-teal-400/60",
];

type Tab = "transcript" | "summary" | "key_points" | "action_items" | "chat";

const TABS: { key: Tab; label: string; proOnly?: boolean }[] = [
  { key: "transcript", label: "Транскрипт" },
  { key: "summary", label: "Саммари" },
  { key: "key_points", label: "Тезисы" },
  { key: "action_items", label: "Задачи", proOnly: true },
  { key: "chat", label: "Чат" },
];

export default function Transcription() {
  const { id } = useParams<{ id: string }>();
  const userPlan = useAuthStore((s) => s.user?.plan);
  const actionItemsLocked = userPlan === "free" || userPlan === "start";

  const [transcription, setTranscription] = useState<TranscriptionType | null>(null);
  const [tab, setTab] = useState<Tab>("transcript");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<{ status: number; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ status: number; detail?: string } | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRemaining, setChatRemaining] = useState<number>(-1);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string> | null>(null);
  const [renamingSpeaker, setRenamingSpeaker] = useState<string | null>(null);

  const [exportSheetOpen, setExportSheetOpen] = useState(false);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioUrlFetchedAt, setAudioUrlFetchedAt] = useState<number>(0);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  // 152-ФЗ: ползунок срока хранения аудио на карточке транскрипции.
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [audioDeleting, setAudioDeleting] = useState(false);
  // Сколько раз уже пробовали восстановить URL для текущей ошибки. Сбрасывается
  // при успешной загрузке (loadedmetadata в useAudioPlayer чистит error → этот
  // ref сбросится). Лимит — 1, иначе отсутствующий S3-объект превращается в
  // бесконечный refetch-loop.
  const retryAttemptsRef = useRef(0);
  const player = useAudioPlayer(audioUrl);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll] = useState(true);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 600;

  useEffect(() => {
    if (!id) return;
    pollCountRef.current = 0;
    setLoadError(null);
    setPollingTimedOut(false);
    let consecutivePollFailures = 0;
    const load = async () => {
      try {
        const { data } = await transcriptionApi.getById(id);
        setTranscription(data);
        if (data.audio_retention_days) {
          setRetentionDays(data.audio_retention_days);
        }
        setLoading(false);
        if (data.status === "queued" || data.status === "processing") {
          pollingRef.current = setInterval(async () => {
            pollCountRef.current += 1;
            if (pollCountRef.current > MAX_POLLS) {
              // 600 × 3s = 30 минут. Если за это время не завершилось,
              // показываем явное сообщение вместо вечного спиннера.
              if (pollingRef.current) clearInterval(pollingRef.current);
              setPollingTimedOut(true);
              return;
            }
            try {
              const { data: updated } = await transcriptionApi.getById(id);
              consecutivePollFailures = 0;
              setTranscription(updated);
              if (updated.status === "completed" || updated.status === "failed") {
                if (pollingRef.current) clearInterval(pollingRef.current);
                if (updated.status === "completed") {
                  useAuthStore.getState().loadUser();
                }
              }
            } catch (err) {
              consecutivePollFailures += 1;
              // 3 подряд неудачных опроса (≈ 9 секунд) — выдаём явный сигнал.
              // Раньше любая 401/500 затихала, юзер видел "В очереди" вечно.
              if (consecutivePollFailures >= 3) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                setPollingTimedOut(true);
                // eslint-disable-next-line no-console
                console.error("[transcription] polling failed:", err);
              }
            }
          }, 3000);
        }
      } catch (err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        setLoadError({
          status: axiosErr.response?.status ?? 0,
          detail: axiosErr.response?.data?.detail,
        });
        setLoading(false);
      }
    };
    load();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (!id || tab === "transcript" || tab === "chat") {
      setAnalysis(null);
      setAnalysisError(null);
      return;
    }
    setAnalysisLoading(true);
    setAnalysisError(null);
    const fetchers: Record<string, (id: string) => ReturnType<typeof transcriptionApi.getSummary>> = {
      summary: transcriptionApi.getSummary,
      key_points: transcriptionApi.getKeyPoints,
      action_items: transcriptionApi.getActionItems,
    };
    const fetchAnalysis = fetchers[tab];
    if (!fetchAnalysis) return;
    fetchAnalysis(id)
      .then(({ data }) => setAnalysis(data))
      .catch((err: unknown) => {
        setAnalysis(null);
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        const status = axiosErr.response?.status || 0;
        const message = axiosErr.response?.data?.detail || "";
        if (status === 403 && message) setAnalysisError({ status, message });
      })
      .finally(() => setAnalysisLoading(false));
  }, [id, tab]);

  useEffect(() => {
    if (!id || tab !== "chat") return;
    transcriptionApi
      .getChatHistory(id)
      .then(({ data }) => {
        setChatMessages(data.messages);
        setChatRemaining(data.remaining_questions);
        setChatError("");
      })
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        const status = axiosErr.response?.status;
        // 404 — у транскрипции просто ещё нет истории, не ошибка.
        if (status === 404) return;
        const detail = axiosErr.response?.data?.detail;
        setChatError(detail || "Не удалось загрузить историю чата");
        // eslint-disable-next-line no-console
        console.error("[chat] history load failed:", err);
      });
  }, [id, tab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (!id || !transcription || transcription.status !== "completed") return;
    let cancelled = false;
    transcriptionApi
      .getAudioUrl(id)
      .then(({ data }) => {
        if (!cancelled) {
          setAudioUrl(data.url);
          setAudioUrlFetchedAt(Date.now());
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 410 Gone — файл удалён по retention TTL. 404 — нет file_key.
        // 503 — S3 временно недоступен. Любая другая — токен/доступ.
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        const status = axiosErr.response?.status;
        if (status === 410 || status === 404) {
          setAudioUnavailable(true);
        } else if (status === 503) {
          // временная — пусть refetch-effect попробует ещё раз позже
          // eslint-disable-next-line no-console
          console.warn("[audio] storage temporarily unavailable, will retry");
        } else {
          // eslint-disable-next-line no-console
          console.error("[audio] initial URL fetch failed:", axiosErr.response?.data?.detail || err);
          setAudioUnavailable(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, transcription?.status]);

  // Presigned URL живёт 6ч, проактивный refresh за 50 мин до истечения и при
  // <audio> error. Жёсткий лимит 1 ретрай за сессию ошибки — иначе если файл
  // отсутствует на S3 (404 NoSuchKey), error будет фигачиться бесконечно и
  // мы зациклимся на refetch'ах.
  useEffect(() => {
    if (!id || !transcription || transcription.status !== "completed") return;
    if (!audioUrl || audioUnavailable) return;

    const STALE_MS = 50 * 60 * 1000;
    const stale = Date.now() - audioUrlFetchedAt > STALE_MS;
    const isError = !!player.error;
    const needsRefresh = isError || stale;
    if (!needsRefresh) return;

    // На ошибке пробуем ровно один раз — повторный error значит, что URL
    // успешно перевыпустили, но файл реально не играется. Дальше показываем UI.
    if (isError) {
      if (retryAttemptsRef.current >= 1) {
        setAudioUnavailable(true);
        // MediaError.code: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED.
        // SRC_NOT_SUPPORTED обычно означает что в файле нет аудио-дорожки
        // (загружен видео-файл без звука) или браузер не знает кодек.
        const code = player.error?.code;
        if (code === 4 /* MEDIA_ERR_SRC_NOT_SUPPORTED */) {
          toast.error("Файл не содержит совместимой аудиодорожки");
        } else if (code === 3 /* MEDIA_ERR_DECODE */) {
          toast.error("Не удалось декодировать аудио");
        } else {
          toast.error("Аудиофайл недоступен");
        }
        return;
      }
      retryAttemptsRef.current += 1;
    } else {
      // stale-refresh не считается попыткой восстановления.
      retryAttemptsRef.current = 0;
    }

    const wasPlaying = player.isPlaying;
    const resumeAt = player.currentTime;

    let cancelled = false;
    transcriptionApi
      .getAudioUrl(id)
      .then(({ data }) => {
        if (cancelled) return;
        setAudioUrl(data.url);
        setAudioUrlFetchedAt(Date.now());
        if (isError) {
          toast.message("Аудио переподключено");
        }
        const audio = player.audioRef.current;
        if (!audio) return;
        const onReady = () => {
          audio.currentTime = resumeAt;
          if (wasPlaying) {
            audio.play().catch((playErr) => {
              // Если повторный URL загрузился, но play() rejects (autoplay
              // policy / NotSupported / decode error на новом URL) — нужно
              // дать пользователю сигнал, иначе он будет тыкать кнопку Play
              // молча.
              // eslint-disable-next-line no-console
              console.error("[audio] resume after refresh failed:", playErr);
              toast.error("Не удалось возобновить — нажмите Play");
            });
          }
          audio.removeEventListener("loadedmetadata", onReady);
        };
        audio.addEventListener("loadedmetadata", onReady);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const axiosErr = err as { response?: { status?: number } };
        // 404/410 от бэкенда → файла нет физически, дальнейшие попытки бессмысленны
        if (axiosErr.response?.status === 404 || axiosErr.response?.status === 410) {
          setAudioUnavailable(true);
          toast.error("Аудиофайл недоступен");
        } else if (isError) {
          toast.error("Не удалось загрузить аудио");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, transcription?.status, player.error, audioUrl, audioUrlFetchedAt, audioUnavailable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Намеренно НЕ сбрасываем retryAttemptsRef в отдельном эффекте на смену URL.
  // Любой такой "reset on clear state" срабатывает в момент между setAudioUrl
  // и следующей ошибкой (useAudioPlayer чистит error при смене src), и если
  // новый URL тоже падает — мы получаем infinite refetch. Достаточно того,
  // что stale-path в основном эффекте уже сбрасывает счётчик при 50-мин
  // обновлении (это покрывает long-running сессии после восстановления).

  const lastScrolledRef = useRef<number>(-1);
  useEffect(() => {
    if (!audioUrl || !autoScroll) return;
    const segs = transcription?.segments;
    if (!segs) return;
    const idx = segs.findIndex(
      (s) => player.currentTime >= s.start && player.currentTime < s.end
    );
    if (idx === -1 || idx === lastScrolledRef.current) return;
    lastScrolledRef.current = idx;
    const start = segs[idx].start;
    const container = transcriptContainerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(
      `[data-seg-start="${start}"]`
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [player.currentTime, audioUrl, autoScroll, transcription?.segments]);

  const uniqueSpeakers = useMemo(() => {
    const speakers: string[] = [];
    for (const seg of transcription?.segments || []) {
      if (seg.speaker && !speakers.includes(seg.speaker)) speakers.push(seg.speaker);
    }
    return speakers;
  }, [transcription?.segments]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // 152-ФЗ: сохранение нового срока хранения аудио для этой транскрипции.
  const handleRetentionSave = async () => {
    if (!id) return;
    setRetentionSaving(true);
    try {
      await transcriptionApi.updateRetention(id, retentionDays);
      // Обновляем audio_delete_at локально (бэк пересчитал = now + N дней).
      const newDeleteAt = new Date(Date.now() + retentionDays * 86400000).toISOString();
      setTranscription((prev) =>
        prev ? { ...prev, audio_retention_days: retentionDays, audio_delete_at: newDeleteAt } : prev,
      );
      toast.success(`Срок хранения: ${retentionDays} дн.`);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast.error(axiosErr.response?.data?.detail || "Не удалось изменить срок");
    } finally {
      setRetentionSaving(false);
    }
  };

  // 152-ФЗ: ручное удаление только аудио (текст транскрипции остаётся).
  const handleDeleteAudio = async () => {
    if (!id) return;
    if (!confirm("Удалить аудиофайл? Текст транскрипции и анализ останутся доступны.")) return;
    setAudioDeleting(true);
    try {
      await transcriptionApi.deleteAudio(id);
      setAudioUnavailable(true);
      setAudioUrl(null);
      setTranscription((prev) =>
        prev ? { ...prev, audio_deleted_at: new Date().toISOString() } : prev,
      );
      toast.success("Аудиофайл удалён");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast.error(axiosErr.response?.data?.detail || "Не удалось удалить аудио");
    } finally {
      setAudioDeleting(false);
    }
  };

  const getSpeakerStyle = (speaker: string) => {
    const idx = Math.max(0, uniqueSpeakers.indexOf(speaker));
    return {
      chip: SPEAKER_COLORS[idx % SPEAKER_COLORS.length],
      dot: SPEAKER_DOT[idx % SPEAKER_DOT.length],
      border: SPEAKER_BORDER[idx % SPEAKER_BORDER.length],
    };
  };

  const getDisplayName = (speaker: string) => speakerNames[speaker] || speaker;

  const highlightSearch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    );
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="rounded bg-yellow-200/80 px-0.5 text-[var(--fg)]">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const toggleSpeaker = (speaker: string) => {
    setActiveSpeakers((prev) => {
      if (prev === null) {
        const next = new Set(uniqueSpeakers);
        next.delete(speaker);
        return next;
      }
      const next = new Set(prev);
      if (next.has(speaker)) next.delete(speaker);
      else next.add(speaker);
      if (next.size === uniqueSpeakers.length) return null;
      return next;
    });
  };

  const handleRenameSpeaker = (original: string, newName: string) => {
    setSpeakerNames((prev) => ({ ...prev, [original]: newName || original }));
    setRenamingSpeaker(null);
    toast.success(`Спикер переименован: ${newName || original}`);
  };

  const handleSendChat = async () => {
    if (!id || !chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    setChatInput("");
    setChatError("");

    const tempUserMsg: ChatMessageType = {
      id: "temp",
      role: "user",
      content: message,
      references: null,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);
    setChatLoading(true);

    try {
      const { data } = await transcriptionApi.sendChatMessage(id, message);
      setChatMessages((prev) => [
        ...prev.filter((m) => m.id !== "temp"),
        { ...tempUserMsg, id: crypto.randomUUID() },
        data,
      ]);
      if (chatRemaining > 0) setChatRemaining((r) => r - 1);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setChatMessages((prev) => prev.filter((m) => m.id !== "temp"));
      setChatError(axiosErr.response?.data?.detail || "Ошибка отправки сообщения");
    } finally {
      setChatLoading(false);
    }
  };

  const handleCopy = () => {
    if (transcription?.full_text) {
      navigator.clipboard.writeText(transcription.full_text);
      setCopied(true);
      toast.success("Текст скопирован");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = async (format: "txt" | "srt" | "docx") => {
    if (!id) return;
    setExportSheetOpen(false);
    try {
      const { data } = await transcriptionApi.exportFile(id, format);
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${transcription?.title || "export"}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Файл ${format.toUpperCase()} скачан`);
    } catch {
      toast.error("Не удалось скачать файл");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-2/5 rounded-xl bg-[var(--bg-muted)]" />
        <div className="h-4 w-1/4 rounded-xl bg-[var(--bg-muted)]" />
        <div className="mt-6 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-4 rounded-full bg-[var(--bg-muted)]"
              style={{ width: `${60 + i * 10}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!transcription) {
    // Различаем причины отсутствия данных. 401/403 уже отработал интерсептор
    // (редирект в /login), здесь видим только 404 (нет такой записи или
    // не у этого юзера) или 5xx (сервер не отдал).
    const status = loadError?.status ?? 404;
    const is404 = status === 404 || status === 0;
    return is404 ? (
      <EmptyState
        icon={FileText}
        title="Транскрипция не найдена"
        description="Возможно, она была удалена или ссылка неверна."
        action={
          <Link to="/dashboard" className="btn-accent inline-flex items-center gap-2">
            <Icon icon={ChevronLeft} size={16} />К списку
          </Link>
        }
      />
    ) : (
      <ErrorState
        title="Не удалось загрузить транскрипцию"
        description={loadError?.detail || `Код ошибки: ${status}. Попробуйте обновить страницу.`}
      />
    );
  }

  if (pollingTimedOut && (transcription.status === "queued" || transcription.status === "processing")) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Обработка занимает слишком долго"
          description="Что-то пошло не так на нашей стороне. Обновите страницу или напишите в поддержку — поможем разобраться."
        />
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.reload()} className="btn-accent">
            Обновить
          </button>
          <Link to="/dashboard" className="btn-secondary">
            К списку
          </Link>
        </div>
      </div>
    );
  }

  if (transcription.status === "queued" || transcription.status === "processing") {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center py-16 md:py-24"
      >
        <div className="text-center">
          <div className="relative mx-auto mb-8 h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
              <Icon icon={Loader2} size={22} strokeWidth={1.75} className="animate-spin" />
            </div>
          </div>
          <p className="eyebrow mb-3">
            {transcription.status === "queued" ? "В очереди" : "Обработка"}
          </p>
          <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-[-0.01em] text-[var(--fg)] mb-2">
            {transcription.status === "queued" ? "Скоро начнём" : "Расшифровываем"}
          </h2>
          <p className="text-sm text-[var(--fg-muted)]">{transcription.original_filename}</p>
          <p className="mt-2 text-xs text-[var(--fg-subtle)]">Обычно занимает 1–3 минуты</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            <Icon icon={ChevronLeft} size={14} />К списку транскрипций
          </Link>
        </div>
      </motion.div>
    );
  }

  if (transcription.status === "failed") {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Не удалось обработать файл"
          description={transcription.error_message || "Попробуйте загрузить файл заново."}
        />
        <div className="flex items-center gap-3">
          <Link to="/upload" className="btn-accent">
            Загрузить заново
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            К списку
          </Link>
        </div>
      </div>
    );
  }

  const filteredSegments = (transcription.segments || []).filter((seg) => {
    if (search && !seg.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeSpeakers !== null && seg.speaker && !activeSpeakers.has(seg.speaker)) return false;
    return true;
  });

  const audioReady = !!audioUrl && !audioUnavailable;
  const activeSegmentIndex = audioReady
    ? filteredSegments.findIndex(
        (seg) => player.currentTime >= seg.start && player.currentTime < seg.end
      )
    : -1;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-5">
      <Seo title={`${transcription.title || "Транскрипция"} — Dicto`} noindex />
      {audioUrl && !audioUnavailable && (
        <AudioPlayerBar
          src={audioUrl}
          segments={transcription.segments}
          currentTime={player.currentTime}
          duration={player.duration || transcription.duration_sec || 0}
          isPlaying={player.isPlaying}
          rate={player.rate}
          onToggle={player.toggle}
          onSeek={player.seek}
          onSkip={player.skip}
          onRate={player.setRate}
          audioRef={player.audioRef}
        />
      )}
      {audioUnavailable && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-[13px] text-[var(--fg-muted)]">
          Аудиофайл недоступен — он мог быть удалён по сроку хранения. Транскрипт и анализ остались доступны.
        </div>
      )}

      {/* 152-ФЗ: управление сроком хранения аудио на карточке. */}
      {!audioUnavailable && transcription.audio_delete_at && !transcription.audio_deleted_at && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--fg-muted)]">
              <span aria-hidden>🗑</span> Аудиофайл будет удалён{" "}
              <span className="text-[var(--fg)]">
                {new Date(transcription.audio_delete_at).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
            <button
              type="button"
              onClick={handleDeleteAudio}
              disabled={audioDeleting}
              className="text-[12px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {audioDeleting ? "Удаление…" : "Удалить аудио сейчас"}
            </button>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                Срок хранения
              </span>
              <span className="font-display text-base text-[var(--fg)] tabular">
                {retentionDays} дн.
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full cursor-pointer accent-[var(--accent)]"
              aria-label="Срок хранения аудио в днях"
            />
            <button
              type="button"
              onClick={handleRetentionSave}
              disabled={retentionSaving || retentionDays === (transcription.audio_retention_days ?? 7)}
              className="mt-3 inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retentionSaving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      )}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Транскрипция</p>
          <h1 className="font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.01em] text-[var(--fg)] truncate">
            {transcription.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            {transcription.language && (
              <span className="tabular">{transcription.language.toUpperCase()}</span>
            )}
            {transcription.duration_sec && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 tabular">
                  <Icon icon={Clock} size={11} strokeWidth={1.75} />
                  {formatTime(transcription.duration_sec)}
                </span>
              </>
            )}
            {transcription.full_text && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular">{transcription.full_text.split(/\s+/).length} слов</span>
              </>
            )}
            {uniqueSpeakers.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Icon icon={Users} size={11} strokeWidth={1.75} />
                  {uniqueSpeakers.length} спикеров
                </span>
              </>
            )}
          </div>
        </div>

        <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-editorial-ghost !py-2 !px-4 !text-[12px] inline-flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Icon icon={Check} size={13} className="text-[var(--accent)]" /> Скопировано
              </>
            ) : (
              <>
                <Icon icon={Copy} size={13} /> Копировать
              </>
            )}
          </button>
          <button type="button" onClick={() => handleExport("txt")} className="btn-editorial-ghost !py-2 !px-3 !text-[11px] font-mono uppercase tracking-[0.12em]">
            TXT
          </button>
          <button type="button" onClick={() => handleExport("srt")} className="btn-editorial-ghost !py-2 !px-3 !text-[11px] font-mono uppercase tracking-[0.12em]">
            SRT
          </button>
          <button type="button" onClick={() => handleExport("docx")} className="btn-editorial-ghost !py-2 !px-3 !text-[11px] font-mono uppercase tracking-[0.12em]">
            DOCX
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-editorial-ghost flex-1 justify-center inline-flex items-center gap-1.5 !py-2.5 !text-[13px]"
          >
            {copied ? (
              <>
                <Icon icon={Check} size={13} className="text-[var(--accent)]" /> Скопировано
              </>
            ) : (
              <>
                <Icon icon={Copy} size={13} /> Копировать
              </>
            )}
          </button>
          <IconButton aria-label="Экспорт" onClick={() => setExportSheetOpen(true)}>
            <Icon icon={Download} size={16} strokeWidth={1.75} />
          </IconButton>
        </div>
      </header>

      <nav
        aria-label="Разделы транскрипции"
        className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 scrollbar-hide"
      >
        <div className="inline-flex items-center gap-px rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-[3px] font-mono text-[10px] uppercase tracking-[0.14em]">
          {TABS.map(({ key, label, proOnly }) => {
            const locked = proOnly && actionItemsLocked;
            const active = tab === key;
            return (
              <motion.button
                key={key}
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={springTight}
                onClick={() => setTab(key)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 whitespace-nowrap transition-colors duration-fast",
                  active
                    ? ""
                    : locked
                    ? "text-[var(--fg-subtle)]"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                )}
                style={active ? { color: "var(--accent-fg)" } : undefined}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="tab-chip"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "var(--accent)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {locked && !active && <Icon icon={Sparkles} size={11} />}
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {tab === "transcript" && (
          <motion.section
            key="transcript"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="space-y-4"
          >
            {uniqueSpeakers.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
                  Спикеры
                </span>
                {uniqueSpeakers.map((speaker) => {
                  const isActive = activeSpeakers === null || activeSpeakers.has(speaker);
                  const style = getSpeakerStyle(speaker);
                  return (
                    <div key={speaker} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSpeaker(speaker)}
                        className={cn(
                          "inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-all duration-fast press",
                          isActive
                            ? style.chip
                            : "bg-[var(--bg-muted)] text-[var(--fg-subtle)] ring-[var(--border)] opacity-70"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isActive ? style.dot : "bg-[var(--fg-subtle)]"
                          )}
                        />
                        {getDisplayName(speaker)}
                      </button>
                      <IconButton
                        aria-label={`Переименовать ${speaker}`}
                        size="md"
                        className="!min-w-[36px] !min-h-[36px] !p-1.5"
                        onClick={() => setRenamingSpeaker(speaker)}
                      >
                        <Icon icon={Pencil} size={12} />
                      </IconButton>
                    </div>
                  );
                })}
                {activeSpeakers !== null && (
                  <button
                    type="button"
                    onClick={() => setActiveSpeakers(null)}
                    className="ml-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    Показать всех
                  </button>
                )}
              </div>
            )}

            <div className="relative">
              <Icon
                icon={Search}
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]"
              />
              <input
                type="search"
                placeholder="Поиск по тексту…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-11"
              />
            </div>

            <div
              ref={transcriptContainerRef}
              className="space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 md:p-5"
            >
              {filteredSegments.length === 0 ? (
                <EmptyState
                  icon={Search}
                  compact
                  title="Нет совпадений"
                  description="Попробуйте изменить фильтр или запрос."
                />
              ) : (
                filteredSegments.map((seg, i) => {
                  const style = seg.speaker ? getSpeakerStyle(seg.speaker) : null;
                  const isActive = i === activeSegmentIndex;
                  return (
                    <motion.div
                      key={i}
                      data-seg-start={seg.start}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(i * 0.012, 0.3) }}
                      className={cn(
                        "group -mx-2 flex items-start gap-2 rounded-xl px-2 py-2 transition-all duration-fast md:gap-3",
                        style && `border-l-2 ${style.border}`,
                        isActive
                          ? "ring-1 shadow-glow-sm"
                          : "hover:bg-[var(--bg-muted)]"
                      )}
                      style={
                        isActive
                          ? {
                              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                              boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
                            }
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => audioReady && player.seek(seg.start)}
                        className={cn(
                          "w-12 flex-shrink-0 pt-0.5 text-right text-[11px] font-mono tabular transition-colors duration-fast",
                          audioReady ? "cursor-pointer text-[var(--accent)] hover:text-[var(--accent-hover)]" : "text-[var(--fg-subtle)]"
                        )}
                        aria-label={audioReady ? `Перейти к ${formatTime(seg.start)}` : undefined}
                        disabled={!audioReady}
                      >
                        {formatTime(seg.start)}
                      </button>
                      {seg.speaker && style && (
                        <span
                          className={cn(
                            "inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                            style.chip
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                          {getDisplayName(seg.speaker)}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[15px] leading-relaxed",
                          isActive ? "font-medium text-[var(--fg)]" : "text-[var(--fg)]"
                        )}
                      >
                        {highlightSearch(seg.text, search)}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.section>
        )}

        {(tab === "summary" || tab === "key_points" || tab === "action_items") && (
          <motion.section
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          >
            {analysisLoading ? (
              <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 md:p-8">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-4 animate-shimmer rounded-full"
                    style={{
                      background:
                        "linear-gradient(to right, var(--bg-muted) 0%, color-mix(in srgb, var(--accent) 15%, var(--bg-muted)) 50%, var(--bg-muted) 100%)",
                      backgroundSize: "200% 100%",
                      width: `${60 + i * 10}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
                <p className="pt-2 text-xs text-[var(--fg-subtle)]">Генерируем анализ с помощью AI…</p>
              </div>
            ) : analysis ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 md:p-8">
                <MarkdownContent content={analysis.content} />
              </div>
            ) : analysisError ? (
              <LockedState
                title={
                  tab === "action_items"
                    ? "Задачи — в тарифе Про"
                    : "Лимит анализа исчерпан"
                }
                description={analysisError.message}
              />
            ) : (
              <ErrorState
                title="Не удалось загрузить анализ"
                description="Попробуйте перезагрузить страницу через минуту."
              />
            )}
          </motion.section>
        )}

        {tab === "chat" && (
          <motion.section
            key="chat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="flex h-[calc(100dvh-22rem)] md:h-[calc(100dvh-18rem)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]"
          >
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 md:space-y-4 md:p-6">
              {chatMessages.length === 0 && !chatLoading && (
                <EmptyState
                  icon={MessagesSquare}
                  compact
                  title="Задайте вопрос по записи"
                  description="Например: «О чём говорили в первые 10 минут?»"
                />
              )}
              {chatMessages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} formatTime={formatTime} />
              ))}
              {chatLoading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>

            <div className="flex-shrink-0 border-t border-[var(--border)] p-3 pb-safe md:p-4">
              {chatError && <p className="mb-2 text-sm text-red-500">{chatError}</p>}
              {chatRemaining === 0 ? (
                <p className="py-2 text-center text-sm text-[var(--fg-muted)]">
                  Лимит вопросов исчерпан.{" "}
                  <Link to="/app/pricing" className="font-semibold text-[var(--accent)] hover:underline">
                    Перейти на Про
                  </Link>
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                    placeholder="Задайте вопрос…"
                    className="input-field flex-1"
                    disabled={chatLoading}
                  />
                  <IconButton
                    variant="solid"
                    aria-label="Отправить"
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    loading={chatLoading}
                  >
                    <Icon icon={Send} size={18} />
                  </IconButton>
                </div>
              )}
              {chatRemaining > 0 && (
                <p className="mt-1 text-center text-xs text-[var(--fg-subtle)]">
                  Осталось вопросов: <span className="tabular">{chatRemaining}</span>
                </p>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <MobileSheet open={exportSheetOpen} onClose={() => setExportSheetOpen(false)} title="Экспорт">
        <div className="space-y-1">
          {(["txt", "srt", "docx"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleExport(fmt)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-muted)] active:bg-[var(--bg-muted)] touch-target"
            >
              <Icon icon={Download} size={18} className="text-[var(--fg-subtle)]" />
              <span className="text-[15px] font-medium">Скачать {fmt.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </MobileSheet>

      <MobileSheet
        open={!!renamingSpeaker}
        onClose={() => setRenamingSpeaker(null)}
        title="Переименовать спикера"
      >
        {renamingSpeaker && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem("name") as HTMLInputElement;
              handleRenameSpeaker(renamingSpeaker, input.value);
            }}
          >
            <input
              name="name"
              autoFocus
              defaultValue={getDisplayName(renamingSpeaker)}
              className="input-field mb-4"
              placeholder="Имя спикера"
            />
            <button type="submit" className="btn-accent w-full">
              Сохранить
            </button>
          </form>
        )}
      </MobileSheet>
    </motion.div>
  );
}

function ChatBubble({
  message,
  formatTime,
}: {
  message: ChatMessageType;
  formatTime: (sec: number) => string;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[75%] ring-1",
          isUser ? "shadow-glow-sm" : "bg-[var(--bg-muted)] text-[var(--fg)]"
        )}
        style={
          isUser
            ? {
                background: "var(--accent)",
                color: "var(--accent-fg)",
                boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent)",
              }
            : { boxShadow: "0 0 0 1px var(--border)" }
        }
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.content}</p>
        {message.references && message.references.length > 0 && (
          <div
            className="mt-2 space-y-1 border-t pt-2"
            style={{
              borderColor: isUser
                ? "color-mix(in srgb, var(--accent-fg) 30%, transparent)"
                : "var(--border)",
            }}
          >
            {message.references.map((ref, i) => (
              <p
                key={i}
                className={cn("text-xs", isUser ? "opacity-80" : "text-[var(--fg-muted)]")}
              >
                {ref.start_time != null && (
                  <span className="font-mono tabular mr-1">[{formatTime(ref.start_time)}]</span>
                )}
                {ref.chunk_text.slice(0, 100)}…
              </p>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-1 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 ring-1"
        style={{ boxShadow: "0 0 0 1px var(--border)" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[var(--fg-subtle)]"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

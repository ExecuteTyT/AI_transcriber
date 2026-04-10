import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FileText, Clock, Search, Copy, Check, Download,
  ChevronLeft, Send, Loader2, Lock, TrendingUp, Pencil, AlertCircle,
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

const SPEAKER_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-pink-50 text-pink-700 border-pink-200",
  "bg-teal-50 text-teal-700 border-teal-200",
];

const SPEAKER_DOT_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-amber-500",
  "bg-emerald-500", "bg-pink-500", "bg-teal-500",
];

const SPEAKER_BORDER_COLORS = [
  "border-l-blue-400", "border-l-violet-400", "border-l-amber-400",
  "border-l-emerald-400", "border-l-pink-400", "border-l-teal-400",
];

type Tab = "transcript" | "summary" | "key_points" | "action_items" | "chat";

export default function Transcription() {
  const { id } = useParams<{ id: string }>();
  const [transcription, setTranscription] = useState<TranscriptionType | null>(null);
  const [tab, setTab] = useState<Tab>("transcript");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<{ status: number; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRemaining, setChatRemaining] = useState<number>(-1);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Speaker UI state
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string> | null>(null);
  const [renamingSpeaker, setRenamingSpeaker] = useState<string | null>(null);

  // Export sheet (mobile)
  const [exportSheetOpen, setExportSheetOpen] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 600;

  useEffect(() => {
    if (!id) return;
    pollCountRef.current = 0;
    const load = async () => {
      try {
        const { data } = await transcriptionApi.getById(id);
        setTranscription(data);
        setLoading(false);
        if (data.status === "queued" || data.status === "processing") {
          pollingRef.current = setInterval(async () => {
            pollCountRef.current++;
            if (pollCountRef.current > MAX_POLLS) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              return;
            }
            try {
              const { data: updated } = await transcriptionApi.getById(id);
              setTranscription(updated);
              if (updated.status === "completed" || updated.status === "failed") {
                if (pollingRef.current) clearInterval(pollingRef.current);
                if (updated.status === "completed") {
                  useAuthStore.getState().loadUser();
                }
              }
            } catch { /* polling error */ }
          }, 3000);
        }
      } catch {
        setLoading(false);
      }
    };
    load();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id]);

  // AI analysis
  useEffect(() => {
    if (!id || tab === "transcript" || tab === "chat") { setAnalysis(null); setAnalysisError(null); return; }
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

  // Chat history
  useEffect(() => {
    if (!id || tab !== "chat") return;
    transcriptionApi.getChatHistory(id).then(({ data }) => {
      setChatMessages(data.messages);
      setChatRemaining(data.remaining_questions);
    }).catch(() => {});
  }, [id, tab]);

  // Chat auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

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

  const getSpeakerColor = (speaker: string) => {
    const idx = uniqueSpeakers.indexOf(speaker);
    return SPEAKER_COLORS[idx >= 0 ? idx % SPEAKER_COLORS.length : 0];
  };

  const getSpeakerDot = (speaker: string) => {
    const idx = uniqueSpeakers.indexOf(speaker);
    return SPEAKER_DOT_COLORS[idx >= 0 ? idx % SPEAKER_DOT_COLORS.length : 0];
  };

  const getSpeakerBorder = (speaker: string) => {
    const idx = uniqueSpeakers.indexOf(speaker);
    return SPEAKER_BORDER_COLORS[idx >= 0 ? idx % SPEAKER_BORDER_COLORS.length : 0];
  };

  const getDisplayName = (speaker: string) => speakerNames[speaker] || speaker;

  const highlightSearch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
        : part
    );
  };

  const toggleSpeaker = (speaker: string) => {
    setActiveSpeakers((prev) => {
      if (prev === null) {
        const newSet = new Set(uniqueSpeakers);
        newSet.delete(speaker);
        return newSet;
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
      id: "temp", role: "user", content: message,
      references: null, tokens_used: 0, created_at: new Date().toISOString(),
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
    } catch (err: any) {
      setChatMessages((prev) => prev.filter((m) => m.id !== "temp"));
      setChatError(err.response?.data?.detail || "Ошибка отправки сообщения");
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

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 bg-surface-100 rounded-xl w-2/5" />
        <div className="h-4 bg-surface-100 rounded-xl w-1/4" />
        <div className="card p-6 md:p-8 mt-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-surface-100 rounded-full" style={{ width: `${60 + i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="flex items-center justify-center py-16 md:py-24">
        <div className="text-center card p-8 md:p-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-surface-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Транскрипция не найдена</h2>
          <p className="text-sm text-gray-500 mb-6">Возможно, она была удалена или ссылка неверна.</p>
          <Link to="/dashboard" className="btn-primary inline-block">К списку транскрипций</Link>
        </div>
      </div>
    );
  }

  if (transcription.status === "queued" || transcription.status === "processing") {
    return (
      <div className="flex items-center justify-center py-16 md:py-24">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {transcription.status === "queued" ? "В очереди" : "Обрабатываем..."}
          </h2>
          <p className="text-gray-500 text-sm">{transcription.original_filename}</p>
          <p className="text-xs text-gray-400 mt-2">Обычно это занимает 1-3 минуты</p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 hover:underline">
            <ChevronLeft className="w-4 h-4" />
            К списку транскрипций
          </Link>
        </div>
      </div>
    );
  }

  if (transcription.status === "failed") {
    return (
      <div className="flex items-center justify-center py-16 md:py-24">
        <div className="text-center card p-8 md:p-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">Ошибка обработки</h2>
          <p className="text-sm text-gray-500 mb-6">{transcription.error_message || "Произошла неизвестная ошибка"}</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/upload" className="btn-primary">Загрузить заново</Link>
            <Link to="/dashboard" className="btn-secondary">К списку</Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredSegments = (transcription.segments || []).filter((seg) => {
    if (search && !seg.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeSpeakers !== null && seg.speaker && !activeSpeakers.has(seg.speaker)) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{transcription.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
            {transcription.language && (
              <span className="badge bg-surface-100 text-gray-600">{transcription.language.toUpperCase()}</span>
            )}
            {transcription.duration_sec && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(transcription.duration_sec)}
              </span>
            )}
            {transcription.full_text && (
              <span>{transcription.full_text.split(/\s+/).length} слов</span>
            )}
          </div>
        </div>

        {/* Export actions — desktop inline, mobile via sheet */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <button onClick={handleCopy} className="btn-secondary flex items-center gap-1.5">
            {copied ? <><Check className="w-4 h-4 text-green-500" /> Скопировано</> : <><Copy className="w-4 h-4" /> Копировать</>}
          </button>
          <button onClick={() => handleExport("txt")} className="btn-secondary">TXT</button>
          <button onClick={() => handleExport("srt")} className="btn-secondary">SRT</button>
          <button onClick={() => handleExport("docx")} className="btn-secondary">DOCX</button>
        </div>

        {/* Mobile export trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={handleCopy} className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
            {copied ? <><Check className="w-4 h-4 text-green-500" /> Скопировано</> : <><Copy className="w-4 h-4" /> Копировать</>}
          </button>
          <IconButton aria-label="Экспорт" onClick={() => setExportSheetOpen(true)}>
            <Download className="w-5 h-5" />
          </IconButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 md:gap-2 mb-5 md:mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {([
          ["transcript", "Транскрипт", false],
          ["summary", "Саммари", false],
          ["key_points", "Тезисы", false],
          ["action_items", "Actions", useAuthStore.getState().user?.plan === "free" || useAuthStore.getState().user?.plan === "start"],
          ["chat", "Чат", false],
        ] as const).map(([key, label, locked]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`px-3.5 md:px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 min-h-[44px] ${
              tab === key ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" : locked ? "bg-surface-100 text-gray-400" : "bg-surface-100 text-gray-600 hover:bg-surface-200"
            }`}
          >
            {locked && tab !== key && <Lock className="w-3 h-3" />}
            {label}
          </button>
        ))}
      </div>

      {/* ─── Transcript tab ─── */}
      {tab === "transcript" && (
        <>
          {/* Speaker filter */}
          {uniqueSpeakers.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-400 mr-1">Спикеры:</span>
              {uniqueSpeakers.map((speaker) => {
                const isActive = activeSpeakers === null || activeSpeakers.has(speaker);
                return (
                  <div key={speaker} className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSpeaker(speaker)}
                      className={`chip border transition-all duration-200 cursor-pointer min-h-[36px] ${
                        isActive
                          ? getSpeakerColor(speaker)
                          : "bg-gray-100 text-gray-400 border-gray-200 opacity-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isActive ? getSpeakerDot(speaker) : "bg-gray-300"}`} />
                      {getDisplayName(speaker)}
                    </button>
                    <IconButton
                      aria-label={`Переименовать ${speaker}`}
                      size="md"
                      className="!min-w-[36px] !min-h-[36px] !p-1.5"
                      onClick={() => setRenamingSpeaker(speaker)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                );
              })}
              {activeSpeakers !== null && (
                <button onClick={() => setActiveSpeakers(null)} className="text-xs text-primary-600 hover:underline ml-1">
                  Показать всех
                </button>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по тексту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !pl-10"
            />
          </div>

          {/* Segments — no more max-h-[70vh] */}
          <div className="card p-4 md:p-6 space-y-1">
            {filteredSegments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Нет совпадений</p>
            ) : (
              filteredSegments.map((seg, i) => (
                <div key={i} className={`flex items-start gap-2 md:gap-3 group hover:bg-surface-50 -mx-2 px-2 py-2 rounded-lg transition ${seg.speaker ? `border-l-2 ${getSpeakerBorder(seg.speaker)}` : ""}`}>
                  <span className="text-gray-400 font-mono text-xs w-12 flex-shrink-0 pt-0.5 tabular-nums">
                    {formatTime(seg.start)}
                  </span>
                  {seg.speaker && (
                    <span className={`chip border text-xs flex-shrink-0 ${getSpeakerColor(seg.speaker)}`}>
                      {getDisplayName(seg.speaker)}
                    </span>
                  )}
                  <span className="text-gray-700 leading-relaxed text-[15px]">{highlightSearch(seg.text, search)}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ─── AI analysis tabs ─── */}
      {(tab === "summary" || tab === "key_points" || tab === "action_items") && (
        <div className="card p-4 md:p-8">
          {analysisLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-gradient-to-r from-surface-100 via-primary-50 to-surface-100 rounded-full w-3/4 animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
              <div className="h-4 bg-gradient-to-r from-surface-100 via-primary-50 to-surface-100 rounded-full w-full animate-shimmer" style={{ backgroundSize: "200% 100%", animationDelay: "0.1s" }} />
              <div className="h-4 bg-gradient-to-r from-surface-100 via-primary-50 to-surface-100 rounded-full w-5/6 animate-shimmer" style={{ backgroundSize: "200% 100%", animationDelay: "0.2s" }} />
              <div className="h-4 bg-gradient-to-r from-surface-100 via-primary-50 to-surface-100 rounded-full w-2/3 animate-shimmer" style={{ backgroundSize: "200% 100%", animationDelay: "0.3s" }} />
              <p className="text-xs text-gray-400 mt-4">Генерируем анализ с помощью AI...</p>
            </div>
          ) : analysis ? (
            <div className="max-w-none">
              <MarkdownContent content={analysis.content} />
            </div>
          ) : analysisError ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                {tab === "action_items" ? "Action items — тариф Про" : "Лимит исчерпан"}
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{analysisError.message}</p>
              <Link to="/app/pricing" className="btn-primary inline-flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Улучшить тариф
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">Не удалось загрузить анализ</p>
          )}
        </div>
      )}

      {/* ─── Chat tab ─── */}
      {tab === "chat" && (
        <div className="card flex flex-col h-[calc(100dvh-13rem)] md:h-[calc(100dvh-16rem)] min-h-[300px]">
          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="text-center text-gray-400 py-8 md:py-12">
                <p className="text-lg mb-2">Задайте вопрос по транскрипции</p>
                <p className="text-sm">Например: &laquo;О чём говорили в первые 10 минут?&raquo;</p>
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-surface-100 text-gray-800 border-l-2 border-primary-400/40"
                }`}>
                  <p className="text-[15px] whitespace-pre-wrap break-words">{msg.content}</p>
                  {msg.references && msg.references.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200/30 space-y-1">
                      {msg.references.map((ref, i) => (
                        <p key={i} className="text-xs opacity-70">
                          {ref.start_time != null && (
                            <span className="font-mono tabular-nums">[{Math.floor(ref.start_time / 60)}:{String(Math.floor(ref.start_time % 60)).padStart(2, "0")}]</span>
                          )}{" "}
                          {ref.chunk_text.slice(0, 100)}...
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="flex-shrink-0 border-t border-gray-100 p-3 md:p-4 pb-safe">
            {chatError && (
              <p className="text-sm text-red-500 mb-2">{chatError}</p>
            )}
            {chatRemaining === 0 ? (
              <p className="text-sm text-gray-500 text-center py-2">
                Лимит вопросов исчерпан.{" "}
                <Link to="/app/pricing" className="text-primary-600 hover:underline">Перейти на Про</Link>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                  placeholder="Задайте вопрос по записи..."
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
                  <Send className="w-5 h-5" />
                </IconButton>
              </div>
            )}
            {chatRemaining > 0 && (
              <p className="text-xs text-gray-400 mt-1 text-center">
                Осталось вопросов: {chatRemaining}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Export sheet (mobile) ─── */}
      <MobileSheet open={exportSheetOpen} onClose={() => setExportSheetOpen(false)} title="Экспорт">
        <div className="space-y-1">
          {(["txt", "srt", "docx"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors w-full touch-target"
            >
              <Download className="w-5 h-5 text-gray-400" />
              <span className="text-[15px] font-medium">Скачать {fmt.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </MobileSheet>

      {/* ─── Speaker rename sheet ─── */}
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
            <button type="submit" className="btn-primary w-full">
              Сохранить
            </button>
          </form>
        )}
      </MobileSheet>
    </div>
  );
}

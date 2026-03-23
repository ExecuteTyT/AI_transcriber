import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  transcriptionApi,
  type Transcription as TranscriptionType,
  type AiAnalysis,
} from "@/api/transcriptions";

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

type Tab = "transcript" | "summary" | "key_points" | "action_items";

export default function Transcription() {
  const { id } = useParams<{ id: string }>();
  const [transcription, setTranscription] = useState<TranscriptionType | null>(null);
  const [tab, setTab] = useState<Tab>("transcript");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Speaker UI state
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string> | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 600; // 30 min max (600 * 3s)

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
              }
            } catch { /* polling error — retry next interval */ }
          }, 3000);
        }
      } catch {
        setLoading(false);
      }
    };
    load();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id]);

  // AI analysis loading
  useEffect(() => {
    if (!id || tab === "transcript") { setAnalysis(null); return; }
    setAnalysisLoading(true);
    const fetchers: Record<string, (id: string) => ReturnType<typeof transcriptionApi.getSummary>> = {
      summary: transcriptionApi.getSummary,
      key_points: transcriptionApi.getKeyPoints,
      action_items: transcriptionApi.getActionItems,
    };
    const fetchAnalysis = fetchers[tab];
    if (!fetchAnalysis) return;
    fetchAnalysis(id)
      .then(({ data }) => setAnalysis(data))
      .catch(() => setAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [id, tab]);

  // Extract unique speakers
  const uniqueSpeakers = useMemo(() => {
    const speakers: string[] = [];
    for (const seg of transcription?.segments || []) {
      if (seg.speaker && !speakers.includes(seg.speaker)) {
        speakers.push(seg.speaker);
      }
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
    setEditingSpeaker(null);
  };

  const handleCopy = () => {
    if (transcription?.full_text) {
      navigator.clipboard.writeText(transcription.full_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = async (format: "txt" | "srt" | "docx") => {
    if (!id) return;
    const { data } = await transcriptionApi.exportFile(id, format);
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transcription?.title || "export"}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface-100 rounded-xl w-1/3" />
        <div className="h-4 bg-surface-100 rounded-xl w-1/4" />
        <div className="card p-8 mt-6">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-surface-100 rounded-full" style={{ width: `${60 + i * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center card p-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-surface-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Транскрипция не найдена</h2>
          <p className="text-sm text-gray-500 mb-6">Возможно, она была удалена или ссылка неверна.</p>
          <Link to="/dashboard" className="btn-primary inline-block !py-2.5 !px-8">К списку транскрипций</Link>
        </div>
      </div>
    );
  }

  if (transcription.status === "queued" || transcription.status === "processing") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {transcription.status === "queued" ? "В очереди" : "Обрабатываем..."}
          </h2>
          <p className="text-gray-500 text-sm">{transcription.original_filename}</p>
          <p className="text-xs text-gray-400 mt-2">Обычно это занимает 1-3 минуты</p>
        </div>
      </div>
    );
  }

  if (transcription.status === "failed") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center card p-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">Ошибка обработки</h2>
          <p className="text-sm text-gray-500 mb-6">{transcription.error_message || "Произошла неизвестная ошибка"}</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/upload" className="btn-primary !py-2.5 !px-6">Загрузить заново</Link>
            <Link to="/dashboard" className="btn-secondary !py-2.5 !px-6">К списку</Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter by search + active speakers
  const filteredSegments = (transcription.segments || []).filter((seg) => {
    if (search && !seg.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeSpeakers !== null && seg.speaker && !activeSpeakers.has(seg.speaker)) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{transcription.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
            {transcription.language && (
              <span className="badge bg-surface-100 text-gray-600">{transcription.language.toUpperCase()}</span>
            )}
            {transcription.duration_sec && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(transcription.duration_sec)}
              </span>
            )}
            {transcription.full_text && (
              <span>{transcription.full_text.split(/\s+/).length} слов</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleCopy} className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-2">
            {copied ? (
              <><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> Скопировано</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg> Копировать</>
            )}
          </button>
          <button onClick={() => handleExport("txt")} className="btn-secondary !py-2 !px-4 text-sm">TXT</button>
          <button onClick={() => handleExport("srt")} className="btn-secondary !py-2 !px-4 text-sm">SRT</button>
          <button onClick={() => handleExport("docx")} className="btn-secondary !py-2 !px-4 text-sm">DOCX</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          ["transcript", "Транскрипт"],
          ["summary", "Саммари"],
          ["key_points", "Тезисы"],
          ["action_items", "Action items"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              tab === key ? "bg-primary-600 text-white shadow-sm" : "bg-surface-100 text-gray-600 hover:bg-surface-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Transcript tab */}
      {tab === "transcript" && (
        <>
          {/* Speaker filter chips */}
          {uniqueSpeakers.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-400 mr-1">Спикеры:</span>
              {uniqueSpeakers.map((speaker) => {
                const isActive = activeSpeakers === null || activeSpeakers.has(speaker);
                return (
                  <div key={speaker} className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSpeaker(speaker)}
                      className={`badge border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? getSpeakerColor(speaker)
                          : "bg-gray-100 text-gray-400 border-gray-200 opacity-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${isActive ? getSpeakerDot(speaker) : "bg-gray-300"}`} />
                      {editingSpeaker === speaker ? (
                        <input
                          autoFocus
                          defaultValue={getDisplayName(speaker)}
                          className="bg-transparent border-none outline-none w-20 text-xs"
                          onBlur={(e) => handleRenameSpeaker(speaker, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSpeaker(speaker, e.currentTarget.value);
                            if (e.key === "Escape") setEditingSpeaker(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span onDoubleClick={() => setEditingSpeaker(speaker)}>
                          {getDisplayName(speaker)}
                        </span>
                      )}
                    </button>
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
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по тексту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !pl-10"
            />
          </div>

          {/* Segments */}
          <div className="card p-6 max-h-[70vh] overflow-y-auto space-y-1">
            {filteredSegments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Нет совпадений</p>
            ) : (
              filteredSegments.map((seg, i) => (
                <div key={i} className={`flex items-start gap-3 text-sm group hover:bg-surface-50 -mx-2 px-2 py-1.5 rounded-lg transition ${seg.speaker ? `border-l-2 ${getSpeakerBorder(seg.speaker)}` : ""}`}>
                  <span className="text-gray-400 font-mono text-xs w-12 flex-shrink-0 pt-0.5">
                    {formatTime(seg.start)}
                  </span>
                  {seg.speaker && (
                    <span className={`badge border !text-[10px] flex-shrink-0 ${getSpeakerColor(seg.speaker)}`}>
                      {getDisplayName(seg.speaker)}
                    </span>
                  )}
                  <span className="text-gray-700 leading-relaxed">{seg.text}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* AI analysis tabs */}
      {(tab === "summary" || tab === "key_points" || tab === "action_items") && (
        <div className="card p-8">
          {analysisLoading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Генерация анализа...
            </div>
          ) : analysis ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
              {analysis.content}
            </div>
          ) : (
            <p className="text-gray-500">Не удалось загрузить анализ</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  transcriptionApi,
  type Transcription as TranscriptionType,
  type AiAnalysis,
} from "@/api/transcriptions";

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

type Tab = "transcript" | "summary" | "key_points";

export default function Transcription() {
  const { id } = useParams<{ id: string }>();
  const [transcription, setTranscription] = useState<TranscriptionType | null>(
    null
  );
  const [tab, setTab] = useState<Tab>("transcript");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Загрузка данных + поллинг статуса
  useEffect(() => {
    if (!id) return;
    let polling: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      const { data } = await transcriptionApi.getById(id);
      setTranscription(data);
      setLoading(false);

      if (data.status === "queued" || data.status === "processing") {
        polling = setInterval(async () => {
          const { data: updated } = await transcriptionApi.getById(id);
          setTranscription(updated);
          if (
            updated.status === "completed" ||
            updated.status === "failed"
          ) {
            if (polling) clearInterval(polling);
          }
        }, 3000);
      }
    };
    load();

    return () => {
      if (polling) clearInterval(polling);
    };
  }, [id]);

  // Загрузка AI-анализа при переключении вкладки
  useEffect(() => {
    if (!id || tab === "transcript") {
      setAnalysis(null);
      return;
    }
    setAnalysisLoading(true);
    const fetchAnalysis =
      tab === "summary"
        ? transcriptionApi.getSummary
        : transcriptionApi.getKeyPoints;

    fetchAnalysis(id)
      .then(({ data }) => setAnalysis(data))
      .catch(() => setAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [id, tab]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const speakerColorMap: Record<string, string> = {};
  let colorIndex = 0;
  const getSpeakerColor = (speaker: string) => {
    if (!speakerColorMap[speaker]) {
      speakerColorMap[speaker] =
        SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length];
      colorIndex++;
    }
    return speakerColorMap[speaker];
  };

  const handleCopy = () => {
    if (transcription?.full_text) {
      navigator.clipboard.writeText(transcription.full_text);
    }
  };

  const handleExport = async (format: "txt" | "srt") => {
    if (!id) return;
    const { data } = await transcriptionApi.exportFile(id, format);
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transcription?.title || "export"}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-gray-500">Загрузка...</p>;
  if (!transcription) return <p className="text-red-500">Не найдено</p>;

  // Статус-экран
  if (
    transcription.status === "queued" ||
    transcription.status === "processing"
  ) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">
          {transcription.status === "queued" ? "В очереди" : "Обработка..."}
        </h2>
        <p className="text-gray-500">{transcription.original_filename}</p>
      </div>
    );
  }

  if (transcription.status === "failed") {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-xl mb-2">Ошибка обработки</p>
        <p className="text-gray-500">{transcription.error_message}</p>
      </div>
    );
  }

  const filteredSegments =
    transcription.segments?.filter((seg) =>
      search
        ? seg.text.toLowerCase().includes(search.toLowerCase())
        : true
    ) || [];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{transcription.title}</h1>
          <div className="text-sm text-gray-500 mt-1 flex gap-3">
            {transcription.language && (
              <span>Язык: {transcription.language.toUpperCase()}</span>
            )}
            {transcription.duration_sec && (
              <span>
                Длительность: {formatTime(transcription.duration_sec)}
              </span>
            )}
            {transcription.full_text && (
              <span>
                Слов: {transcription.full_text.split(/\s+/).length}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
          >
            Копировать
          </button>
          <button
            onClick={() => handleExport("txt")}
            className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
          >
            TXT
          </button>
          <button
            onClick={() => handleExport("srt")}
            className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
          >
            SRT
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-4">
        {(
          [
            ["transcript", "Транскрипт"],
            ["summary", "Саммари"],
            ["key_points", "Тезисы"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition ${
              tab === key
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "transcript" && (
        <>
          <input
            type="text"
            placeholder="Поиск по тексту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="bg-white rounded-xl border border-gray-200 p-4 max-h-[70vh] overflow-y-auto">
            {filteredSegments.map((seg, i) => (
              <div key={i} className="flex gap-3 mb-3 text-sm">
                <span className="text-gray-400 font-mono w-12 flex-shrink-0">
                  {formatTime(seg.start)}
                </span>
                {seg.speaker && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${getSpeakerColor(seg.speaker)}`}
                  >
                    {seg.speaker}
                  </span>
                )}
                <span className="text-gray-800">{seg.text}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {(tab === "summary" || tab === "key_points") && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {analysisLoading ? (
            <p className="text-gray-500">Генерация анализа...</p>
          ) : analysis ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
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

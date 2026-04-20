import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileAudio, Film, FolderOpen, Languages, Link2, Lock, Music2, Upload as UploadIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { transcriptionApi } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { PipelineSteps, type PipelineStage } from "@/components/upload/PipelineSteps";
import { ErrorState } from "@/components/states/ErrorState";
import { fadeUp, staggerChildren, springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { LANGUAGES } from "@/lib/languages";
import { AnimatePresence } from "framer-motion";

const ACCEPTED_TYPES = {
  "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".webm"],
  "video/*": [".mp4", ".webm", ".mov"],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const FORMATS = [
  { label: "MP3", icon: Music2 },
  { label: "WAV", icon: Music2 },
  { label: "M4A", icon: Music2 },
  { label: "MP4", icon: Film },
  { label: "MOV", icon: Film },
  { label: "WebM", icon: Film },
];

const URL_SUPPORTED = ["YouTube", "VK Video", "Rutube", "Одноклассники", "Дзен"];
const URL_PLAN_ALLOWED = new Set(["start", "pro", "business", "premium"]);

type SourceTab = "file" | "url";

export default function Upload() {
  const { user } = useAuthStore();
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState<string>(user?.default_language || "auto");
  const [tab, setTab] = useState<SourceTab>("file");
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const navigate = useNavigate();

  const minutesLeft = user ? Math.max(0, user.minutes_limit - user.minutes_used) : 0;
  const canUseUrl = Boolean(user?.is_admin) || URL_PLAN_ALLOWED.has(user?.plan || "");

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const msg = rejection.errors?.some((e) => e.code === "file-too-large")
          ? "Файл слишком большой. Максимум 500 МБ."
          : rejection.errors?.some((e) => e.code === "file-invalid-type")
          ? "Неподдерживаемый формат файла."
          : "Файл не принят.";
        toast.error(msg);
        setError(msg);
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setError("");
      setStage("uploading");
      setProgress(0);
      setFileName(file.name);

      try {
        const { data } = await transcriptionApi.upload(file, (percent) => setProgress(percent), language);
        setStage("processing");
        // Give user a brief moment to see the pipeline before navigating.
        setTimeout(() => {
          toast.success("Файл загружен — обрабатываем!");
          navigate(`/transcription/${data.id}`);
        }, 600);
      } catch (err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const message = axiosErr.response?.data?.detail || "Ошибка загрузки файла";
        setError(message);
        setStage("failed");
        toast.error(message);
      }
    },
    [navigate, language]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: stage === "uploading",
    noClick: false,
  });

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      // Лёгкая валидация на фронте — финально проверяет backend.
      new URL(trimmed);
    } catch {
      toast.error("Некорректная ссылка");
      return;
    }
    setError("");
    setUrlLoading(true);
    setStage("uploading");
    setProgress(100); // в URL-режиме нет upload progress — сразу обработка
    setFileName(trimmed);
    try {
      const { data } = await transcriptionApi.uploadUrl(trimmed, language);
      setStage("processing");
      setTimeout(() => {
        toast.success("Ссылка принята — скачиваем и обрабатываем!");
        navigate(`/transcription/${data.id}`);
      }, 600);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const message = axiosErr.response?.data?.detail || "Не удалось принять ссылку";
      setError(message);
      setStage("failed");
      toast.error(message);
    } finally {
      setUrlLoading(false);
    }
  };

  const busy = stage === "uploading" || stage === "processing";

  return (
    <motion.div
      variants={staggerChildren(0.06)}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-2xl space-y-5"
    >
      <motion.header variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Новая запись</h1>
        <p className="mt-1 text-sm text-gray-500">
          Загрузите аудио или видео — превратим в текст, саммари и задачи.
        </p>
      </motion.header>

      {busy ? (
        <motion.div variants={fadeUp}>
          <PipelineSteps stage={stage} uploadPercent={progress} fileName={fileName} />
        </motion.div>
      ) : (
        <>
        <motion.div variants={fadeUp} className="flex gap-1 rounded-full bg-surface-100 p-1 text-sm font-semibold">
          {(
            [
              { key: "file" as SourceTab, label: "Файл", icon: FolderOpen },
              { key: "url" as SourceTab, label: "Ссылка", icon: Link2 },
            ]
          ).map((opt) => {
            const active = tab === opt.key;
            return (
              <motion.button
                key={opt.key}
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={springTight}
                onClick={() => {
                  setError("");
                  setTab(opt.key);
                }}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 transition-colors duration-fast",
                  active ? "text-white" : "text-gray-600 hover:text-gray-900"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="source-tab"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 shadow-glow-sm"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Icon icon={opt.icon} size={14} strokeWidth={2.2} />
                  {opt.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-white px-4 py-3">
          <Icon icon={Languages} size={16} className="text-gray-400" />
          <label htmlFor="lang-select" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            Язык записи:
          </label>
          <select
            id="lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 bg-surface-50 px-3 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </motion.div>

        <AnimatePresence mode="wait">
        {tab === "file" ? (
        <motion.div
          key="file-tab"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        >
        <div
          {...getRootProps()}
          className={cn(
            "group relative overflow-hidden rounded-3xl border-2 border-dashed p-6 text-center transition-all duration-base cursor-pointer md:p-10",
            isDragActive
              ? "border-primary-400 bg-primary-50/60 shadow-glow-lg"
              : "border-surface-300 bg-white hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-glow-sm"
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-base group-hover:opacity-100"
            aria-hidden
            style={{
              background:
                "radial-gradient(80% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%)",
            }}
          />
          <input {...getInputProps()} />
          <div className="relative space-y-4">
            <motion.div
              animate={{ scale: isDragActive ? 1.12 : 1, rotate: isDragActive ? 2 : 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className={cn(
                "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl md:h-20 md:w-20",
                isDragActive
                  ? "bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow"
                  : "bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600"
              )}
            >
              <Icon icon={UploadIcon} size={isDragActive ? 32 : 28} strokeWidth={1.75} />
            </motion.div>
            <div>
              <p className="text-lg font-bold tracking-tight text-gray-900">
                {isDragActive ? "Отпустите файл — загрузим!" : "Перетащите файл сюда"}
              </p>
              <p className="mt-1 text-sm text-gray-500">или нажмите, чтобы выбрать с устройства</p>
            </div>
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Icon icon={UploadIcon} size={16} strokeWidth={2.25} />
                Выбрать файл
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {FORMATS.map((fmt) => (
                <span
                  key={fmt.label}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600"
                >
                  <Icon icon={fmt.icon} size={12} />
                  {fmt.label}
                </span>
              ))}
            </div>
            <p className="text-[11px] font-medium text-gray-400">Максимум 500 МБ</p>
          </div>
        </div>
        </motion.div>
        ) : (
        <motion.div
          key="url-tab"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        >
          {!canUseUrl ? (
            <div className="rounded-3xl border border-primary-100/70 bg-white p-8 text-center shadow-card">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white shadow-glow-sm">
                <Icon icon={Lock} size={22} strokeWidth={2} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">
                Транскрибация по ссылке — от тарифа Старт
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                На Free-тарифе доступна загрузка файлов. Для YouTube, VK, Rutube и других
                источников перейдите на Старт от 500 ₽/мес.
              </p>
              <Link
                to="/app/pricing"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm hover:shadow-glow transition-shadow duration-base press"
              >
                <Icon icon={Zap} size={14} strokeWidth={2.25} />
                Перейти на Старт
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="space-y-3 rounded-3xl border border-gray-200/70 bg-white p-5 shadow-card md:p-8">
              <div>
                <label htmlFor="url-input" className="mb-2 block text-sm font-semibold text-gray-800">
                  Ссылка на видео или аудио
                </label>
                <div className="relative">
                  <Icon
                    icon={Link2}
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="url-input"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="input-field !pl-11"
                    required
                    autoFocus
                    disabled={urlLoading}
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                  Поддерживаемые источники
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {URL_SUPPORTED.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-full bg-surface-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={urlLoading || !url.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {urlLoading ? "Принимаем…" : "Распознать"}
              </button>
              <p className="text-[11px] leading-relaxed text-gray-400">
                Максимальная длительность: согласно вашему тарифу. Приватные, возрастные и
                live-трансляции — не поддерживаются.
              </p>
            </form>
          )}
        </motion.div>
        )}
        </AnimatePresence>
        </>
      )}

      {user && !busy && (
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/70 bg-white px-4 py-3 md:px-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Icon icon={FileAudio} size={18} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">
                <span className="tabular">{minutesLeft}</span> из{" "}
                <span className="tabular">{user.minutes_limit}</span> мин доступно
              </p>
              <p className="text-xs text-gray-500">
                На этот план хватит примерно {Math.floor(minutesLeft / 30)} получасовых встреч
              </p>
            </div>
          </div>
          {user.minutes_used >= user.minutes_limit && (
            <Link
              to="/app/pricing"
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-3 py-1.5 text-xs font-semibold text-white shadow-glow-sm press"
            >
              <Icon icon={Zap} size={12} />
              Увеличить
            </Link>
          )}
        </motion.div>
      )}

      {error && !busy && (
        <motion.div variants={fadeUp}>
          <ErrorState title="Не удалось загрузить" description={error} />
        </motion.div>
      )}
    </motion.div>
  );
}

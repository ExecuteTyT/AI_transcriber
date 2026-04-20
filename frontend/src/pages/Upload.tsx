import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileAudio, Film, Languages, Music2, Upload as UploadIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { transcriptionApi } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { PipelineSteps, type PipelineStage } from "@/components/upload/PipelineSteps";
import { ErrorState } from "@/components/states/ErrorState";
import { fadeUp, staggerChildren } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { LANGUAGES } from "@/lib/languages";

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

export default function Upload() {
  const { user } = useAuthStore();
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState<string>(user?.default_language || "auto");
  const navigate = useNavigate();

  const minutesLeft = user ? Math.max(0, user.minutes_limit - user.minutes_used) : 0;

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

        <motion.div variants={fadeUp}>
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

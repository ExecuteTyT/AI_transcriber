import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileAudio, FolderOpen, Link2, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { transcriptionApi } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { PipelineSteps, type PipelineStage } from "@/components/upload/PipelineSteps";
import { ErrorState } from "@/components/states/ErrorState";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { fadeUp, staggerChildren, springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useSound } from "@/lib/sound";
import Seo from "@/components/Seo";

const ACCEPTED_TYPES = {
  "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".webm"],
  "video/*": [".mp4", ".webm", ".mov"],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const FORMATS = ["MP3", "WAV", "FLAC", "OGG", "M4A", "MP4", "MOV", "WEBM"];
const URL_SUPPORTED = ["YouTube", "VK Video", "Rutube", "OK", "Дзен"];

type SourceTab = "file" | "url";

export default function Upload() {
  const { user } = useAuthStore();
  const { play } = useSound();
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState<string>(user?.default_language || "auto");
  const [tab, setTab] = useState<SourceTab>("file");
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const navigate = useNavigate();

  const bonusMinutes = user?.bonus_minutes ?? 0;
  const monthlyRemaining = user ? Math.max(0, user.minutes_limit - user.minutes_used) : 0;
  const totalAvailable = bonusMinutes + monthlyRemaining;
  const totalCapacity = bonusMinutes + (user?.minutes_limit ?? 0);

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
      play("tick");

      try {
        const { data } = await transcriptionApi.upload(file, (percent) => setProgress(percent), language);
        setStage("processing");
        setTimeout(() => {
          play("confirm");
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
    [navigate, language, play]
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
      new URL(trimmed);
    } catch {
      toast.error("Некорректная ссылка");
      return;
    }
    setError("");
    setUrlLoading(true);
    setStage("uploading");
    setProgress(100);
    setFileName(trimmed);
    play("tick");
    try {
      const { data } = await transcriptionApi.uploadUrl(trimmed, language);
      setStage("processing");
      setTimeout(() => {
        play("confirm");
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
      className="mx-auto max-w-2xl space-y-6 md:space-y-8"
    >
      <Seo title="Новая запись — Dicto" noindex />
      <motion.header variants={fadeUp}>
        <p className="eyebrow mb-3">Новая запись</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.02em] text-[var(--fg)]">
          Превратим в <em className="italic text-[var(--accent)]">текст</em>.
        </h1>
        <p className="mt-3 text-[14px] text-[var(--fg-muted)] leading-[1.55] max-w-[48ch]">
          Загрузите аудио/видео или ссылку — AI расшифрует речь, разметит спикеров и выделит ключевые тезисы.
        </p>
      </motion.header>

      {busy ? (
        <motion.div variants={fadeUp}>
          <PipelineSteps stage={stage} uploadPercent={progress} fileName={fileName} />
        </motion.div>
      ) : (
        <>
        {/* ── Source tab ── */}
        <motion.div
          variants={fadeUp}
          className="flex gap-px rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-[3px] font-mono text-[10px] uppercase tracking-[0.14em]"
        >
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
                  play("focus");
                  setError("");
                  setTab(opt.key);
                }}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 transition-colors duration-fast",
                  active ? "text-ink-900" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="source-tab"
                    className="absolute inset-0 rounded-full bg-acid-300"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Icon icon={opt.icon} size={13} strokeWidth={1.75} />
                  {opt.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Language selector ── */}
        <motion.div variants={fadeUp}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            Язык
          </p>
          <LanguageSelect value={language} onChange={setLanguage} label="Язык транскрипции" />
        </motion.div>

        {/* ── Tab content ── */}
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
                "group relative overflow-hidden rounded-3xl border-2 border-dashed p-6 xs:p-8 md:p-12 text-center transition-all duration-base cursor-pointer",
                isDragActive
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]"
                  : "border-[var(--border-strong)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/40"
              )}
            >
              <input {...getInputProps()} />
              <div className="relative space-y-4 xs:space-y-5">
                <motion.div
                  animate={{ scale: isDragActive ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className={cn(
                    "mx-auto flex h-14 w-14 xs:h-16 xs:w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl border transition-colors",
                    isDragActive
                      ? "bg-acid-300/15 border-[var(--accent)]/50 text-[var(--accent)]"
                      : "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[var(--accent)]/20 text-[var(--accent)]"
                  )}
                >
                  <Icon icon={UploadIcon} size={isDragActive ? 30 : 26} strokeWidth={1.5} />
                </motion.div>
                <div>
                  <p className="font-display text-xl xs:text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-[var(--fg)] break-words">
                    {isDragActive ? "Отпустите — загружаем" : "Перетащите файл сюда"}
                  </p>
                  <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
                    или нажмите чтобы выбрать с устройства
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      play("tick");
                      open();
                    }}
                    className="btn-accent"
                  >
                    <Icon icon={UploadIcon} size={15} strokeWidth={2} />
                    Выбрать файл
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {FORMATS.map((fmt) => (
                    <span
                      key={fmt}
                      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] px-2 py-0.5"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                  Максимум 500 МБ
                </p>
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
            <form onSubmit={handleUrlSubmit} className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-8">
                <div>
                  <label htmlFor="url-input" className="label-editorial">
                    Ссылка на видео или аудио
                  </label>
                  <div className="relative">
                    <Icon
                      icon={Link2}
                      size={15}
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]"
                    />
                    <input
                      id="url-input"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="input-editorial pl-7"
                      required
                      autoFocus
                      disabled={urlLoading}
                    />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] mb-2">
                    Поддерживаемые источники
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {URL_SUPPORTED.map((name) => (
                      <span
                        key={name}
                        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)] border border-[var(--border)] rounded-full px-2.5 py-1"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={urlLoading || !url.trim()}
                  className="btn-accent w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {urlLoading ? "Принимаем…" : <>Распознать <span aria-hidden>→</span></>}
                </button>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] leading-[1.5]">
                  Приватные, возрастные и live-трансляции — не поддерживаются.
                </p>
              </form>
          </motion.div>
        )}
        </AnimatePresence>
        </>
      )}

      {/* ── Usage banner ── */}
      {user && !busy && (
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]">
              <Icon icon={FileAudio} size={17} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] text-[var(--fg)]">
                <span className="font-display text-lg tabular leading-none">{totalAvailable}</span>{" "}
                <span className="text-[var(--fg-muted)]">из {totalCapacity}&nbsp;мин доступно</span>
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                Хватит на ~{Math.max(0, Math.floor(totalAvailable / 30))} получасовых встреч
              </p>
            </div>
          </div>
          {totalAvailable === 0 && (
            <Link
              to="/app/pricing"
              onClick={() => play("tick")}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 text-[12px] font-semibold hover:bg-[var(--accent-hover)] transition-colors"
            >
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

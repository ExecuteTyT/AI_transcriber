import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { Upload as UploadIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { transcriptionApi } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";

const ACCEPTED_TYPES = {
  "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".webm"],
  "video/*": [".mp4", ".webm", ".mov"],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const FORMATS = ["MP3", "WAV", "FLAC", "OGG", "M4A", "MP4", "WebM", "MOV"];

export default function Upload() {
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const navigate = useNavigate();

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: any[]) => {
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors?.some((e: any) => e.code === "file-too-large")) {
          toast.error("Файл слишком большой. Максимум 500 МБ.");
          setError("Файл слишком большой. Максимум 500 МБ.");
        } else if (rejection.errors?.some((e: any) => e.code === "file-invalid-type")) {
          toast.error("Неподдерживаемый формат файла.");
          setError("Неподдерживаемый формат файла.");
        } else {
          toast.error("Файл не принят.");
          setError("Файл не принят.");
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setError("");
      setUploading(true);
      setProgress(0);
      setFileName(file.name);

      try {
        const { data } = await transcriptionApi.upload(file, (percent) => {
          setProgress(percent);
        });
        toast.success("Файл загружен! Начинаем обработку...");
        navigate(`/transcription/${data.id}`);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Ошибка загрузки файла";
        setError(message);
        toast.error(message);
      } finally {
        setUploading(false);
        setProgress(0);
        setFileName("");
      }
    },
    [navigate]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: uploading,
    noClick: false,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-1">Загрузить файл</h1>
      <p className="text-sm text-gray-500 mb-6 md:mb-8">Перетащите аудио или видео для транскрибации</p>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative rounded-3xl p-6 md:p-16 text-center cursor-pointer transition-all duration-300 group ${
          isDragActive
            ? "bg-primary-50/50 border-2 border-primary-400 shadow-glow-lg"
            : "border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/30 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-4">
            {/* Circular progress */}
            <div className="w-24 h-24 mx-auto relative">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100" />
                <circle
                  cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-primary-500 transition-all duration-300"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - progress / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-600 tabular-nums">{progress}%</span>
              </div>
            </div>
            <p className="text-gray-600 font-medium">Загрузка файла...</p>
            {fileName && <p className="text-xs text-gray-400 truncate max-w-[280px] mx-auto">{fileName}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragActive ? "bg-primary-200 scale-110" : "bg-surface-100 group-hover:bg-primary-100"
            }`}>
              <UploadIcon className={`w-8 h-8 transition-colors duration-300 ${isDragActive ? "text-primary-600" : "text-gray-400 group-hover:text-primary-500"}`} />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? "Отпустите файл" : "Перетащите файл сюда"}
              </p>
              <p className="text-sm text-gray-400 mt-1">или нажмите для выбора</p>
            </div>

            {/* Explicit CTA for mobile */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); open(); }}
              className="btn-primary inline-flex items-center gap-2 md:hidden"
            >
              <UploadIcon className="w-4 h-4" />
              Выбрать файл
            </button>

            <div className="flex flex-wrap items-center justify-center gap-1.5 xs:gap-2">
              {FORMATS.map((fmt) => (
                <span key={fmt} className="chip bg-surface-100 text-gray-600">{fmt}</span>
              ))}
            </div>
            <p className="text-xs text-gray-400">Максимум 500 МБ</p>
          </div>
        )}
      </div>

      {/* Minutes remaining */}
      {user && (
        <div className="mt-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 text-sm text-gray-500">
          <span>Осталось: {Math.max(0, user.minutes_limit - user.minutes_used)} мин из {user.minutes_limit}</span>
          {user.minutes_used >= user.minutes_limit && (
            <Link to="/subscription" className="text-primary-600 hover:underline font-medium">Увеличить лимит</Link>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 text-red-600 px-5 py-4 rounded-xl text-sm border border-red-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

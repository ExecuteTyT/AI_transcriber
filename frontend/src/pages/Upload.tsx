import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { transcriptionApi } from "@/api/transcriptions";
import { useAuthStore } from "@/store/authStore";

const ACCEPTED_TYPES = {
  "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".webm"],
  "video/*": [".mp4", ".webm", ".mov"],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export default function Upload() {
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const navigate = useNavigate();

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: any[]) => {
      // Handle rejections from react-dropzone (size, type)
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors?.some((e: any) => e.code === "file-too-large")) {
          setError("Файл слишком большой. Максимум 500 МБ.");
        } else if (rejection.errors?.some((e: any) => e.code === "file-invalid-type")) {
          setError("Неподдерживаемый формат файла.");
        } else {
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
        navigate(`/transcription/${data.id}`);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Ошибка загрузки файла";
        setError(message);
      } finally {
        setUploading(false);
        setProgress(0);
        setFileName("");
      }
    },
    [navigate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Загрузить файл</h1>
      <p className="text-sm text-gray-500 mb-8">Перетащите аудио или видео для транскрибации</p>

      <div
        {...getRootProps()}
        className={`relative rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 group ${
          isDragActive
            ? "bg-primary-50/50 border-2 border-primary-400 shadow-glow-lg"
            : "border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/30 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Загрузка файла...</p>
            {fileName && <p className="text-xs text-gray-400 truncate max-w-xs mx-auto">{fileName}</p>}
            <div className="w-48 mx-auto bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-primary-500 via-accent-400 to-primary-500 h-2 rounded-full transition-all duration-300 animate-shimmer" style={{ width: `${progress}%`, backgroundSize: "200% 100%" }} />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragActive ? "bg-primary-200 scale-110" : "bg-surface-100 group-hover:bg-primary-100"
            }`}>
              <svg className={`w-8 h-8 transition-colors duration-300 ${isDragActive ? "text-primary-600" : "text-gray-400 group-hover:text-primary-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? "Отпустите файл" : "Перетащите файл сюда"}
              </p>
              <p className="text-sm text-gray-400 mt-1">или нажмите для выбора</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["MP3", "WAV", "FLAC", "OGG", "M4A", "MP4", "WebM", "MOV"].map((fmt) => (
                <span key={fmt} className="bg-surface-100 text-gray-600 rounded-full px-3 py-1 text-[10px] font-medium">{fmt}</span>
              ))}
            </div>
            <p className="text-xs text-gray-400">Максимум 500 МБ</p>
          </div>
        )}
      </div>

      {/* Minutes remaining info */}
      {user && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Осталось: {Math.max(0, user.minutes_limit - user.minutes_used)} мин из {user.minutes_limit}</span>
          {user.minutes_used >= user.minutes_limit && (
            <Link to="/subscription" className="text-primary-600 hover:underline font-medium">Увеличить лимит</Link>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 text-red-600 px-5 py-4 rounded-xl text-sm border border-red-100 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

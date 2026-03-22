import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { transcriptionApi } from "@/api/transcriptions";

const ACCEPTED_TYPES = {
  "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".webm"],
  "video/*": [".mp4", ".webm", ".mov"],
};

export default function Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError("");
      setUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await transcriptionApi.upload(file);
        navigate(`/transcription/${data.id}`);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Ошибка загрузки файла";
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [navigate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 500 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Загрузить файл</h1>
      <p className="text-sm text-gray-500 mb-8">Перетащите аудио или видео для транскрибации</p>

      <div
        {...getRootProps()}
        className={`relative rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 group ${
          isDragActive
            ? "bg-primary-50 border-2 border-primary-400 shadow-glow"
            : "border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/30"
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
            <div className="w-48 mx-auto bg-gray-200 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
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
                <span key={fmt} className="badge bg-surface-100 text-gray-500 !text-[10px]">{fmt}</span>
              ))}
            </div>
            <p className="text-xs text-gray-400">Максимум 500 МБ</p>
          </div>
        )}
      </div>

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

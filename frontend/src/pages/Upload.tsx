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
      <h1 className="text-2xl font-bold mb-6">Загрузить файл</h1>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition
          ${isDragActive ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-gray-400"}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <p className="text-gray-600 mb-4">Загрузка...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-lg text-gray-600 mb-2">
              {isDragActive
                ? "Отпустите файл здесь"
                : "Перетащите аудио/видео файл сюда"}
            </p>
            <p className="text-sm text-gray-400">
              или нажмите для выбора файла
            </p>
            <p className="text-xs text-gray-400 mt-2">
              MP3, WAV, FLAC, OGG, M4A, MP4, WebM, MOV (до 500 МБ)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mt-4 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

import api from "./client";

export interface Transcription {
  id: string;
  user_id: string;
  title: string;
  status: "queued" | "processing" | "completed" | "failed";
  language: string | null;
  duration_sec: number | null;
  original_filename: string;
  full_text: string | null;
  segments: Segment[] | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  // 152-ФЗ: срок хранения аудиофайла.
  audio_retention_days?: number;
  audio_delete_at?: string | null;
  audio_deleted_at?: string | null;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface TranscriptionListItem {
  id: string;
  title: string;
  status: string;
  language: string | null;
  duration_sec: number | null;
  original_filename: string;
  created_at: string;
  completed_at: string | null;
}

export interface PaginatedTranscriptions {
  items: TranscriptionListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AiAnalysis {
  id: string;
  transcription_id: string;
  type: string;
  content: string;
  model_used: string;
  tokens_used: number;
}

export interface ChatReference {
  chunk_text: string;
  start_time: number | null;
  end_time: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references: ChatReference[] | null;
  tokens_used: number;
  created_at: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  remaining_questions: number;
}

export const transcriptionApi = {
  uploadUrl: (url: string, language: string = "auto") =>
    api.post<{ id: string; status: string; message: string }>(
      "/transcriptions/upload-url",
      { url, language }
    ),

  upload: (
    file: File,
    onProgress?: (percent: number) => void,
    language: string = "auto"
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    return api.post<{ id: string; status: string; message: string }>(
      "/transcriptions/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress
          ? (e) => {
              const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
              onProgress(percent);
            }
          : undefined,
      }
    );
  },

  getById: (id: string) => api.get<Transcription>(`/transcriptions/${id}`),

  getStatus: (id: string) =>
    api.get<{ id: string; status: string; error_message: string | null }>(
      `/transcriptions/${id}/status`
    ),

  list: (limit = 20, offset = 0) =>
    api.get<PaginatedTranscriptions>("/transcriptions", {
      params: { limit, offset },
    }),

  delete: (id: string) => api.delete(`/transcriptions/${id}`),

  // 152-ФЗ: ручное удаление только аудио (текст транскрипции остаётся).
  deleteAudio: (id: string) => api.delete(`/transcriptions/${id}/audio`),

  // 152-ФЗ: изменение срока хранения аудио.
  updateRetention: (id: string, retentionDays: number) =>
    api.put(`/transcriptions/${id}/retention`, { retention_days: retentionDays }),

  getSummary: (id: string) =>
    api.get<AiAnalysis>(`/transcriptions/${id}/summary`),

  getKeyPoints: (id: string) =>
    api.get<AiAnalysis>(`/transcriptions/${id}/key-points`),

  getActionItems: (id: string) =>
    api.get<AiAnalysis>(`/transcriptions/${id}/action-items`),

  exportFile: (id: string, format: "txt" | "srt" | "docx") =>
    api.get(`/transcriptions/${id}/export/${format}`, { responseType: "blob" }),

  sendChatMessage: (id: string, message: string) =>
    api.post<ChatMessage>(`/transcriptions/${id}/chat`, { message }),

  getChatHistory: (id: string) =>
    api.get<ChatHistoryResponse>(`/transcriptions/${id}/chat`),

  getAudioUrl: (id: string) =>
    api.get<{ url: string; content_type: string }>(`/transcriptions/${id}/audio-url`),
};

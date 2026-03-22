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

export const transcriptionApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ id: string; status: string; message: string }>(
      "/transcriptions/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
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

  getSummary: (id: string) =>
    api.get<AiAnalysis>(`/transcriptions/${id}/summary`),

  getKeyPoints: (id: string) =>
    api.get<AiAnalysis>(`/transcriptions/${id}/key-points`),

  getActionItems: (id: string) =>
    api.get<AiAnalysis>(`/transcriptions/${id}/action-items`),

  exportFile: (id: string, format: "txt" | "srt") =>
    api.get(`/transcriptions/${id}/export/${format}`, { responseType: "blob" }),
};

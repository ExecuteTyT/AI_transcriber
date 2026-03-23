# RAG Chat — Design Spec

## Problem

Тарифы "Старт" и "Про" обещают RAG-чат по транскрипту, но фича не реализована. Это ключевая дифференциация продукта — пользователь задаёт вопросы по своему аудио/видео и получает ответы с цитатами из исходника.

## Solution

Lazy-embedding RAG-чат: embeddings создаются при первом вопросе к транскрипту, затем используются для vector search + GPT-4o-mini.

## Architecture

```
User question
    |
    v
POST /api/transcriptions/{id}/chat
    |
    v
[Embeddings exist?] --no--> Generate embeddings (chunk text → OpenAI → pgvector)
    |yes
    v
Embed question → cosine similarity → top-5 chunks
    |
    v
Build RAG prompt (system + chunks + question)
    |
    v
GPT-4o-mini → response + references
    |
    v
Save ChatMessage → return to user
```

## Data Models

### Embedding

```
embeddings table:
  id: UUID PK
  transcription_id: UUID FK → transcriptions (CASCADE)
  chunk_index: int
  chunk_text: text
  start_time: float (nullable)
  end_time: float (nullable)
  embedding: vector(1536)
  created_at: datetime

Index: ivfflat on embedding column using cosine distance
```

### ChatMessage

```
chat_messages table:
  id: UUID PK
  transcription_id: UUID FK → transcriptions (CASCADE)
  user_id: UUID FK → users (CASCADE)
  role: str (user/assistant)
  content: text
  references: JSONB (nullable) — [{chunk_index, chunk_text, start_time, end_time}]
  tokens_used: int (default 0)
  created_at: datetime
```

## Chunking Strategy

- Split `full_text` by segments (from transcription.segments JSONB)
- Group consecutive segments into chunks of ~500 tokens (~2000 chars)
- Overlap: include last segment of previous chunk in next chunk
- Preserve start_time/end_time from first/last segment in chunk
- If no segments, split full_text by paragraphs with 200-char overlap

## Embedding Generation (Lazy)

- Triggered on first POST to `/chat` when no embeddings exist for transcription_id
- Uses OpenAI `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens)
- Batch API call: all chunks in one request
- Store results in pgvector
- ~10-15 sec for typical 1-hour transcript

## RAG Pipeline

1. Embed user question (single OpenAI call)
2. pgvector cosine similarity search: `ORDER BY embedding <=> question_embedding LIMIT 5`
3. Build prompt:
   - System: "You are an assistant answering questions about a transcript. Use ONLY the provided context. Cite timestamps. Answer in the same language as the question."
   - Context: top-5 chunks with timestamps
   - User question
4. GPT-4o-mini call (~500 tokens response)
5. Extract references from used chunks
6. Save ChatMessage (role=user + role=assistant)

## Plan Limits

| Plan | Limit | Enforcement |
|------|-------|-------------|
| free | 0 | 403 "RAG-чат недоступен на бесплатном тарифе" |
| start | 5 per transcription | Count user messages per transcription_id |
| pro | unlimited (-1) | No limit check |

## API Endpoints

### POST /api/transcriptions/{id}/chat

Request: `{ "message": "О чём говорили в первые 10 минут?" }`

Response:
```json
{
  "id": "uuid",
  "role": "assistant",
  "content": "В первые 10 минут обсуждалась...",
  "references": [
    {"chunk_text": "...", "start_time": 12.5, "end_time": 45.0}
  ],
  "tokens_used": 342
}
```

Errors: 403 (plan limit / no access), 404 (transcription not found), 400 (transcription not completed)

### GET /api/transcriptions/{id}/chat

Response: `{ "messages": [...], "remaining_questions": 3 }`

Returns full chat history for this transcription + remaining question count.

## Frontend

### Chat Tab in Transcription.tsx

- New tab "Чат" (after "Action items")
- Tab type: `"chat"` added to Tab union
- Chat UI:
  - Message list (scrollable, newest at bottom)
  - Input field + send button at bottom
  - Loading state: "Подготовка чата..." on first question (embedding generation)
  - Loading state: typing indicator on subsequent questions
  - Each assistant message shows clickable references (timestamp links)
  - Remaining questions counter for Start plan
  - "Upgrade" prompt when limit reached

### API Client

Add to `transcriptions.ts`:
- `sendChatMessage(id, message)` → POST
- `getChatHistory(id)` → GET

## New Files

### Backend
- `backend/app/models/embedding.py`
- `backend/app/models/chat_message.py`
- `backend/app/schemas/chat.py`
- `backend/app/services/embeddings.py`
- `backend/app/services/rag_chat.py`
- `backend/app/api/chat.py`

### Frontend
- No new files — changes to Transcription.tsx and transcriptions.ts

## Config Additions

```python
# config.py
EMBEDDING_MODEL: str = "text-embedding-3-small"
EMBEDDING_DIMENSION: int = 1536
```

## Cost

- Embedding: ~$0.02/1M tokens → ~$0.001 per 1-hour transcript
- Chat: GPT-4o-mini ~$0.15/1M input + $0.60/1M output → ~$0.002 per question
- Total: negligible (~0.03 ₽ per question)

## Verification

1. Backend: `alembic upgrade head` creates tables with pgvector
2. API: POST chat message → 200 with response + references
3. API: GET chat history → returns messages
4. API: Free plan → 403
5. API: Start plan 6th question → 403
6. Frontend: tsc + build + vitest pass
7. Visual: chat tab renders, messages display, references clickable

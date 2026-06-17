"""HTTP-клиент к внутреннему API Dicto.

Бот = тонкий клиент: на каждого telegram-юзера минтит JWT через
/api/integrations/telegram/auth и дальше дёргает обычные ручки. Токены
кэшируются в памяти процесса (per telegram_id); на 401 — refresh, при неудаче
повторный auth. Бизнес-логика (гейты/лимиты/пейволл/платежи) — на бэке.
"""
import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


@dataclass
class _Tokens:
    access: str
    refresh: str


class DictoClient:
    def __init__(self, base_url: str, bot_secret: str):
        self._http = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=180)
        self._secret = bot_secret
        self._tokens: dict[int, _Tokens] = {}

    async def aclose(self) -> None:
        await self._http.aclose()

    # ─── Auth ───

    async def auth(self, telegram_id: int, name: str = "", link_code: str | None = None) -> dict:
        """Идентификация в Dicto: вернёт инфо об аккаунте и закэширует токены."""
        r = await self._http.post(
            "/api/integrations/telegram/auth",
            headers={"X-Bot-Secret": self._secret},
            json={"telegram_id": telegram_id, "tg_name": name, "link_code": link_code},
        )
        r.raise_for_status()
        data = r.json()
        self._tokens[telegram_id] = _Tokens(data["access_token"], data["refresh_token"])
        return data

    async def _ensure(self, telegram_id: int) -> None:
        if telegram_id not in self._tokens:
            await self.auth(telegram_id)

    async def _refresh(self, telegram_id: int) -> None:
        tok = self._tokens.get(telegram_id)
        if tok is None:
            await self.auth(telegram_id)
            return
        r = await self._http.post("/api/auth/refresh", json={"refresh_token": tok.refresh})
        if r.status_code == 200:
            d = r.json()
            self._tokens[telegram_id] = _Tokens(d["access_token"], d["refresh_token"])
        else:
            await self.auth(telegram_id)

    async def _req(self, telegram_id: int, method: str, path: str, **kw) -> httpx.Response:
        await self._ensure(telegram_id)
        headers = {"Authorization": f"Bearer {self._tokens[telegram_id].access}", **kw.pop("headers", {})}
        r = await self._http.request(method, path, headers=headers, **kw)
        if r.status_code == 401:
            await self._refresh(telegram_id)
            headers["Authorization"] = f"Bearer {self._tokens[telegram_id].access}"
            r = await self._http.request(method, path, headers=headers, **kw)
        return r

    # ─── Transcription ───

    async def upload_file(self, telegram_id: int, filename: str, file_path: str,
                          content_type: str = "application/octet-stream", language: str = "auto") -> httpx.Response:
        # Стримим файл с диска (не грузим целиком в память — важно для больших файлов).
        # content_type обязателен: бэкенд валидирует MIME (audio/ogg, audio/mpeg, video/mp4 …).
        with open(file_path, "rb") as fh:
            files = {"file": (filename, fh, content_type)}
            return await self._req(telegram_id, "POST", "/api/transcriptions/upload",
                                   files=files, data={"language": language})

    async def upload_url(self, telegram_id: int, url: str, language: str = "auto") -> httpx.Response:
        return await self._req(telegram_id, "POST", "/api/transcriptions/upload-url",
                               json={"url": url, "language": language})

    async def get_status(self, telegram_id: int, tid: str) -> httpx.Response:
        return await self._req(telegram_id, "GET", f"/api/transcriptions/{tid}/status")

    async def get_transcription(self, telegram_id: int, tid: str) -> httpx.Response:
        return await self._req(telegram_id, "GET", f"/api/transcriptions/{tid}")

    async def get_analysis(self, telegram_id: int, tid: str, kind: str, length: str = "standard") -> httpx.Response:
        return await self._req(telegram_id, "GET", f"/api/transcriptions/{tid}/{kind}",
                               params={"length": length})

    async def chat(self, telegram_id: int, tid: str, message: str) -> httpx.Response:
        return await self._req(telegram_id, "POST", f"/api/transcriptions/{tid}/chat",
                               json={"message": message})

    # ─── Account / payments ───

    async def get_me(self, telegram_id: int) -> httpx.Response:
        return await self._req(telegram_id, "GET", "/api/auth/me")

    async def topup(self, telegram_id: int, pack: str) -> httpx.Response:
        return await self._req(telegram_id, "POST", "/api/payments/wallet", json={"pack": pack})

    async def subscribe(self, telegram_id: int, plan: str) -> httpx.Response:
        return await self._req(telegram_id, "POST", "/api/payments/subscribe", json={"plan": plan})

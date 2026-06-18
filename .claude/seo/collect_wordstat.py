"""Сбор семантического ядра Dicto из Yandex Wordstat (v4 API, токен Директа).

CreateNewWordstatReport (до 5 в очереди) → poll GetWordstatReportList →
GetWordstatReport → DeleteWordstatReport (освободить слот). Регион — Россия (225).
Результат → .claude/seo/wordstat-core.json: {seed: [{phrase, shows}, ...]}.
"""
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKEN = json.loads((ROOT / ".claude/yandex-direct.json").read_text(encoding="utf-8"))["direct_token"]
H = "https://api.direct.yandex.ru/v4/json/"
GEO = [225]  # Россия

SEEDS = [
    "транскрибация", "расшифровка аудио", "аудио в текст", "перевести аудио в текст",
    "голос в текст", "распознавание речи", "субтитры", "протокол совещания",
    "расшифровка интервью", "запись звонка в текст", "нейросеть для текста",
    "диктофон в текст", "видео в текст", "youtube в текст", "zoom расшифровка",
    "стенограмма", "mp3 в текст", "расшифровка лекции",
]


def call(method, param=None):
    body = {"method": method, "token": TOKEN}
    if param is not None:
        body["param"] = param
    req = urllib.request.Request(
        H, data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    for attempt in range(3):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read().decode("utf-8"))
        except Exception as e:
            if attempt == 2:
                return {"error": str(e)}
            time.sleep(5)


def main():
    core = {}
    queue = list(SEEDS)
    pending = {}  # ReportID -> seed

    while queue or pending:
        # Заполняем очередь до 5 активных отчётов.
        while queue and len(pending) < 5:
            seed = queue.pop(0)
            r = call("CreateNewWordstatReport", {"Phrases": [seed], "GeoID": GEO})
            rid = r.get("data")
            if isinstance(rid, int):
                pending[rid] = seed
                print(f"created {rid} <- {seed}")
            else:
                print(f"create failed for {seed}: {r}")
            time.sleep(1)

        time.sleep(8)
        lst = call("GetWordstatReportList")
        status = {x["ReportID"]: x["StatusReport"] for x in lst.get("data", [])}

        for rid, seed in list(pending.items()):
            if status.get(rid) != "Done":
                continue
            rep = call("GetWordstatReport", rid)
            rows = []
            for block in rep.get("data", []):
                for item in block.get("SearchedWith", []):
                    rows.append({"phrase": item["Phrase"], "shows": item["Shows"]})
            core[seed] = sorted(rows, key=lambda x: -x["shows"])
            print(f"done {seed}: {len(rows)} queries")
            call("DeleteWordstatReport", rid)
            del pending[rid]

    out = ROOT / ".claude/seo/wordstat-core.json"
    out.write_text(json.dumps(core, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(len(v) for v in core.values())
    print(f"\nSEED'ов: {len(core)} · всего строк: {total} · файл: {out}")


if __name__ == "__main__":
    main()

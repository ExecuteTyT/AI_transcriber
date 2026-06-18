"""Кластеризация ядра + карта на страницы. Вход: wordstat-core.json.
Выход: docs/seo/semantic-core.md (артефакт) + сводка в консоль.

Логика: дедуп запросов (max shows), отсев мусора, привязка к кластеру по
токенам (специфичные раньше общих), сумма частот по кластеру, топ-запросы,
покрытие существующей SEO-страницей (slug) либо пометка GAP.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
core = json.loads((ROOT / ".claude/seo/wordstat-core.json").read_text(encoding="utf-8"))

# Дедуп: phrase -> max shows.
flat: dict[str, int] = {}
for rows in core.values():
    for r in rows:
        p = r["phrase"].strip().lower()
        flat[p] = max(flat.get(p, 0), r["shows"])

# Отсев явного мусора (не наш интент).
JUNK = ("вакансии", "вакансия", "работа", "подработк", "заработок", "заработать",
        "транскрибатор", "резюме", "фриланс", "курсы", "обучение", "профессия",
        "скачать программу", "программа скачать", "торрент", "balabolka", "говорилка",
        "озвучка", "синтез речи", "текст в речь", "текст в аудио", "текст в голос",
        "из текста в", "написать текст", "песни", "караоке", "майнкрафт", "игра")


def is_junk(p: str) -> bool:
    return any(j in p for j in JUNK)


# Кластеры: (имя, slug-страницы или None=GAP, список токен-групп — запрос
# матчится если содержит ВСЕ токены хотя бы одной группы). Порядок = приоритет
# (специфичные раньше общих).
CLUSTERS = [
    ("YouTube → текст", "/youtube-v-tekst", [["youtube"], ["ютуб"]]),
    ("Zoom / созвоны", "/zoom-v-tekst", [["zoom"], ["зум"], ["созвон"], ["звонк"]]),
    ("MP3 → текст", "/mp3-v-tekst", [["mp3"]]),
    ("Диктофон → текст", "/diktofon-v-tekst", [["диктофон"]]),
    ("Субтитры", "/subtitry-dlya-video", [["субтитр"]]),
    ("Протокол совещания", "/protokol-soveshchaniya", [["совещани"], ["протокол"], ["митинг"], ["планёрк"], ["планерк"]]),
    ("Интервью", "/rasshifrovka-intervyu", [["интервью"]]),
    ("Лекции", "/dlya-lekcij", [["лекци"], ["вебинар"], ["семинар"]]),
    ("Подкасты", "/dlya-podkastov", [["подкаст"]]),
    ("Суд/стенограмма", None, [["стенограмм"], ["суд"], ["заседани"]]),
    ("Голосовые", "/rasshifrovka-golosovyh", [["голосов"]]),
    ("Перевод аудио в текст", "/perevod-audio-v-tekst", [["перевод", "аудио"], ["перевести", "аудио"], ["перевод", "видео"]]),
    ("Английский", "/anglijskij-yazyk", [["английск"], ["english"]]),
    ("Немецкий", "/nemeckij-yazyk", [["немецк"]]),
    ("Французский", "/francuzskij-yazyk", [["французск"]]),
    ("Казахский", "/kazahskij-yazyk", [["казахск"], ["казах"]]),
    ("Бесплатно", "/audio-v-tekst-besplatno", [["бесплатн"]]),
    ("Без регистрации", "/bez-registracii", [["без регистрац"]]),
    ("Онлайн", "/transkribaciya-onlayn", [["онлайн"]]),
    ("Нейросеть/ИИ", "/nejroset-transkribaciya", [["нейросет"], ["нейросеть"], ["ии "], [" ии"], ["искусствен"]]),
    ("Распознавание речи", "/raspoznavanie-rechi", [["распознавани"], ["speech to text"], ["speech-to-text"]]),
    ("Видео → текст", "/video-v-tekst", [["видео"]]),
    ("Аудио → текст", "/audio-v-tekst", [["аудио"]]),
    ("Расшифровка (общее)", "/rasshifrovka-audio", [["расшифров"]]),
    ("Транскрибация (общее)", "/transkribaciya", [["транскрибаци"], ["транскрипци"]]),
]


def match(p: str, groups) -> bool:
    return any(all(tok in p for tok in g) for g in groups)


assigned = {}  # cluster_name -> {"slug":, "queries":[(phrase,shows)]}
unmatched = []
for p, shows in flat.items():
    if is_junk(p):
        continue
    for name, slug, groups in CLUSTERS:
        if match(p, groups):
            assigned.setdefault(name, {"slug": slug, "q": []})["q"].append((p, shows))
            break
    else:
        unmatched.append((p, shows))

# Отчёт.
lines = ["# Семантическое ядро Dicto (Wordstat, регион Россия)\n",
         f"Источник: v4 Wordstat API. Уникальных запросов после дедупа/чистки: "
         f"{sum(len(v['q']) for v in assigned.values())}.\n",
         "Частоты — «показов/мес» (широкое соответствие). Кластер → целевая страница.\n"]
ranked = sorted(assigned.items(), key=lambda kv: -sum(s for _, s in kv[1]["q"]))
for name, data in ranked:
    total = sum(s for _, s in data["q"])
    page = data["slug"] or "❗ НЕТ СТРАНИЦЫ (GAP)"
    lines.append(f"\n## {name} — {total:,} показов/мес → {page}".replace(",", " "))
    lines.append(f"запросов в кластере: {len(data['q'])}")
    for p, s in sorted(data["q"], key=lambda x: -x[1])[:12]:
        lines.append(f"- {s:>7} · {p}".replace(" ", " ", 1))
lines.append("\n## Не привязано к кластеру (топ-30) — кандидаты на новые страницы")
for p, s in sorted(unmatched, key=lambda x: -x[1])[:30]:
    lines.append(f"- {s:>7} · {p}")

out = ROOT / "docs/seo/semantic-core.md"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(lines), encoding="utf-8")

# Консольная сводка.
print("КЛАСТЕР                         ПОКАЗОВ/МЕС   ЗАПРОСОВ   СТРАНИЦА")
for name, data in ranked:
    total = sum(s for _, s in data["q"])
    print(f"{name:<30} {total:>11}   {len(data['q']):>7}   {data['slug'] or 'GAP ❗'}")
print(f"\nНе привязано: {len(unmatched)} запросов. Артефакт: {out}")

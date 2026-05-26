#!/usr/bin/env bash
# Еженедельный аудит кампаний Яндекс.Директа для Dicto.
#
# Что делает:
#   1. Выгружает поисковые запросы за 7 дней (SEARCH_QUERY_PERFORMANCE_REPORT)
#      → кандидаты в минус-слова (Cost высокий, кликов мало).
#   2. Выгружает площадки РСЯ (CUSTOM_REPORT, AdNetworkType=AD_NETWORK)
#      → кандидаты в ExcludedSites (расход без отдачи).
#   3. Сверяет расход Директа с визитами/конверсиями через Метрику.
#   4. Печатает сводку. НИЧЕГО не меняет автоматически — только отчёт.
#
# Токен и ID читаются из .claude/yandex-direct.json (в .gitignore, не коммитим).
# Запуск:  bash scripts/direct-weekly-audit.sh
# Требует: jq, curl.

set -euo pipefail

CONFIG=".claude/yandex-direct.json"
if [ ! -f "$CONFIG" ]; then
  echo "❌ Нет $CONFIG — сначала создай конфиг с токеном (см. план/api-setup.md)." >&2
  exit 1
fi

command -v jq  >/dev/null || { echo "❌ Нужен jq"  >&2; exit 1; }
command -v curl >/dev/null || { echo "❌ Нужен curl" >&2; exit 1; }

TOKEN=$(jq -r '.direct_token' "$CONFIG")
COUNTER_ID=$(jq -r '.metrika_counter_id' "$CONFIG")
CAMPAIGN_ID=$(jq -r '.campaign_ids[0] // empty' "$CONFIG")
CLIENT_LOGIN=$(jq -r '.client_login // empty' "$CONFIG")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ direct_token пустой в $CONFIG" >&2; exit 1
fi
if [ -z "$CAMPAIGN_ID" ]; then
  echo "⚠️  campaign_ids пуст — кампания ещё не создана. Аудит запросов недоступен." >&2
fi

DIRECT_API="https://api.direct.yandex.ru/json/v5"
METRIKA_API="https://api-metrika.yandex.net"
DATE_FROM=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)
DATE_TO=$(date +%Y-%m-%d)

# --- Обработка ошибок Direct: распарсить error_code из JSON-ответа ---
check_direct_error() {
  local body="$1"
  local code
  code=$(echo "$body" | jq -r '.error.error_code // empty' 2>/dev/null || true)
  case "$code" in
    "") return 0 ;;  # нет ошибки
    53)  echo "❌ Код 53: токен невалиден/истёк. Перевыпусти OAuth-токен." >&2; exit 1 ;;
    58)  echo "❌ Код 58: API-доступ не одобрен для приложения." >&2; exit 1 ;;
    152) echo "⚠️  Код 152: лимит баллов. Подожди минуту и повтори." >&2; return 1 ;;
    *)   echo "⚠️  Direct error_code=$code: $(echo "$body" | jq -r '.error.error_string // ""')" >&2; return 1 ;;
  esac
}

# --- Reports API: запрос с авто-режимом (ждёт готовности отчёта) ---
direct_report() {
  local payload="$1"
  curl -sS -X POST "$DIRECT_API/reports" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept-Language: ru" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "processingMode: auto" \
    -H "returnMoneyInMicros: false" \
    --data-binary "$payload"
}

echo "════════════════════════════════════════════════════════════"
echo "  Аудит Директа Dicto  |  $DATE_FROM → $DATE_TO"
echo "════════════════════════════════════════════════════════════"

if [ -n "$CAMPAIGN_ID" ]; then
  echo ""
  echo "── [1] Поисковые запросы (кандидаты в минус-слова) ──"
  QPAYLOAD=$(cat <<EOF
{"params":{
  "SelectionCriteria":{"DateFrom":"$DATE_FROM","DateTo":"$DATE_TO",
    "Filter":[{"Field":"CampaignId","Operator":"EQUALS","Values":["$CAMPAIGN_ID"]}]},
  "FieldNames":["Query","Impressions","Clicks","Cost"],
  "ReportName":"sq_$(date +%s)","ReportType":"SEARCH_QUERY_PERFORMANCE_REPORT",
  "DateRangeType":"CUSTOM_DATE","Format":"TSV","IncludeVAT":"YES","IncludeDiscount":"NO"
}}
EOF
)
  SQ=$(direct_report "$QPAYLOAD")
  if echo "$SQ" | head -1 | grep -q '{"error"'; then
    check_direct_error "$SQ" || true
  else
    # топ-15 запросов по расходу (пропускаем 2 строки шапки TSV)
    echo "$SQ" | tail -n +3 | sort -t$'\t' -k4 -rn | head -15 \
      | awk -F'\t' 'BEGIN{printf "%-45s %6s %6s %9s\n","Запрос","Показ","Клик","Расход"}
                    {printf "%-45s %6s %6s %9s\n",$1,$2,$3,$4}'
    echo "→ Нерелевантные с высоким расходом и без целей — в минус-слова (cookbook 1.5)."
  fi

  echo ""
  echo "── [2] Площадки РСЯ (кандидаты в ExcludedSites) ──"
  PPAYLOAD=$(cat <<EOF
{"params":{
  "SelectionCriteria":{"DateFrom":"$DATE_FROM","DateTo":"$DATE_TO",
    "Filter":[{"Field":"CampaignId","Operator":"EQUALS","Values":["$CAMPAIGN_ID"]},
              {"Field":"AdNetworkType","Operator":"EQUALS","Values":["AD_NETWORK"]}]},
  "FieldNames":["Placement","Impressions","Clicks","Cost"],
  "ReportName":"pl_$(date +%s)","ReportType":"CUSTOM_REPORT",
  "DateRangeType":"CUSTOM_DATE","Format":"TSV","IncludeVAT":"YES","IncludeDiscount":"NO"
}}
EOF
)
  PL=$(direct_report "$PPAYLOAD")
  if echo "$PL" | head -1 | grep -q '{"error"'; then
    check_direct_error "$PL" || true
  else
    echo "$PL" | tail -n +3 | sort -t$'\t' -k4 -rn | head -15 \
      | awk -F'\t' 'BEGIN{printf "%-45s %6s %6s %9s\n","Площадка","Показ","Клик","Расход"}
                    {printf "%-45s %6s %6s %9s\n",$1,$2,$3,$4}'
    echo "→ Топ-расходные площадки с 0 конверсий — в ExcludedSites (cookbook 1.7)."
  fi
fi

echo ""
echo "── [3] Метрика: конверсии из рекламы за 7 дней ──"
MQ=$(curl -sS -G "$METRIKA_API/stat/v1/data" \
  -H "Authorization: OAuth $TOKEN" \
  --data-urlencode "ids=$COUNTER_ID" \
  --data-urlencode "metrics=ym:s:visits,ym:s:users" \
  --data-urlencode "dimensions=ym:s:lastsignTrafficSource" \
  --data-urlencode "filters=ym:s:lastsignTrafficSource=='ad'" \
  --data-urlencode "date1=${DATE_FROM}" \
  --data-urlencode "date2=${DATE_TO}" 2>/dev/null || true)
if echo "$MQ" | jq -e '.data' >/dev/null 2>&1; then
  echo "$MQ" | jq -r '.data[] | "Визитов из рекламы: \(.metrics[0]) | Юзеров: \(.metrics[1])"' 2>/dev/null \
    || echo "Нет данных по рекламному трафику за период."
else
  echo "⚠️  Метрика не ответила (проверь скоуп metrika:read у токена)."
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Готово. Изменения вносить вручную после ревью (cookbook 8.3)."
echo "════════════════════════════════════════════════════════════"

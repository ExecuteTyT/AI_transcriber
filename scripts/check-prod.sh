#!/usr/bin/env bash
# Smoke-проверка production-инфраструктуры Dicto после деплоя.
# Запуск: ./scripts/check-prod.sh [HOST]
# По умолчанию HOST=https://dicto.pro

set -uo pipefail

HOST="${1:-https://dicto.pro}"
FAIL=0

ok()  { printf "\e[32m✓\e[0m %s\n" "$*"; }
bad() { printf "\e[31m✗\e[0m %s\n" "$*"; FAIL=$((FAIL+1)); }
sec() { printf "\n\e[36m── %s ──\e[0m\n" "$*"; }

echo "Target: $HOST"

# ─── 1. SSL validity ───
sec "SSL"
HOSTNAME="${HOST#https://}"
HOSTNAME="${HOSTNAME#http://}"
END_DATE=$(echo | openssl s_client -servername "$HOSTNAME" -connect "$HOSTNAME:443" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [[ -n "$END_DATE" ]]; then
  END_TS=$(date -d "$END_DATE" +%s 2>/dev/null || echo 0)
  NOW_TS=$(date +%s)
  LEFT=$(( (END_TS - NOW_TS) / 86400 ))
  if [[ $LEFT -gt 14 ]]; then
    ok "SSL valid — $LEFT days left (until $END_DATE)"
  elif [[ $LEFT -gt 0 ]]; then
    bad "SSL expires SOON — only $LEFT days left"
  else
    bad "SSL EXPIRED ($END_DATE)"
  fi
else
  bad "Could not read SSL cert"
fi

# ─── 2. HTTPS reachability ───
sec "HTTPS endpoints"
LANDING=$(curl -skI "$HOST/" -o /dev/null -w "%{http_code}")
[[ "$LANDING" == "200" ]] && ok "Landing / → 200" || bad "Landing / → $LANDING (expected 200)"

DOCS=$(curl -skI "$HOST/docs" -o /dev/null -w "%{http_code}")
[[ "$DOCS" == "200" ]] && ok "/docs → 200" || bad "/docs → $DOCS (expected 200)"

# ─── 3. API auth enforcement ───
sec "API auth"
UNAUTH=$(curl -sk -o /dev/null -w "%{http_code}" "$HOST/api/transcriptions")
# FastAPI HTTPBearer → 403 by default, кастомные → 401; оба валидны (главное — не 200/500).
if [[ "$UNAUTH" == "401" || "$UNAUTH" == "403" ]]; then
  ok "/api/transcriptions requires auth (HTTP $UNAUTH)"
else
  bad "/api/transcriptions unauth → $UNAUTH (expected 401/403)"
fi

# ─── 4. OpenAPI schema ───
sec "OpenAPI schema"

# Подобрать python-интерпретатор (python3 / python / py).
PY=""
for cand in python3 python py; do
  if command -v "$cand" >/dev/null 2>&1; then PY="$cand"; break; fi
done

REQUIRED=(
  "/api/auth/register"
  "/api/auth/login"
  "/api/auth/refresh"
  "/api/transcriptions/upload"
  "/api/transcriptions/media/stream"
  "/api/transcriptions/{transcription_id}/audio-url"
  "/api/transcriptions/{transcription_id}/export/{format}"
  "/api/payments/subscribe"
  "/api/payments/webhook"
)

if [[ -z "$PY" ]]; then
  bad "python not found — skipping OpenAPI check"
else
  # JSON идёт через stdin — не ломается спецсимволами.
  MISSING=$(curl -sk "$HOST/openapi.json" | "$PY" -c "
import json, sys
try:
    data = json.load(sys.stdin)
except Exception as e:
    print(f'__parse_error__: {e}')
    sys.exit(0)
paths = data.get('paths', {})
required = sys.argv[1:]
missing = [p for p in required if p not in paths]
for m in missing:
    print(m)
" "${REQUIRED[@]}" 2>/dev/null)

  if [[ "$MISSING" == __parse_error__* ]]; then
    bad "openapi.json parse failed: ${MISSING#__parse_error__: }"
  elif [[ -z "$MISSING" ]]; then
    ok "All ${#REQUIRED[@]} critical endpoints present"
  else
    bad "Missing: $(echo $MISSING | tr '\n' ' ')"
  fi
fi

# ─── 5. Register endpoint reachable ───
sec "Register endpoint"
R=$(curl -sk -o /dev/null -w "%{http_code}" -X POST "$HOST/api/auth/register" \
  -H "Content-Type: application/json" -d '{"email":"smoke@test.invalid","password":"x"}')
# Любой код от API-слоя (400/409/422/429) означает endpoint жив; 502/503/504/000 — нет.
if [[ "$R" =~ ^(200|201|400|409|422|429)$ ]]; then
  ok "Register reachable (HTTP $R)"
else
  bad "Register unreachable (HTTP $R)"
fi

# ─── 6. Frontend branding ───
sec "Frontend"
HTML=$(curl -sk "$HOST/")
if echo "$HTML" | grep -q "Dicto"; then
  ok "Frontend carries 'Dicto' branding"
else
  bad "Frontend does not show 'Dicto' brand — stale deploy?"
fi
if echo "$HTML" | grep -qE "Voitra|Scribi"; then
  bad "Frontend still has 'Voitra'/'Scribi' references — brand rename incomplete"
else
  ok "No 'Voitra'/'Scribi' residue in index.html"
fi

# ─── 7. Response headers ───
sec "Security headers"
HEADERS=$(curl -skI "$HOST/")
check_header() {
  local name="$1"
  if echo "$HEADERS" | grep -qi "^$name:"; then
    ok "$name header present"
  else
    bad "$name header missing"
  fi
}
check_header "strict-transport-security"
check_header "x-content-type-options"
check_header "x-frame-options"

# ─── 8. Remote container health (optional) ───
if [[ -n "${PROD_SSH:-}" ]] && command -v ssh >/dev/null 2>&1; then
  sec "Remote containers"
  REMOTE=$(ssh -o BatchMode=yes -o ConnectTimeout=5 "$PROD_SSH" \
    "cd /opt/aivoice && docker compose -f docker-compose.prod.yml ps --format '{{.Name}} {{.Status}}'" 2>/dev/null || echo "")
  if [[ -z "$REMOTE" ]]; then
    bad "Could not SSH to $PROD_SSH"
  else
    UNHEALTHY=$(echo "$REMOTE" | grep -vE "(Up|healthy)" | grep -c .)
    if [[ "$UNHEALTHY" == "0" ]]; then
      ok "All containers Up/healthy"
    else
      bad "$UNHEALTHY containers not healthy"
      echo "$REMOTE" | grep -vE "(Up|healthy)" | sed 's/^/    /'
    fi
  fi
fi

# ─── Summary ───
echo
if [[ $FAIL -eq 0 ]]; then
  echo -e "\e[32m════════════════════════════════════\e[0m"
  echo -e "\e[32m  ALL SMOKE CHECKS PASSED\e[0m"
  echo -e "\e[32m════════════════════════════════════\e[0m"
  exit 0
else
  echo -e "\e[31m════════════════════════════════════\e[0m"
  echo -e "\e[31m  $FAIL CHECK(S) FAILED\e[0m"
  echo -e "\e[31m════════════════════════════════════\e[0m"
  exit 1
fi

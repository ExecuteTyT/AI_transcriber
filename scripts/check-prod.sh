#!/usr/bin/env bash
# Smoke-проверка production-инфраструктуры Scribi после деплоя.
# Запуск: ./scripts/check-prod.sh [HOST]
# По умолчанию HOST=https://voitra.pro

set -uo pipefail

HOST="${1:-https://voitra.pro}"
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
[[ "$UNAUTH" == "401" ]] && ok "/api/transcriptions unauth → 401" \
                         || bad "/api/transcriptions unauth → $UNAUTH (expected 401)"

# ─── 4. OpenAPI schema ───
sec "OpenAPI schema"
SCHEMA=$(curl -sk "$HOST/openapi.json")
if [[ -z "$SCHEMA" ]]; then
  bad "openapi.json empty"
else
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
  MISSING=$(python3 -c "
import json, sys
data = json.loads('''$SCHEMA''')
paths = data.get('paths', {})
for p in sys.argv[1:]:
    if p not in paths:
        print(p)
" "${REQUIRED[@]}" 2>/dev/null || echo "parse-error")
  if [[ -z "$MISSING" ]]; then
    ok "All $(echo ${REQUIRED[@]} | wc -w) critical endpoints present"
  elif [[ "$MISSING" == "parse-error" ]]; then
    bad "Could not parse openapi.json (python3 required)"
  else
    bad "Missing endpoints: $(echo $MISSING | tr '\n' ' ')"
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
if echo "$HTML" | grep -q "Scribi"; then
  ok "Frontend carries 'Scribi' branding"
else
  bad "Frontend does not show 'Scribi' brand — stale deploy?"
fi
if echo "$HTML" | grep -q "Voitra"; then
  bad "Frontend still has 'Voitra' references — brand rename incomplete"
else
  ok "No 'Voitra' residue in index.html"
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

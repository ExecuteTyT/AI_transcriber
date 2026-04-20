#!/bin/bash
set -euo pipefail

# ============================================================
# deploy.sh — Полная настройка нового сервера для Dicto (dicto.pro).
# Ubuntu 22.04/24.04. Запускать от root.
#
# Что делает:
#   1. Ставит Docker + git + firewall (22/80/443)
#   2. Клонирует репо в /opt/aivoice
#   3. Генерирует .env с безопасными секретами
#   4. Bootstrap-режим nginx (HTTP only) → получает SSL → возвращает prod-конфиг
#   5. Применяет миграции БД
#   6. Запускает весь prod-стек
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/ExecuteTyT/AI_transcriber/main/deploy.sh | \
#     bash -s -- <domain> <email>
#
# Пример:
#   bash deploy.sh dicto.pro islamsabirzyanov@gmail.com
#
# Предусловия:
#   - DNS для <domain> и www.<domain> уже указывает на IP сервера
#     (проверь: `dig <domain> +short`)
#   - После выполнения скрипта — отредактируй .env и поставь реальные API-ключи
#     (MISTRAL_API_KEY, GOOGLE_API_KEY, S3_*, YOOKASSA_*), затем перезапусти api.
# ============================================================

DOMAIN="${1:-dicto.pro}"
EMAIL="${2:-admin@${DOMAIN}}"
APP_DIR="/opt/aivoice"
REPO_URL="https://github.com/ExecuteTyT/AI_transcriber.git"
BRANCH="main"

if [[ $EUID -ne 0 ]]; then
    echo "ERR: запускать от root (sudo bash deploy.sh $DOMAIN $EMAIL)"
    exit 1
fi

echo "=== [1/7] Обновление системы и базовые пакеты ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl git ufw ca-certificates openssl dnsutils

echo "=== [2/7] Docker ==="
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi
docker --version
docker compose version

echo "=== [3/7] Firewall ==="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== [4/7] Клонирование репозитория ==="
if [[ -d "$APP_DIR/.git" ]]; then
    echo "Репо существует, обновляю main"
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    rm -rf "$APP_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "=== [5/7] .env с безопасными секретами ==="
if [[ ! -f .env ]]; then
    cp .env.example .env
    JWT_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -hex 16)
    GRAFANA_PASSWORD=$(openssl rand -hex 12)

    sed -i "s|JWT_SECRET_KEY=change-me-in-production|JWT_SECRET_KEY=$JWT_SECRET|" .env
    sed -i "s|POSTGRES_PASSWORD=aivoice|POSTGRES_PASSWORD=$DB_PASSWORD|" .env
    sed -i "s|postgresql+asyncpg://aivoice:aivoice@|postgresql+asyncpg://aivoice:$DB_PASSWORD@|" .env
    sed -i "s|ENVIRONMENT=development|ENVIRONMENT=production|" .env
    sed -i "s|APP_URL=http://localhost:3000.*|APP_URL=https://$DOMAIN|" .env
    sed -i "s|API_URL=http://localhost:8000.*|API_URL=https://$DOMAIN|" .env
    sed -i "s|GRAFANA_PASSWORD=change-me-in-production|GRAFANA_PASSWORD=$GRAFANA_PASSWORD|" .env

    echo "DB_PASSWORD=$DB_PASSWORD" > /root/dicto_secrets.txt
    echo "GRAFANA_PASSWORD=$GRAFANA_PASSWORD" >> /root/dicto_secrets.txt
    chmod 600 /root/dicto_secrets.txt
    echo "Пароли сохранены в /root/dicto_secrets.txt (chmod 600)"
else
    echo ".env существует, пропускаю генерацию секретов"
fi

# Подставляем домен в nginx.prod.conf (он жёстко вшит на dicto.pro — меняем если другой)
if [[ "$DOMAIN" != "dicto.pro" ]]; then
    sed -i "s|dicto\\.pro|$DOMAIN|g" nginx.prod.conf
fi

echo "=== [6/7] Bootstrap SSL (временный HTTP-only nginx → certbot → prod-конфиг) ==="

# Проверяем DNS
DNS_IP=$(dig +short "$DOMAIN" | tail -n 1)
SERVER_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com)
if [[ "$DNS_IP" != "$SERVER_IP" ]]; then
    echo "ВНИМАНИЕ: DNS $DOMAIN = $DNS_IP, а сервер = $SERVER_IP"
    echo "Проверь A-запись в DNS-панели. Продолжаю без SSL (получишь позже вручную)."
    SKIP_SSL=1
else
    echo "DNS ok: $DOMAIN → $SERVER_IP"
    SKIP_SSL=0
fi

# Бэкапим prod-конфиг и ставим bootstrap (HTTP-only, только ACME challenge)
cp nginx.prod.conf nginx.prod.conf.bak
cat > nginx.prod.conf <<NGINX_EOF
resolver 127.0.0.11 valid=10s;

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "bootstrap\n";
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# Поднимаем минимум для ACME challenge
echo "Запуск инфры..."
docker compose -f docker-compose.prod.yml up -d db redis
echo "Ждём healthcheck БД..."
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml ps db | grep -q healthy; then break; fi
    sleep 2
done

echo "Build и запуск api + celery + frontend..."
docker compose -f docker-compose.prod.yml up -d --build api celery celery-beat frontend

echo "Применяем миграции..."
sleep 5
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

echo "Запускаем nginx (bootstrap)..."
docker compose -f docker-compose.prod.yml up -d nginx
sleep 5

# SSL
if [[ "$SKIP_SSL" == "0" ]]; then
    echo "Выдаём SSL для $DOMAIN..."
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot -w /var/www/certbot \
        -d "$DOMAIN" -d "www.$DOMAIN" \
        --email "$EMAIL" --agree-tos --no-eff-email \
        --non-interactive || {
            echo "ОШИБКА: certbot не получил серт. Проверь DNS и порт 80."
            echo "Можешь выдать позже: docker compose -f docker-compose.prod.yml run --rm certbot ..."
        }

    echo "Возвращаем prod-конфиг nginx и перезапускаем..."
    mv nginx.prod.conf.bak nginx.prod.conf
    docker compose -f docker-compose.prod.yml restart nginx
else
    echo "SSL пропущен (DNS не готов). nginx остался в bootstrap-режиме."
    echo "После обновления DNS выполни:"
    echo "  cd $APP_DIR && docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email"
    echo "  mv nginx.prod.conf.bak nginx.prod.conf"
    echo "  docker compose -f docker-compose.prod.yml restart nginx"
fi

echo "=== [7/7] Monitoring + certbot auto-renewal ==="
docker compose -f docker-compose.prod.yml up -d prometheus grafana redis-exporter certbot

echo ""
echo "================================================================"
echo "  Deploy завершён. Проверки:"
echo ""
echo "  docker compose -f $APP_DIR/docker-compose.prod.yml ps"
echo "  bash $APP_DIR/scripts/check-prod.sh https://$DOMAIN"
echo ""
echo "  Следующие шаги:"
echo "  1. nano $APP_DIR/.env"
echo "     Заполнить:"
echo "       MISTRAL_API_KEY, GOOGLE_API_KEY,"
echo "       S3_ACCESS_KEY / S3_SECRET_KEY (Selectel),"
echo "       YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY (после ИП),"
echo "       SMTP_USER / SMTP_PASSWORD (для welcome-email)."
echo ""
echo "  2. Рестарт api с новыми ключами:"
echo "     cd $APP_DIR"
echo "     docker compose -f docker-compose.prod.yml restart api celery"
echo ""
echo "  3. Открыть https://$DOMAIN — должно работать."
echo ""
echo "  Пароли сохранены в /root/dicto_secrets.txt"
echo "================================================================"

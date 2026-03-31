#!/bin/bash
set -euo pipefail

# ============================================================
# deploy.sh — Первичная настройка сервера и деплой AI Voice
# Запускать на чистом Ubuntu 22.04/24.04 от root
# Usage: curl -sL <url> | bash  ИЛИ  bash deploy.sh
# ============================================================

APP_DIR="/opt/aivoice"
REPO_URL="https://github.com/ExecuteTyT/AI_transcriber.git"
BRANCH="main"

echo "=== [1/5] Обновление системы и установка зависимостей ==="
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw

echo "=== [2/5] Установка Docker ==="
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    echo "Docker установлен: $(docker --version)"
else
    echo "Docker уже установлен: $(docker --version)"
fi

echo "=== [3/5] Настройка firewall ==="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall настроен (SSH + HTTP + HTTPS)"

echo "=== [4/5] Клонирование репозитория ==="
if [ -d "$APP_DIR" ]; then
    echo "Директория $APP_DIR уже существует, обновляю..."
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "=== [5/5] Подготовка .env ==="
if [ ! -f .env ]; then
    cp .env.example .env
    # Генерируем безопасный JWT-секрет и пароль БД
    JWT_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -hex 16)
    sed -i "s|JWT_SECRET_KEY=change-me-in-production|JWT_SECRET_KEY=$JWT_SECRET|" .env
    sed -i "s|POSTGRES_PASSWORD=aivoice|POSTGRES_PASSWORD=$DB_PASSWORD|" .env
    # Обновляем DATABASE_URL с новым паролем
    sed -i "s|postgresql+asyncpg://aivoice:aivoice@|postgresql+asyncpg://aivoice:$DB_PASSWORD@|" .env
    sed -i "s|ENVIRONMENT=development|ENVIRONMENT=production|" .env
    sed -i "s|APP_URL=http://localhost:3000|APP_URL=https://voitra.pro|" .env
    sed -i "s|API_URL=http://localhost:8000|API_URL=https://voitra.pro|" .env
    echo ""
    echo "========================================="
    echo "  .env создан с безопасными секретами"
    echo "  ОБЯЗАТЕЛЬНО отредактируй .env:"
    echo "  - MISTRAL_API_KEY"
    echo "  - GOOGLE_API_KEY"
    echo "  - OPENAI_API_KEY"
    echo "  - APP_URL / API_URL (твой домен)"
    echo "  - S3_* (если используешь S3)"
    echo "  - SMTP_* (если нужна почта)"
    echo "  - YOOKASSA_* (если нужна оплата)"
    echo "========================================="
    echo ""
else
    echo ".env уже существует, пропускаю"
fi

echo ""
echo "============================================"
echo "  Сервер готов! Дальнейшие шаги:"
echo ""
echo "  1. Отредактируй .env:"
echo "     nano $APP_DIR/.env"
echo ""
echo "  2. Запусти сервисы:"
echo "     cd $APP_DIR"
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  3. Примени миграции БД:"
echo "     docker compose -f docker-compose.prod.yml exec api alembic upgrade head"
echo ""
echo "  4. (Опционально) Получи SSL-сертификат:"
echo "     # Сначала привяжи домен A-записью к IP сервера"
echo "     # Затем:"
echo "     docker compose -f docker-compose.prod.yml run --rm certbot \\"
echo "       certonly --webroot -w /var/www/certbot \\"
echo "       -d voitra.pro --email YOUR_EMAIL --agree-tos"
echo ""
echo "     # Раскомментируй HTTPS-блок в nginx.prod.conf"
echo "     # Перезапусти nginx:"
echo "     docker compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "============================================"

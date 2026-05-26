# Миграция compute: Selectel → Beget VPS

**Цель:** перенести Docker-стек dicto.pro со старого сервера (Selectel, 176.114.69.152)
на новый Beget VPS. **S3-хранилище остаётся на Selectel** — в `.env` ничего про S3 не меняем.

**Принцип минимального простоя:** новый сервер готовим полностью (код + данные + SSL),
и только в конце переключаем DNS. Старый сервер не гасим ещё 3–5 дней (откат + DNS TTL).

**Что переносим:**
| Данные | Как | Критичность |
|---|---|---|
| Postgres (юзеры, транскрипции, подписки) | pg_dump → restore | 🔴 критично |
| `.env` (секреты) | scp | 🔴 критично |
| audit_logs (152-ФЗ журнал) | tar через docker volume | 🟡 для комплаенса |
| SSL-сертификаты Let's Encrypt | tar через docker volume | 🟢 чтобы HTTPS не отвалился |
| Redis | НЕ переносим (кэш + брокер, эфемерный) | — |
| Prometheus / Grafana | НЕ переносим (история метрик) | — |
| uploads volume | временные файлы, аудио в S3 — можно пропустить | — |

---

## Фаза 0 — За сутки до миграции: снизить DNS TTL

В панели управления DNS домена dicto.pro (где делегирован домен) поставить TTL
A-записей `dicto.pro` и `admin.dicto.pro` = **300 секунд** (5 минут).
Это ускорит переключение в конце. Сделать заранее, чтобы старый TTL успел истечь.

---

## Фаза 1 — Заказать и подготовить Beget VPS

1. Beget → Облачные VPS → создать сервер:
   - **OS:** Ubuntu 22.04 LTS
   - **Конфиг:** не меньше **4 vCPU / 8 ГБ RAM / 80 ГБ SSD** (под текущий стек; если убрать
     мониторинг — хватит 4 ГБ, но 8 даёт запас на `vite build`)
   - SSH-ключ добавить при создании
2. Записать **новый IP** (далее `NEW_IP`).
3. Зайти на новый сервер и поставить Docker:

```bash
ssh root@NEW_IP

apt update && apt upgrade -y
# Docker + compose plugin
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git
docker --version && docker compose version

# firewall: только SSH + HTTP + HTTPS
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

---

## Фаза 2 — Код и секреты на новый сервер

```bash
# на НОВОМ сервере
mkdir -p /opt/aivoice && cd /opt/aivoice
git clone https://github.com/ExecuteTyT/AI_transcriber.git .
git checkout main
```

`.env` НЕ в git — копируем со старого сервера. **С локальной машины** (где есть SSH-доступ к обоим):

```bash
# со СТАРОГО на локальную, потом на НОВЫЙ (через scp -3 напрямую)
scp -3 root@176.114.69.152:/opt/aivoice/.env root@NEW_IP:/opt/aivoice/.env
```

> Если `scp -3` недоступен — скопируй `.env` со старого на свою машину, потом на новый.
> **Не коммить .env в git, не пересылай через мессенджеры.**

В `.env` менять ничего не нужно: `APP_URL`, `API_URL`, S3-креды, домены остаются те же
(домен dicto.pro не меняется, только IP).

---

## Фаза 3 — Перенести базу Postgres

**На СТАРОМ сервере** — снять дамп:

```bash
cd /opt/aivoice
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U aivoice -Fc aivoice > /tmp/dicto_db.dump
ls -lh /tmp/dicto_db.dump   # убедиться что не пустой
```

Скопировать дамп на новый сервер:

```bash
scp -3 root@176.114.69.152:/tmp/dicto_db.dump root@NEW_IP:/tmp/dicto_db.dump
```

**На НОВОМ сервере** — поднять только БД и восстановить:

```bash
cd /opt/aivoice
# поднять только postgres (создаст пустую БД из .env)
docker compose -f docker-compose.prod.yml up -d db
sleep 10  # дождаться healthcheck

# восстановить дамп
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U aivoice -d aivoice --clean --if-exists < /tmp/dicto_db.dump

# проверка: число пользователей должно совпасть со старым
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U aivoice aivoice -c "SELECT count(*) FROM users;"
```

> Прогонять `alembic upgrade head` НЕ нужно — дамп уже содержит финальную схему.
> Но на всякий случай после старта api можно: `docker compose ... exec api alembic current`.

---

## Фаза 4 — Перенести audit_logs (152-ФЗ) и SSL-сертификаты

Имена volume зависят от имени проекта (папка `/opt/aivoice` → префикс `aivoice_`).
Проверь точные имена: `docker volume ls | grep aivoice`.

**На СТАРОМ сервере** — упаковать оба volume:

```bash
# audit-журнал
docker run --rm -v aivoice_audit_logs:/data -v /tmp:/backup alpine \
  tar czf /backup/audit_logs.tar.gz -C /data .

# SSL-сертификаты Let's Encrypt (чтобы HTTPS работал сразу после переключения)
docker run --rm -v aivoice_certbot-certs:/data -v /tmp:/backup alpine \
  tar czf /backup/certbot_certs.tar.gz -C /data .
```

Скопировать на новый:

```bash
scp -3 root@176.114.69.152:/tmp/audit_logs.tar.gz   root@NEW_IP:/tmp/
scp -3 root@176.114.69.152:/tmp/certbot_certs.tar.gz root@NEW_IP:/tmp/
```

**На НОВОМ сервере** — распаковать в volume (создаём их заранее):

```bash
cd /opt/aivoice
docker volume create aivoice_audit_logs
docker volume create aivoice_certbot-certs

docker run --rm -v aivoice_audit_logs:/data -v /tmp:/backup alpine \
  tar xzf /backup/audit_logs.tar.gz -C /data

docker run --rm -v aivoice_certbot-certs:/data -v /tmp:/backup alpine \
  tar xzf /backup/certbot_certs.tar.gz -C /data
```

> Перенос сертификатов = HTTPS заработает мгновенно при переключении DNS,
> без гонки с certbot. Сертификаты привязаны к домену, не к IP.

---

## Фаза 5 — Собрать и поднять весь стек на новом сервере

```bash
cd /opt/aivoice
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps   # все healthy?
```

> ⚠️ Если `vite build` падает по OOM на 4 ГБ — добавь swap:
> `fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`

**Проверка ДО переключения DNS** (через подмену hosts, не трогая реальный DNS):

```bash
# с локальной машины — проверить что новый сервер отвечает по домену
curl -sk --resolve dicto.pro:443:NEW_IP https://dicto.pro/ -o /dev/null -w "%{http_code}\n"
curl -sk --resolve dicto.pro:443:NEW_IP https://dicto.pro/api/health -w "\n"
```

Должно вернуть 200. Если да — новый сервер готов принять трафик.

---

## Фаза 6 — Переключение DNS (точка невозврата, ~5 мин простоя)

1. В панели DNS домена: A-запись `dicto.pro` → `NEW_IP`, `admin.dicto.pro` → `NEW_IP`.
2. Подождать пропагацию (TTL 300с → ~5 мин). Проверять:
   ```bash
   nslookup dicto.pro 8.8.8.8     # должен показать NEW_IP
   ```
3. Как только DNS переключился — прогнать smoke-тест:
   ```bash
   bash scripts/check-prod.sh https://dicto.pro
   ```

---

## Фаза 7 — Финал

1. **Проверить вручную:** регистрация, логин, загрузка файла, оплата (тестовая),
   админка на admin.dicto.pro.
2. **Certbot:** убедиться что renew работает на новом сервере:
   ```bash
   docker compose -f docker-compose.prod.yml exec certbot certbot certificates
   ```
3. **Старый сервер (Selectel) держать включённым 3–5 дней** — на случай отката
   (DNS обратно) и пока не убедишься что всё стабильно.
4. Через 5 дней — удалить старый VPS в панели Selectel (S3 НЕ трогать!).

---

## Откат (если что-то пошло не так)

DNS A-запись `dicto.pro` → обратно `176.114.69.152`. Через ~5 мин (TTL) трафик
вернётся на старый сервер. Поэтому старый сервер и держим живым.

---

## Чек-лист «не забыть»

- [ ] S3 (Selectel) НЕ трогаем — в `.env` S3_* без изменений
- [ ] `.env` скопирован, не закоммичен
- [ ] Дамп БД восстановлен, count(users) совпал
- [ ] audit_logs перенесены (152-ФЗ)
- [ ] SSL-сертификаты перенесены → HTTPS сразу
- [ ] DNS TTL снижен заранее
- [ ] Старый сервер жив 3–5 дней после
- [ ] check-prod.sh зелёный

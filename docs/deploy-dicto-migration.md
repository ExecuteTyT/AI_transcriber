# Миграция домена voitra.pro → dicto.pro

Пошаговый runbook для переключения production-домена с `voitra.pro` на `dicto.pro`.
Минимизирует downtime: сначала поднимаем dicto.pro параллельно, потом переводим редирект.

---

## 0. Предусловия

- [x] Домен `dicto.pro` куплен
- [x] Есть доступ к DNS-панели регистратора
- [x] SSH на сервер (root@vm15706566)
- [x] Код с ренеймом в `main` (см. `git log` — этот коммит)

---

## 1. DNS настройка (5 минут + 15-60 минут пропагации)

В DNS-панели регистратора `dicto.pro`:

```
Тип  Имя   Значение                    TTL
A    @     <IP сервера>                 300
A    www   <IP сервера>                 300
```

Проверить распространение:
```bash
dig dicto.pro +short
dig www.dicto.pro +short
# Должны вернуть IP сервера
```

Пока TTL не истёк, сайт доступен только на voitra.pro. Это нормально.

---

## 2. Подготовка SSL-сертификата для dicto.pro (до переключения)

На сервере:

```bash
cd /opt/aivoice
git pull origin main

# Временно добавить dicto.pro в nginx как отдельный server-блок
# для проверки certbot (domain validation)
```

**Временный nginx-блок** — создай `/tmp/dicto-temp.conf`:

```nginx
server {
    listen 80;
    server_name dicto.pro www.dicto.pro;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://voitra.pro$request_uri;   # пока редирект на старый домен
    }
}
```

Положить его в `nginx.prod.conf` (выше существующих блоков) и перезапустить:

```bash
# Вариант A — ручной monkey-patch (временный, до шага 4)
# Открыть /opt/aivoice/nginx.prod.conf, добавить блок сверху.
docker compose -f docker-compose.prod.yml restart nginx
```

**Получить SSL:**

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d dicto.pro -d www.dicto.pro \
  --email <твой@email> --agree-tos --no-eff-email
```

После успеха сертификат появится в `/etc/letsencrypt/live/dicto.pro/`.

---

## 3. Переключение nginx на dicto.pro

Ветка `main` уже содержит обновлённый `nginx.prod.conf` — `server_name dicto.pro` + `ssl_certificate /etc/letsencrypt/live/dicto.pro/...`.

```bash
cd /opt/aivoice
git pull origin main                 # подтянуть финальную версию nginx.prod.conf

# Опционально — добавить server_name для voitra.pro как 301-redirect на dicto.pro
# (см. секцию 5 ниже)

# Пересобрать frontend (там обновлены canonical URLs, sitemap, og-tags)
docker compose -f docker-compose.prod.yml up -d --build frontend nginx prometheus grafana
```

Проверить:

```bash
curl -skI https://dicto.pro/ | head -3         # → HTTP/2 200
curl -skI https://dicto.pro/docs | head -3     # → HTTP/2 200
./scripts/check-prod.sh https://dicto.pro      # → ALL SMOKE CHECKS PASSED
```

---

## 4. Grafana — проверить дашборд

Новый компонент в этом PR — **provisioned-дашборд `Dicto — API Overview`**.

```bash
# Пересобрать grafana уже сделали в шаге 3
# Проверить:
ssh root@vm15706566 "curl -s http://localhost:3001/api/dashboards/uid/dicto-api-overview | head -50"
```

Или в браузере: `http://<server-ip>:3001` (admin / пароль из `GRAFANA_PASSWORD` в `.env`).

Дашборд содержит:
- **Request rate** (sum by method) — линейный график RPS с разбивкой по GET/POST/…
- **Error rate** (4xx / 5xx) — рядом
- **Latency** p50 / p95 / p99 — строится из `http_request_duration_seconds_bucket`
- **Top 10 endpoints by RPS** — bar-chart (handler label)
- **Stat-panels**: Requests (24h), Error ratio, Redis memory, API uptime

Метрики приходят из `prometheus-fastapi-instrumentator` (`backend/app/main.py`, endpoint `/metrics`, already wired).

Если дашборд не появился — проверить:
```bash
docker compose -f docker-compose.prod.yml logs grafana | grep -i provision
# Должно быть "Dashboard provisioned: dicto-api-overview"
```

---

## 5. Редирект voitra.pro → dicto.pro (опционально, для SEO / старых ссылок)

Чтобы не потерять трафик с уже проиндексированного voitra.pro, добавь 301-редирект.

В `nginx.prod.conf` **перед** основным server-блоком:

```nginx
# Legacy redirect: voitra.pro → dicto.pro
server {
    listen 443 ssl http2;
    server_name voitra.pro www.voitra.pro;

    ssl_certificate /etc/letsencrypt/live/voitra.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voitra.pro/privkey.pem;

    return 301 https://dicto.pro$request_uri;
}

server {
    listen 80;
    server_name voitra.pro www.voitra.pro;
    return 301 https://dicto.pro$request_uri;
}
```

**Важно:** voitra.pro SSL-сертификат всё ещё валиден (75 дней) — не отключай certbot для voitra.pro, оставь обновление, пока DNS не обновится у всех клиентов (месяц).

---

## 6. Обновить внешние сервисы

| Сервис | Что обновить |
|---|---|
| **YooKassa** | return_url в настройках шопа → `https://dicto.pro/subscription` |
| **Google Search Console** | Добавить property `dicto.pro`, верифицировать |
| **Yandex Webmaster** | То же |
| **Email (SMTP)** | Обновить `SMTP_USER=noreply@dicto.pro` в `.env` когда настроишь почту на dicto |
| **Social / analytics** | Обновить Open Graph / Twitter cards — уже в коде, но перезагрузить кеш через [OG Debugger](https://developers.facebook.com/tools/debug/) |
| **robots.txt / sitemap.xml** | Уже обновлены в коде; пушнуть `https://dicto.pro/sitemap.xml` в Search Console |

---

## 7. Checklist после деплоя

- [ ] `dig dicto.pro` возвращает IP сервера
- [ ] `curl -skI https://dicto.pro/` → 200
- [ ] `./scripts/check-prod.sh https://dicto.pro` → ALL PASSED
- [ ] Открыть `https://dicto.pro` в браузере — логин, загрузка файла, транскрипция работают
- [ ] Grafana `http://<server-ip>:3001` → дашборд «Dicto — API Overview» виден
- [ ] voitra.pro редиректит (если настроил в шаге 5)
- [ ] YooKassa test-оплата проходит (return_url корректный)
- [ ] Email-шаблоны содержат ссылки на dicto.pro

---

## Rollback (если что-то сломалось)

```bash
cd /opt/aivoice
git revert HEAD            # откатит ренейм
docker compose -f docker-compose.prod.yml up -d --build frontend nginx
```

voitra.pro SSL всё ещё валиден — сайт оживёт обратно за 1-2 минуты.

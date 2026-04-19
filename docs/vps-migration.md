# Миграция VPS на российский ЦОД

Сейчас прод крутится на Hetzner (Германия), хранилище S3 — на Selectel (Россия).
Для полного соответствия 152-ФЗ в части **локализации ПДн** (ст. 18 ч. 5) нужно
перенести VPS в Россию. Не срочно — но без этого проверка РКН может зацепиться.

**Статус: отложено на момент выхода из Free-пользования (~100 платящих).**

---

## Почему переезд важен

- Hetzner = Германия → вся БД с email, хэшами паролей, ФИО, IP-адресами лежит в ЕС
- 152-ФЗ ч. 5 ст. 18: первичная запись, систематизация, накопление, хранение,
  уточнение, извлечение ПДн граждан РФ осуществляются **на серверах в РФ**
- Трансграничная передача AI-моделям — это ОК (с согласием), а вот **хранение
  основной БД** должно быть в РФ

Обработчики (Mistral/Google/OpenAI) — это не хранилище, это процессинг.
Наша PostgreSQL-БД — это хранилище → должна быть в РФ.

---

## Куда мигрировать

### Рекомендация: Selectel

**Плюсы:**
- Уже работаем с их S3 (ключи, bucket, опыт)
- Один поставщик услуг = проще учёт для ИП
- Есть Managed PostgreSQL + Managed Redis (отдельно, но рядом)
- Сертификат соответствия ФСТЭК → плюс при проверке
- Цены сравнимые с Hetzner

**Конфигурация под наш текущий load:**
- Облачный сервер **Basic L**: 4 vCPU / 8 GB RAM / 80 GB NVMe = ~2 400 ₽/мес
- Или Dedicated server при росте: 8-12 тыс. ₽/мес

### Альтернативы

| Провайдер | Плюс | Минус |
|---|---|---|
| **Yandex Cloud** | Хорошая Managed БД, high-availability | Дороже (+30-40%) |
| **VK Cloud (MRG)** | Скидки, интеграция с VK ID | Меньше инструментов, фичей меньше |
| **Timeweb** | Дёшево | Менее стабильный, документация хуже |
| **Cloud.ru (Сбер)** | Enterprise-уровень | Оверкилл для стартапа |

---

## План миграции (zero-downtime)

### Фаза 1: Подготовка нового сервера (1 день)

```bash
# 1. Заказ в панели Selectel: Ubuntu 24.04, Basic L
# 2. Получить IP, SSH-доступ
# 3. Настроить окружение
ssh root@<new-ip>
apt update && apt install -y docker.io docker-compose-plugin git
git clone https://github.com/ExecuteTyT/AI_transcriber.git /opt/scribi
cd /opt/scribi
cp .env.example .env
# Отредактировать .env — те же ключи что и на текущем проде
```

### Фаза 2: Dry-run без клиентского трафика (2-4 часа)

```bash
# Запустить полный стек на новом сервере, проверить что всё работает
docker compose -f docker-compose.prod.yml up -d --build
./scripts/check-prod.sh http://<new-ip>         # базовые проверки
curl http://<new-ip>/api/auth/register -X POST ... # ручной тест
```

### Фаза 3: Синхронизация данных (3-5 мин простоя)

```bash
# На старом сервере — перевести API в read-only (добавить middleware)
# или коротко остановить, сделать dump

# 1. Дамп PostgreSQL
ssh root@<old-ip> "cd /opt/aivoice && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U aivoice aivoice | gzip > /tmp/db.sql.gz"
scp root@<old-ip>:/tmp/db.sql.gz /tmp/
scp /tmp/db.sql.gz root@<new-ip>:/tmp/

# 2. Восстановление на новом
ssh root@<new-ip> "cd /opt/scribi && gunzip -c /tmp/db.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U aivoice aivoice"

# 3. S3-bucket НЕ переносим — он уже в РФ (Selectel)

# 4. Redis — не важно (кэш, пересоздастся сам)
```

### Фаза 4: Переключение DNS (TTL 300 → до 15 мин пропагации)

```bash
# В DNS-панели dicto.pro:
# A @    <new-ip>        TTL 300
# A www  <new-ip>        TTL 300

# Проверить:
dig dicto.pro +short      # должен вернуть <new-ip>
```

### Фаза 5: SSL для нового сервера

```bash
ssh root@<new-ip>
cd /opt/scribi
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d dicto.pro -d www.dicto.pro \
  --email islamsabirzyanov@gmail.com --agree-tos --no-eff-email
docker compose -f docker-compose.prod.yml restart nginx

./scripts/check-prod.sh https://dicto.pro
```

### Фаза 6: Удалить старый сервер (через 48 часов наблюдения)

```bash
# На старом сервере
docker compose -f docker-compose.prod.yml down
# Затем отключить у Hetzner, не забыть сохранить финальный backup
```

---

## Чек-лист после миграции

- [ ] `dig dicto.pro` возвращает новый IP
- [ ] `./scripts/check-prod.sh https://dicto.pro` → ALL PASSED
- [ ] Все тарифные пользователи могут войти и работать
- [ ] YooKassa webhook приходит на новый IP (перенастроить в личном кабинете YooKassa если нужно)
- [ ] Grafana на `<new-ip>:3001` показывает метрики
- [ ] В реестре РКН обновить контактные данные если поменялся физический адрес
- [ ] В `docs/roskomnadzor-checklist.md` добавить: «Сервер размещён на Selectel, РФ»

---

## Экономика

| Статья | Hetzner (сейчас) | Selectel (после) |
|---|---|---|
| VPS | ~2 500 ₽/мес | ~2 400 ₽/мес |
| Трафик | бесплатно до 20 TB | 10 ₽/ГБ после 1 TB |
| Мониторинг | свой | свой |
| 152-ФЗ соответствие | ❌ | ✅ |
| Плюс: единый provider (S3+VPS) | — | +удобство учёта |

Итого: стоимость +/- такая же, а compliance-риск закрывается.

---

## Risks

- **Downtime**: ~3-5 минут при дампе БД. Можно уменьшить через **streaming replication**
  (PostgreSQL logical replication) — 10 секунд, но сложнее настроить.
- **Потеря тома uploads**: S3 уже в РФ, там ничего не теряем. Локальный fallback
  `data/uploads` — перенести rsync'ом если использовался.
- **YooKassa webhook URL**: если старый IP отключается до перенастройки — потеря
  webhook'ов на несколько минут. Решение: оба IP работают параллельно 24-48 часов.

---

## Когда делать

Не сейчас. Сигналы для запуска миграции:

1. **Денежный сигнал**: 50+ платящих пользователей (штраф от РКН становится значимым)
2. **Регуляторный сигнал**: РКН опубликовал уведомление о проверках в нашей сфере
3. **Сигнал от конкурента**: Speech2Text или другой начнёт массированно упирать на
   «локальность данных» в маркетинге — нам нужно тоже
4. **Инфраструктурный сигнал**: БД на Hetzner перестаёт справляться, нужно масштабироваться

До сигнала — держим план, работаем на Hetzner.

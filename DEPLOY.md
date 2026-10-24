# Certa: установка на свой сервер (Beget VPS)

Этот файл для Claude Code (или инженера), которому поручили поднять Certa на сервере в России. Прочитай целиком перед началом и иди по шагам. Ничего не удаляй и не меняй в DNS без явного подтверждения владельца.

## Что это

Certa: закрытый клуб по приглашению (Next.js 16, Postgres). Сейчас работает на Vercel (certa-club.ru). Цель переезда: сайт быстро открывается у российских операторов и данные участников хранятся в России (152-ФЗ).

На сервере работают три контейнера из `docker-compose.yml`:
- `db`: Postgres 17, данные в томе `db`;
- `app`: сайт (`Dockerfile`, сборка `output: "standalone"`), фото и документы лотов в томе `files` (`CERTA_DATA_DIR=/data`);
- `caddy`: HTTPS-сертификат Let's Encrypt выпускается сам, `www` перебрасывает на основной домен.

Файлы лотов на своём сервере хранятся на диске (переменные `BLOB_*` не задаём). Письма уходят через Resend, как и сейчас.

## Требования к серверу

- Ubuntu 22.04 или 24.04, 2 ядра, 4 ГБ памяти, от 20 ГБ диска.
- Открыты порты 80 и 443.
- Доступ по SSH с правами sudo.

## Шаги

### 1. Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # затем перелогиниться
docker compose version
```

### 2. Код

Репозиторий приватный: нужен доступ на GitHub (владелец добавит пользователя в репозиторий).

```bash
git clone https://github.com/khrapovitskiyivan-lgtm/certa-club.git certa
cd certa
git checkout self-hosting   # ветка с файлами для своего сервера; после проверки будет влита в main
```

### 3. Настройки

```bash
cp .env.example .env
nano .env
```

Заполнить:
- `DB_PASSWORD`: `openssl rand -hex 24`
- `CERTA_SESSION_SECRET`: `openssl rand -hex 32`
- `RESEND_API_KEY`: ключ Resend. Владелец передаёт его лично, не через репозиторий и не в чате.
- `CERTA_SETUP_TOKEN`: `openssl rand -hex 16`, нужен для первой настройки (шаг 6).
- `DOMAIN`, `CERTA_BASE_URL`, `MAIL_FROM`, `MAIL_REPLY_TO`: уже заполнены, проверить.

Файл `.env` содержит секреты: не коммитить, права `chmod 600 .env`.

### 4. Проверка до переключения DNS

Пока домен смотрит на Vercel, Caddy не получит сертификат. Сначала проверить, что сайт собирается и стартует:

```bash
docker compose up -d --build db app
docker compose logs -f app   # ждать строку Ready, затем Ctrl+C
docker compose exec app wget -qO- http://127.0.0.1:3000/login | head -c 300
```

Ожидаемо: HTML страницы входа. Если `app` падает, смотреть логи, частая причина: не заполнен `CERTA_SESSION_SECRET`.

### 5. Переключение домена (только с подтверждения владельца)

DNS домена в Beget (cp.beget.com, раздел DNS, домен certa-club.ru). Владелец меняет:
- запись A для `certa-club.ru`: старое значение `216.198.79.1` (Vercel) заменить на IP сервера;
- запись для `www`: сейчас CNAME на Vercel, заменить на запись A с IP сервера.

Остальные записи (MX и TXT почты, `send`, `rsend`, `resend._domainkey`, `_dmarc`) НЕ трогать: от них зависят почта info@ и отправка писем клуба.

Затем:

```bash
docker compose up -d caddy
docker compose logs -f caddy   # ждать certificate obtained
curl -sI https://certa-club.ru | head -3
```

### 6. Первая настройка

База новая и пустая. Открыть `https://certa-club.ru/setup` и ввести значение `CERTA_SETUP_TOKEN` в поле «Ключ настройки». Страница создаст первое приглашение в экспертный совет: по нему владелец регистрируется и дальше приглашает остальных из кабинета совета. После этого удалить `CERTA_SETUP_TOKEN` из `.env` и выполнить `docker compose up -d app`.

Данные со старой базы на Vercel (Neon) автоматически не переносятся: участников пока единицы, их проще пригласить заново. Если перенос нужен, сначала согласовать с владельцем.

### 7. Резервные копии (обязательно)

```bash
sudo mkdir -p /var/backups/certa
sudo tee /etc/cron.d/certa-backup >/dev/null <<'CRON'
0 3 * * * root cd /home/USER/certa && docker compose exec -T db pg_dump -U certa certa | gzip > /var/backups/certa/db-$(date +\%F).sql.gz && docker run --rm -v certa_files:/data -v /var/backups/certa:/b alpine tar czf /b/files-$(date +\%F).tgz -C /data . && find /var/backups/certa -mtime +14 -delete
CRON
```

`USER` заменить на пользователя сервера; имя тома `certa_files` проверить через `docker volume ls`. Копии лучше дополнительно уносить с сервера (например, в Beget S3).

### 8. Обновления

```bash
cd certa && git pull && docker compose up -d --build app
```

## Проверка после установки

- `https://certa-club.ru` открывается, видны CERTA, подпись и «Вход по приглашению».
- `https://www.certa-club.ru` перебрасывает на основной адрес.
- Регистрация по приглашению из /setup проходит, открывается кабинет совета.
- В кабинете совета загружается фото к тестовому лоту, затем фото открывается.
- «Забыли пароль?» присылает письмо от club@certa-club.ru.

## Если что-то пошло не так

Вернуть сайт на Vercel: в DNS Beget вернуть запись A `certa-club.ru` на `216.198.79.1`. Vercel продолжает работать, пока его не отключили.

## Что важно знать

- Тесты: `npm test` (Vitest). Тест на настоящем Postgres: `PG_TEST_URL=postgres://... npx vitest run src/server`.
- Перед изменением кода прочитать `AGENTS.md`: это Next.js 16, API отличается от старых версий.
- Клиентский путь продукта: `docs/client-journey.md`.

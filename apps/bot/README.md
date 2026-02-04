# Лимит до зарплаты — Telegram-бот

Production-ready MVP для контроля личных расходов до следующей зарплаты.

## Возможности
- Онбординг через `/start`: доход и день зарплаты.
- `/status`: остаток, дни до зарплаты, дневной лимит.
- Добавление расходов сообщением `+350 еда` или `1200 такси`.
- `/expenses`: история расходов с пагинацией и удалением.
- `/analytics`: топ-5 категорий и самый дорогой день.
- `/goals`: цели (Premium).
- `/promo`: активация промокодов.
- `/admin_add_promo`, `/admin_list_promos`.
- Ежедневные уведомления для Premium.

## Запуск локально

1. Скопируйте `.env.example` в `.env` и заполните переменные.
2. Запустите Docker Compose:

```bash
docker-compose up --build
```

3. Запустите миграции:

```bash
alembic upgrade head
```

## Структура
- `src/` — логика бота
- `alembic/` — миграции
- `docker-compose.yml` — PostgreSQL + Redis + bot
- `render.yaml` — деплой на Render (Background Worker)

## Деплой на Render
Используйте `render.yaml` в корне репозитория. Для Background Worker на Python бот запускается командой:

```
python -m src.main
```

## Примеры команд
- Добавить расход: `+350 еда`
- Проверить статус: `/status`
- История расходов: `/expenses`

Все суммы хранятся в копейках (int).

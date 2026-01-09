# Floor Service Hub

Умный ИИ-ассистент для работы с напольными покрытиями. Мигрированная версия с Base44 на самостоятельный стек.

## Технологический стек

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui компоненты
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js (Credentials provider)
- **LLM**: OpenAI API (или совместимый провайдер)
- **State Management**: TanStack Query + React Context

## Структура проекта

```
next-app/
├── prisma/
│   ├── schema.prisma    # Схема базы данных
│   └── seed.ts          # Начальные данные
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── (auth)/      # Страницы авторизации
│   │   ├── (main)/      # Основные страницы приложения
│   │   └── api/         # API роуты
│   ├── components/      # React компоненты
│   │   ├── ui/          # shadcn/ui компоненты
│   │   ├── chat/        # Компоненты чата
│   │   ├── context/     # React Context провайдеры
│   │   └── ...
│   ├── lib/             # Утилиты и клиенты
│   │   ├── api.ts       # Клиентский API
│   │   ├── auth.ts      # NextAuth конфигурация
│   │   ├── llm.ts       # LLM клиент
│   │   ├── prisma.ts    # Prisma клиент
│   │   └── utils.ts     # Общие утилиты
│   └── types/           # TypeScript типы
└── ...
```

## Установка и запуск

### 1. Установка зависимостей

```bash
cd next-app
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
cp .env.example .env
```

Обязательные переменные:
- `DATABASE_URL` - URL подключения к PostgreSQL
- `NEXTAUTH_SECRET` - Секретный ключ для NextAuth (можно сгенерировать: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - URL приложения (например: `http://localhost:3000`)

Опциональные переменные:
- `LLM_API_KEY` - API ключ для OpenAI (или совместимого провайдера)
- `LLM_MODEL` - Модель LLM (по умолчанию: `gpt-4o-mini`)
- `LLM_BASE_URL` - URL API (по умолчанию: `https://api.openai.com/v1`)

### 3. Инициализация базы данных

```bash
# Генерация Prisma клиента
npm run db:generate

# Применение миграций (создание таблиц)
npm run db:push

# Заполнение начальными данными
npm run db:seed
```

### 4. Запуск приложения

```bash
# Режим разработки
npm run dev

# Продакшен сборка
npm run build
npm run start
```

Приложение будет доступно по адресу: http://localhost:3000

## Учетные записи по умолчанию

После запуска `db:seed` создаются следующие пользователи:

| Email | Пароль | Роль |
|-------|--------|------|
| admin@floorservice.ru | admin123 | Администратор |
| dealer@example.com | dealer123 | Дилер |

## API Эндпоинты

### Авторизация
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Пользователь
- `GET /api/me` - Получить текущего пользователя
- `PATCH /api/me` - Обновить данные пользователя

### Чат
- `GET /api/chat/session?sessionId=xxx` - Получить сессию чата
- `POST /api/chat/session` - Сохранить сессию чата
- `POST /api/chat` - Отправить сообщение в чат (LLM)

### База знаний
- `GET /api/knowledgebase` - Получить элементы базы знаний

### AI Настройки
- `GET /api/ai/settings` - Получить настройки AI

### Админ
- `POST /api/admin/xml/sync` - Синхронизация XML фида
- `POST /api/admin/dealers/compute-tiers` - Пересчет тиров дилеров

## Особенности чата

Чат поддерживает специальные JSON-payload для отображения карточек:

### Карточка товара
```json
{
  "type": "product_info",
  "data": {
    "name": "Название товара",
    "vendorCode": "ABC123",
    "description": "Описание",
    "picture": "https://...",
    "price": "1500 руб.",
    "params": {}
  }
}
```

### Ссылка на скачивание
```json
{
  "type": "download_link",
  "data": {
    "text": "Скачать каталог",
    "url": "https://..."
  }
}
```

### Несколько ссылок
```json
{
  "type": "multi_download_links",
  "data": {
    "items": [
      { "text": "Файл 1", "url": "...", "title": "Название 1" },
      { "text": "Файл 2", "url": "...", "title": "Название 2" }
    ]
  }
}
```

## Система тиров дилеров

| Тир | Название | Порог оборота |
|-----|----------|---------------|
| TIER1 | Базовый | 0 ₽ |
| TIER2 | Серебряный | 500 000 ₽ |
| TIER3 | Золотой | 1 000 000 ₽ |
| TIER4 | Платиновый | 3 000 000 ₽ |

Тир автоматически пересчитывается на основе оборота за прошлый месяц.
Администратор может вручную назначить тир с истечением срока.

## Миграция с Base44

Основные изменения:

1. **Auth**: `base44.auth` → NextAuth.js
2. **Entities**: `base44.entities.*` → Prisma + API routes
3. **Integrations**: `Core.InvokeLLM` → OpenAI SDK
4. **Functions**: Deno functions → Next.js API routes

Контракт чата (JSON payload) сохранен для совместимости компонента `ChatMessage`.

## Разработка

```bash
# Запуск Prisma Studio (GUI для БД)
npm run db:studio

# Lint
npm run lint

# TypeScript проверка
npx tsc --noEmit
```

## Продакшен

Рекомендуемые платформы для деплоя:
- Vercel (оптимально для Next.js)
- Railway
- Render
- VPS с Docker

Для продакшена обязательно:
1. Настроить PostgreSQL (Supabase, Neon, или свой)
2. Установить безопасный `NEXTAUTH_SECRET`
3. Настроить LLM API ключ
4. Настроить HTTPS

## Лицензия

Проприетарный код. Все права защищены.

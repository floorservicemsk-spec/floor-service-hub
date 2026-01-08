# 📈 Масштабирование Floor Service Hub

## Текущие возможности

После внедрённых оптимизаций система поддерживает:

- **100+ одновременных пользователей** в чате
- **10 параллельных AI запросов** (настраивается)
- **100 запросов в очереди** AI
- **30 сообщений/мин** на пользователя
- **Graceful degradation** при перегрузке

---

## Архитектура для нагрузки

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (nginx/ALB)   │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  Next.js    │   │  Next.js    │   │  Next.js    │
    │  Instance 1 │   │  Instance 2 │   │  Instance 3 │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │  (with pooler)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     Redis       │
                    │ (cache + queue) │
                    └─────────────────┘
```

---

## Компоненты масштабирования

### 1. Rate Limiter (`src/lib/rate-limiter.ts`)

```typescript
// Лимиты по типу запроса
RATE_LIMITS = {
  chat: { windowMs: 60000, maxRequests: 30 },     // 30 msg/min
  aiStream: { windowMs: 60000, maxRequests: 20 }, // 20 streams/min
  api: { windowMs: 60000, maxRequests: 100 },     // 100 req/min
  auth: { windowMs: 900000, maxRequests: 10 },    // 10/15min
}
```

При превышении лимита возвращается `429 Too Many Requests`.

### 2. AI Queue (`src/lib/ai-queue.ts`)

```typescript
// Настройки очереди
const config = {
  maxConcurrent: 10,     // Параллельных запросов к LLM
  maxQueueSize: 100,     // Размер очереди
  requestTimeout: 90000, // Таймаут 90 сек
  retryAttempts: 2,      // Повторы при ошибке
};
```

Очередь обеспечивает:
- Защиту от перегрузки LLM API
- Автоматические повторы при rate limit
- Приоритизацию запросов
- Метрики производительности

### 3. SSE Connection Manager

```typescript
// В /api/chat/stream/route.ts
const MAX_CONNECTIONS = 100;  // Макс. активных стримов
let activeConnections = 0;
```

### 4. Health Check (`/api/health`)

```bash
curl http://localhost:3000/api/health
```

Ответ:
```json
{
  "status": "healthy",
  "database": { "status": "ok", "latencyMs": 5 },
  "aiQueue": {
    "queueLength": 0,
    "activeRequests": 2,
    "maxConcurrent": 10,
    "stats": {
      "totalProcessed": 150,
      "avgWaitTimeMs": 120,
      "avgProcessTimeMs": 2500
    }
  },
  "memory": {
    "heapUsedMB": 85,
    "rssMB": 140
  }
}
```

---

## Настройка PostgreSQL

### Connection Pooling

В `DATABASE_URL` добавьте параметры:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
```

Рекомендации по `connection_limit`:
- 1 инстанс Next.js: 20-30
- 3 инстанса: 10 на каждый (всего 30)
- PostgreSQL max_connections по умолчанию: 100

### Индексы (уже добавлены)

```prisma
// KnowledgeBase
@@index([isAiSource])
@@index([type])

// ChatSession
@@index([userEmail])
@@index([lastActivity])

// Order
@@index([userId, status])
```

---

## Масштабирование для 1000+ пользователей

### 1. Добавить Redis

```bash
npm install ioredis @upstash/ratelimit
```

Обновить `rate-limiter.ts`:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
});
```

### 2. Использовать BullMQ для очередей

```bash
npm install bullmq
```

```typescript
import { Queue, Worker } from "bullmq";

const aiQueue = new Queue("ai-requests", {
  connection: { host: "redis", port: 6379 },
});

// Worker процесс (отдельный)
const worker = new Worker("ai-requests", async (job) => {
  return await processAIRequest(job.data);
});
```

### 3. Горизонтальное масштабирование

```yaml
# docker-compose.yml
services:
  app:
    image: floor-service-hub
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=postgresql://...?connection_limit=10
      - REDIS_URL=redis://redis:6379

  redis:
    image: redis:alpine
    
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_MAX_CONNECTIONS=100
```

### 4. CDN для статики

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || "",
  images: {
    loader: "cloudinary", // или imgix, akamai
    domains: ["cdn.example.com"],
  },
};
```

---

## Мониторинг в Production

### Prometheus метрики

```typescript
// src/lib/metrics.ts
import { Counter, Histogram, Gauge } from "prom-client";

export const aiRequestDuration = new Histogram({
  name: "ai_request_duration_seconds",
  help: "AI request duration",
});

export const activeConnections = new Gauge({
  name: "active_sse_connections",
  help: "Active SSE connections",
});
```

### Логирование

```typescript
// Структурированные логи для ELK/Loki
console.log(JSON.stringify({
  level: "info",
  event: "ai_request",
  userId: user.id,
  duration: 2500,
  queueWait: 120,
  model: "gpt-4o-mini",
}));
```

---

## Чеклист перед production

- [ ] `DATABASE_URL` с `connection_limit`
- [ ] Redis для rate limiting (при >1 инстанса)
- [ ] Настроен health check в оркестраторе
- [ ] Лимиты памяти контейнера (512MB-1GB)
- [ ] Алерты на `/api/health` status != "healthy"
- [ ] Логи в централизованную систему
- [ ] CDN для изображений товаров
- [ ] SSL/TLS терминация на балансере

---

## Быстрый тест нагрузки

```bash
# Установка
npm install -g autocannon

# Тест /api/health (должен держать 1000+ RPS)
autocannon -c 100 -d 30 http://localhost:3000/api/health

# Тест /api/chat (с rate limiting)
autocannon -c 50 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"message":"test","sessionId":"test"}' \
  http://localhost:3000/api/chat
```

Ожидаемые результаты:
- `/api/health`: 1000+ req/sec
- `/api/chat`: ~300 req/sec (ограничено rate limiter)

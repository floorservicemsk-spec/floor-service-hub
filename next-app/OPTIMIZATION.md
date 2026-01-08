# 🚀 План оптимизации производительности Floor Service Hub

## Текущие проблемы

1. **AI чат**: Пользователь ждёт полного ответа (3-10 сек)
2. **API**: Нет кэширования, повторные запросы к БД
3. **Frontend**: Большие бандлы, нет prefetch
4. **База данных**: Нет индексов для частых запросов

---

## 1️⃣ Streaming для AI-ответов (Критичная оптимизация)

### Проблема
Текущая реализация ждёт полного ответа от LLM. При сложных запросах это 5-15 секунд ожидания.

### Решение
Использовать Server-Sent Events (SSE) для потоковой передачи ответа.

**Файлы созданы:**
- `src/lib/llm-stream.ts` — генератор потокового ответа
- `src/app/api/chat/stream/route.ts` — SSE endpoint

### Использование на фронтенде:

```typescript
// В компоненте чата
const streamResponse = async (message: string) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const data = JSON.parse(line.slice(6));
        fullContent += data.content;
        // Обновляем UI сразу!
        setStreamingMessage(fullContent);
      }
    }
  }
};
```

**Результат**: Первый текст появляется через ~100ms вместо 5+ секунд!

---

## 2️⃣ Кэширование данных

### A. Server-side кэширование (создано в `src/lib/cache.ts`)

```typescript
import { aiSettingsCache, knowledgeBaseCache, withCache } from '@/lib/cache';

// В API route:
const settings = await withCache(
  aiSettingsCache,
  'ai-settings',
  () => prisma.aISettings.findFirst(),
  60_000 // 1 минута
);
```

### B. Кэширование в Next.js

Добавить в `next.config.js`:

```javascript
module.exports = {
  experimental: {
    staleTimes: {
      dynamic: 30,  // Кэш динамических страниц (сек)
      static: 180,  // Кэш статики
    },
  },
};
```

### C. Redis для production (опционально)

```bash
npm install ioredis
```

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Кэш запросов
const cached = await redis.get('knowledge-base');
if (cached) return JSON.parse(cached);

const data = await prisma.knowledgeBase.findMany();
await redis.setex('knowledge-base', 300, JSON.stringify(data));
```

---

## 3️⃣ Оптимизация базы данных

### A. Добавить индексы в Prisma schema

```prisma
model KnowledgeBase {
  // ... существующие поля
  
  @@index([isAiSource])
  @@index([type])
  @@index([isPublic, isAiSource])
  @@index([updatedAt])
}

model ChatSession {
  // ... существующие поля
  
  @@index([sessionId])
  @@index([userEmail])
  @@index([lastActivity])
}

model FAQ {
  @@index([categoryId])
  @@index([isPublished, isActive])
}
```

После изменений:
```bash
npx prisma db push
```

### B. Выборочная загрузка полей

```typescript
// Вместо:
const items = await prisma.knowledgeBase.findMany();

// Загружать только нужные поля:
const items = await prisma.knowledgeBase.findMany({
  select: {
    id: true,
    title: true,
    description: true,
    type: true,
    // Не загружать тяжёлые поля: content, xmlData
  },
});
```

---

## 4️⃣ Оптимизация Frontend

### A. Динамический импорт тяжёлых компонентов

```typescript
import dynamic from 'next/dynamic';

// Вместо обычного импорта
const ProductInfoCard = dynamic(
  () => import('@/components/chat/ProductInfoCard'),
  { 
    loading: () => <Skeleton className="h-64" />,
    ssr: false // Не рендерить на сервере
  }
);

const Calculator = dynamic(
  () => import('@/components/Calculator'),
  { ssr: false }
);
```

### B. Prefetch критичных страниц

```typescript
// В layout или home page
import { useRouter } from 'next/navigation';

useEffect(() => {
  router.prefetch('/chat');
  router.prefetch('/knowledgebase');
}, []);
```

### C. Оптимизация изображений

Использовать `next/image` везде:

```tsx
import Image from 'next/image';

// Вместо <img>:
<Image
  src={product.picture}
  alt={product.name}
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
  loading="lazy"
/>
```

### D. Уменьшение bundle size

Анализ бандла:
```bash
npm install @next/bundle-analyzer
```

В `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // config
});
```

Запуск: `ANALYZE=true npm run build`

---

## 5️⃣ Оптимизация AI-запросов

### A. Parallel запросы вместо sequential

```typescript
// Вместо последовательных:
const settings = await getSettings();
const knowledge = await getKnowledge();
const products = await getProducts();

// Параллельно:
const [settings, knowledge, products] = await Promise.all([
  getSettings(),
  getKnowledge(),
  getProducts(),
]);
```

### B. Предварительная загрузка product index

Создать background job для обновления индекса:

```typescript
// src/lib/product-index.ts
let productIndex: Map<string, Product[]> | null = null;
let lastUpdate = 0;

export async function getProductIndex() {
  const now = Date.now();
  // Обновлять раз в 10 минут
  if (!productIndex || now - lastUpdate > 10 * 60 * 1000) {
    productIndex = await buildProductIndex();
    lastUpdate = now;
  }
  return productIndex;
}
```

### C. Использовать более быструю модель для поиска

```typescript
// Для поиска релевантных документов — быстрая модель:
const searchResult = await invokeLLM({
  prompt: searchPrompt,
  settings: { ...llmSettings, model: 'gpt-4o-mini' }, // Быстрее
});

// Для генерации ответа — основная модель:
const response = await invokeLLM({
  prompt: mainPrompt,
  settings: llmSettings, // gpt-4o или claude
});
```

---

## 6️⃣ Edge Runtime (для максимальной скорости)

Некоторые API можно перенести на Edge:

```typescript
// src/app/api/fast-endpoint/route.ts
export const runtime = 'edge';

export async function GET() {
  // Работает на edge серверах (< 50ms latency)
  return Response.json({ data: 'fast!' });
}
```

⚠️ Edge не поддерживает Prisma напрямую, нужен Prisma Data Proxy или другой подход.

---

## 7️⃣ Приоритеты внедрения

| Приоритет | Оптимизация | Эффект | Сложность |
|-----------|-------------|--------|-----------|
| 🔴 Высокий | Streaming AI | -5-10 сек | Средняя |
| 🔴 Высокий | Кэширование settings | -100ms | Низкая |
| 🟡 Средний | DB индексы | -50-200ms | Низкая |
| 🟡 Средний | Dynamic imports | -30% bundle | Низкая |
| 🟡 Средний | next/image | -50% images | Средняя |
| 🟢 Низкий | Redis cache | -50ms | Высокая |
| 🟢 Низкий | Edge runtime | -100ms | Высокая |

---

## Быстрый старт (Top-3 оптимизации)

### 1. Включить streaming для чата (см. выше)

### 2. Добавить кэширование в chat API:

```typescript
import { withCache, aiSettingsCache, knowledgeBaseCache } from '@/lib/cache';

// В /api/chat/route.ts:
const aiSettings = await withCache(aiSettingsCache, 'settings', 
  () => prisma.aISettings.findFirst()
);

const knowledge = await withCache(knowledgeBaseCache, 'ai-sources',
  () => prisma.knowledgeBase.findMany({ where: { isAiSource: true } })
);
```

### 3. Добавить индексы в schema.prisma и выполнить `npx prisma db push`

---

## Мониторинг

Добавить логирование времени:

```typescript
export async function POST(request: NextRequest) {
  const start = Date.now();
  
  // ... логика
  
  console.log(`[Chat API] Response time: ${Date.now() - start}ms`);
}
```

Использовать Vercel Analytics или собственное решение для отслеживания.

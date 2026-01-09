import { NextRequest } from "next/server";
import { createLLMStream, AIProviderSettings } from "@/lib/llm-stream";
import { checkRateLimit } from "@/lib/rate-limiter";
import { aiQueue } from "@/lib/ai-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


// Track active SSE connections
let activeConnections = 0;
const MAX_CONNECTIONS = 100;

export async function POST(request: NextRequest) {
  // Rate limiting by session or IP
  const clientId = request.headers.get("x-session-id") || 
                   request.headers.get("x-forwarded-for") || 
                   "anonymous";
  
  const rateLimit = checkRateLimit(clientId, "aiStream");
  
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ 
        error: "Слишком много запросов. Подождите немного.",
        retryAfter: rateLimit.headers["X-RateLimit-Reset"],
      }),
      { 
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimit.headers,
        },
      }
    );
  }

  // Check connection limit
  if (activeConnections >= MAX_CONNECTIONS) {
    return new Response(
      JSON.stringify({ 
        error: "Сервер перегружен. Попробуйте позже.",
        activeConnections,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check queue capacity
  if (!aiQueue.hasCapacity()) {
    const waitTime = aiQueue.getEstimatedWaitTime();
    return new Response(
      JSON.stringify({ 
        error: "AI сервис перегружен.",
        estimatedWait: Math.ceil(waitTime / 1000),
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { message, context, chatHistory } = body as {
      message: string;
      context?: string;
      chatHistory?: Array<{ role: string; content: string }>;
    };

    if (!message) {
      return new Response("message is required", { status: 400 });
    }

    // Load AI settings (cached in memory for performance)
    const aiSettings = await getAISettings();

    const llmSettings: AIProviderSettings = {
      provider: aiSettings?.provider || "openai",
      apiKey: aiSettings?.apiKey,
      baseUrl: aiSettings?.baseUrl,
      model: aiSettings?.model || "gpt-4o-mini",
      temperature: aiSettings?.temperature || 0.7,
      maxTokens: aiSettings?.maxTokens || 2048,
      systemPrompt: aiSettings?.systemPrompt,
    };

    // Build prompt with context
    let prompt = message;
    if (context) {
      prompt = `Контекст:\n${context}\n\nЗапрос: ${message}`;
    }

    // Add chat history to system prompt
    let systemPrompt = llmSettings.systemPrompt || "Вы - полезный ИИ-ассистент.";
    if (chatHistory && chatHistory.length > 0) {
      const historyText = chatHistory
        .slice(-5)
        .map((m) => `${m.role === "user" ? "Пользователь" : "Ассистент"}: ${m.content}`)
        .join("\n");
      systemPrompt += `\n\nПредыдущий диалог:\n${historyText}`;
    }

    // Track connection
    activeConnections++;

    // Create streaming response with cleanup
    const stream = createLLMStream({
      prompt,
      systemPrompt,
      settings: llmSettings,
    });

    // Wrap stream to track connection close
    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          activeConnections--;
          controller.close();
        }
      },
      cancel() {
        activeConnections--;
      },
    });

    return new Response(wrappedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Active-Connections": String(activeConnections),
        ...rateLimit.headers,
      },
    });
  } catch (error) {
    console.error("Error in chat stream:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Simple in-memory cache for AI settings
interface CachedAISettings {
  data: {
    id: string;
    systemPrompt: string | null;
    provider: string;
    apiKey: string | null;
    baseUrl: string | null;
    model: string;
    temperature: number;
    maxTokens: number;
    welcomeMessage: string | null;
  } | null;
  timestamp: number;
}

let cachedSettings: CachedAISettings | null = null;

const CACHE_TTL = 60 * 1000; // 1 minute

async function getAISettings() {
  const now = Date.now();

  if (cachedSettings && now - cachedSettings.timestamp < CACHE_TTL) {
    return cachedSettings.data;
  }

  const settings = await (await getPrisma()).aISettings.findFirst();
  cachedSettings = { data: settings, timestamp: now };

  return settings;
}

// Stats are available via /api/health endpoint

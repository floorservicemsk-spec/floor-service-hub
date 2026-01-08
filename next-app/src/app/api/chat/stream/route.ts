import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createLLMStream, AIProviderSettings } from "@/lib/llm-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

    // Create streaming response
    const stream = createLLMStream({
      prompt,
      systemPrompt,
      settings: llmSettings,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat stream:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Simple in-memory cache for AI settings
let cachedSettings: {
  data: Awaited<ReturnType<typeof prisma.aISettings.findFirst>> | null;
  timestamp: number;
} | null = null;

const CACHE_TTL = 60 * 1000; // 1 minute

async function getAISettings() {
  const now = Date.now();

  if (cachedSettings && now - cachedSettings.timestamp < CACHE_TTL) {
    return cachedSettings.data;
  }

  const settings = await prisma.aISettings.findFirst();
  cachedSettings = { data: settings, timestamp: now };

  return settings;
}

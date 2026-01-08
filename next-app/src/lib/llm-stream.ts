import OpenAI from "openai";

// Environment fallbacks
const ENV_LLM_API_KEY = process.env.LLM_API_KEY;
const ENV_LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const ENV_LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

// Provider base URLs
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
};

export interface AIProviderSettings {
  provider?: string;
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string | null;
}

function createClient(settings?: AIProviderSettings): OpenAI | null {
  const apiKey = settings?.apiKey || ENV_LLM_API_KEY;
  if (!apiKey) return null;

  let baseUrl = ENV_LLM_BASE_URL;
  if (settings?.baseUrl) {
    baseUrl = settings.baseUrl;
  } else if (settings?.provider && PROVIDER_BASE_URLS[settings.provider]) {
    baseUrl = PROVIDER_BASE_URLS[settings.provider];
  }

  return new OpenAI({ apiKey, baseURL: baseUrl });
}

export interface StreamLLMParams {
  prompt: string;
  systemPrompt?: string;
  settings?: AIProviderSettings;
}

/**
 * Stream LLM response using Server-Sent Events
 */
export async function* streamLLM(params: StreamLLMParams): AsyncGenerator<string> {
  const { prompt, systemPrompt, settings } = params;

  const effectiveModel = settings?.model || ENV_LLM_MODEL;
  const effectiveTemperature = settings?.temperature ?? 0.7;
  const effectiveMaxTokens = settings?.maxTokens ?? 2048;

  const client = createClient(settings);

  if (!client) {
    yield "⚠️ AI сервис не настроен.";
    return;
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const stream = await client.chat.completions.create({
      model: effectiveModel,
      messages,
      temperature: effectiveTemperature,
      max_tokens: effectiveMaxTokens,
      stream: true, // Enable streaming!
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("[LLM Stream] Error:", error);
    yield "\n\n⚠️ Ошибка при получении ответа.";
  }
}

/**
 * Create a ReadableStream for Next.js streaming response
 */
export function createLLMStream(params: StreamLLMParams): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamLLM(params)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("[LLM Stream] Stream error:", error);
      } finally {
        controller.close();
      }
    },
  });
}

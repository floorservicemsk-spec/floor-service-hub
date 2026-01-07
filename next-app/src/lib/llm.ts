import OpenAI from "openai";

// Environment fallbacks (used if no DB settings)
const ENV_LLM_API_KEY = process.env.LLM_API_KEY;
const ENV_LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const ENV_LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

// Provider base URLs
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  // Add more providers as needed
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

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface InvokeLLMParams {
  prompt: string;
  systemPrompt?: string;
  messages?: LLMMessage[];
  responseJsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  // Settings from database
  settings?: AIProviderSettings;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Create OpenAI client with the given settings
 */
function createClient(settings?: AIProviderSettings): OpenAI | null {
  // Determine API key (DB settings take priority over env)
  const apiKey = settings?.apiKey || ENV_LLM_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  // Determine base URL
  let baseUrl = ENV_LLM_BASE_URL;
  
  if (settings?.baseUrl) {
    baseUrl = settings.baseUrl;
  } else if (settings?.provider && PROVIDER_BASE_URLS[settings.provider]) {
    baseUrl = PROVIDER_BASE_URLS[settings.provider];
  }

  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
  });
}

/**
 * Invoke LLM with the given prompt
 * Returns either plain text or parsed JSON if responseJsonSchema is provided
 */
export async function invokeLLM(params: InvokeLLMParams): Promise<string | Record<string, unknown>> {
  const {
    prompt,
    systemPrompt,
    messages = [],
    responseJsonSchema,
    temperature,
    maxTokens,
    model,
    settings,
  } = params;

  // Use settings from params or fallback to env
  const effectiveModel = model || settings?.model || ENV_LLM_MODEL;
  const effectiveTemperature = temperature ?? settings?.temperature ?? 0.7;
  const effectiveMaxTokens = maxTokens ?? settings?.maxTokens ?? 2048;
  const effectiveSystemPrompt = systemPrompt || settings?.systemPrompt || undefined;

  // Create client with settings
  const client = createClient(settings);

  // If no API key, return a mock response for development
  if (!client) {
    console.warn("[LLM] No API key configured, returning mock response");
    if (responseJsonSchema) {
      return { relevant_titles: [] };
    }
    return "⚠️ AI сервис не настроен. Пожалуйста, добавьте API ключ в разделе \"Настройки ИИ\" админ-панели.";
  }

  try {
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (effectiveSystemPrompt) {
      chatMessages.push({ role: "system", content: effectiveSystemPrompt });
    }

    // Add history messages
    for (const msg of messages) {
      chatMessages.push({ role: msg.role, content: msg.content });
    }

    // Add the current prompt
    chatMessages.push({ role: "user", content: prompt });

    const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model: effectiveModel,
      messages: chatMessages,
      temperature: effectiveTemperature,
      max_tokens: effectiveMaxTokens,
    };

    // If JSON schema is provided, request JSON response
    if (responseJsonSchema) {
      requestParams.response_format = { type: "json_object" };
      // Add schema hint to the prompt
      const schemaHint = `\n\nRespond with a valid JSON object matching this schema: ${JSON.stringify(responseJsonSchema)}`;
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage.role === "user" && typeof lastMessage.content === "string") {
        lastMessage.content += schemaHint;
      }
    }

    const response = await client.chat.completions.create(requestParams);
    const content = response.choices[0]?.message?.content || "";

    // Parse JSON if schema was provided
    if (responseJsonSchema) {
      try {
        return JSON.parse(content);
      } catch (e) {
        console.error("[LLM] Failed to parse JSON response:", e);
        return {};
      }
    }

    return content;
  } catch (error) {
    console.error("[LLM] Error invoking LLM:", error);
    throw error;
  }
}

/**
 * Generate embedding for text (for future RAG implementation)
 */
export async function generateEmbedding(text: string, settings?: AIProviderSettings): Promise<number[]> {
  const client = createClient(settings);
  
  if (!client) {
    console.warn("[LLM] No API key configured, returning empty embedding");
    return [];
  }

  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("[LLM] Error generating embedding:", error);
    throw error;
  }
}

/**
 * Test connection to the LLM provider
 */
export async function testLLMConnection(settings: AIProviderSettings): Promise<{ success: boolean; message: string }> {
  const client = createClient(settings);
  
  if (!client) {
    return { success: false, message: "API ключ не указан" };
  }

  try {
    const response = await client.chat.completions.create({
      model: settings.model || ENV_LLM_MODEL,
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5,
    });
    
    if (response.choices[0]?.message?.content) {
      return { success: true, message: "Подключение успешно!" };
    }
    
    return { success: false, message: "Неожиданный ответ от сервера" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    return { success: false, message: `Ошибка: ${errorMessage}` };
  }
}

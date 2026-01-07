import OpenAI from "openai";

// LLM Client - abstracted to support different providers
const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai";
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

// OpenAI-compatible client (works with OpenAI, Azure, local LLMs, etc.)
const openai = LLM_API_KEY
  ? new OpenAI({
      apiKey: LLM_API_KEY,
      baseURL: LLM_BASE_URL,
    })
  : null;

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
 * Invoke LLM with the given prompt
 * Returns either plain text or parsed JSON if responseJsonSchema is provided
 */
export async function invokeLLM(params: InvokeLLMParams): Promise<string | Record<string, unknown>> {
  const {
    prompt,
    systemPrompt,
    messages = [],
    responseJsonSchema,
    temperature = 0.7,
    maxTokens = 2048,
    model = LLM_MODEL,
  } = params;

  // If no API key, return a mock response for development
  if (!openai) {
    console.warn("[LLM] No API key configured, returning mock response");
    if (responseJsonSchema) {
      return { relevant_titles: [] };
    }
    return "Извините, LLM сервис временно недоступен. Пожалуйста, попробуйте позже.";
  }

  try {
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      chatMessages.push({ role: "system", content: systemPrompt });
    }

    // Add history messages
    for (const msg of messages) {
      chatMessages.push({ role: msg.role, content: msg.content });
    }

    // Add the current prompt
    chatMessages.push({ role: "user", content: prompt });

    const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model,
      messages: chatMessages,
      temperature,
      max_tokens: maxTokens,
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

    const response = await openai.chat.completions.create(requestParams);
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
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    console.warn("[LLM] No API key configured, returning empty embedding");
    return [];
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("[LLM] Error generating embedding:", error);
    throw error;
  }
}

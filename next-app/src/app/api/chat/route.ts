import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invokeLLM, AIProviderSettings } from "@/lib/llm";
import { KnowledgeType } from "@prisma/client";
import { withCache, aiSettingsCache, knowledgeBaseCache } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limiter";
import { aiQueue } from "@/lib/ai-queue";
import { aiResponseCache } from "@/lib/ai-cache";
import { analyzeQuestion, getInstantResponse } from "@/lib/smart-router";
import {
  extractArticleCode,
  isKnowledgeBaseRequest,
  getCachedArticleResponse,
  cacheArticleResponse,
} from "@/lib/article-service";

export const dynamic = "force-dynamic";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
}

interface Product {
  id: string;
  name: string;
  vendorCode: string;
  price: number | null;
  description: string;
  picture: string;
  params: Record<string, unknown>;
}

interface KnowledgeItem {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  type: KnowledgeType;
  url: string | null;
  fileUrl: string | null;
  imageUrl: string | null;
  articleCode: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by session or IP
    const clientId = request.headers.get("x-session-id") || 
                     request.headers.get("x-forwarded-for") || 
                     "anonymous";
    
    const rateLimit = checkRateLimit(clientId, "chat");
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: "Слишком много запросов. Подождите немного.",
          retryAfter: rateLimit.headers["X-RateLimit-Reset"],
        },
        { 
          status: 429,
          headers: rateLimit.headers,
        }
      );
    }

    // Check queue capacity
    if (!aiQueue.hasCapacity()) {
      const waitTime = aiQueue.getEstimatedWaitTime();
      return NextResponse.json(
        { 
          message: "Сервис перегружен. Попробуйте через несколько секунд.",
          estimatedWait: Math.ceil(waitTime / 1000),
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { message, sessionId, chatHistory } = body as {
      message: string;
      sessionId: string;
      chatHistory: ChatMessage[];
    };

    if (!message) {
      return NextResponse.json(
        { message: "message is required" },
        { status: 400 }
      );
    }

    // === OPTIMIZATION 1: Instant responses for greetings ===
    const instantResponse = getInstantResponse(message);
    if (instantResponse) {
      return NextResponse.json({
        content: instantResponse,
        attachments: [],
        cached: true,
        responseTime: 0,
      });
    }

    // === OPTIMIZATION 2: Check semantic cache for similar questions ===
    const cachedResponse = aiResponseCache.get(message);
    if (cachedResponse) {
      return NextResponse.json({
        content: cachedResponse.response,
        attachments: [],
        cached: true,
        cacheHit: true,
      });
    }

    // === OPTIMIZATION 3: Smart routing ===
    const routingDecision = analyzeQuestion(message);

    // Load AI settings with caching (1 minute TTL)
    const aiSettings = await withCache(
      aiSettingsCache,
      "ai-settings",
      () => prisma.aISettings.findFirst()
    );

    // Prepare LLM settings
    const llmSettings: AIProviderSettings = {
      provider: aiSettings?.provider || "openai",
      apiKey: aiSettings?.apiKey,
      baseUrl: aiSettings?.baseUrl,
      model: aiSettings?.model || "gpt-4o-mini",
      temperature: aiSettings?.temperature || 0.7,
      maxTokens: aiSettings?.maxTokens || 2048,
      systemPrompt: aiSettings?.systemPrompt,
    };

    // Load knowledge base and XML feed in parallel with caching
    const [aiKnowledgeBase, xmlFeedItems] = await Promise.all([
      withCache(
        knowledgeBaseCache,
        "ai-sources",
        () => prisma.knowledgeBase.findMany({ where: { isAiSource: true } })
      ),
      withCache(
        knowledgeBaseCache,
        "xml-feeds",
        () => prisma.knowledgeBase.findMany({ where: { type: KnowledgeType.XML_FEED } })
      ),
    ]);

    // Build product index
    const productIndex = new Map<string, Product[]>();
    for (const item of xmlFeedItems) {
      const xmlData = item.xmlData as { products?: Product[] } | null;
      if (xmlData?.products) {
        for (const product of xmlData.products) {
          if (product.vendorCode) {
            const code = String(product.vendorCode).toLowerCase();
            if (!productIndex.has(code)) productIndex.set(code, []);
            productIndex.get(code)!.push(product);
          }
        }
      }
    }

    // === ARTICLE LOOKUP LOGIC ===
    const articleCode = extractArticleCode(message);
    const hasKnowledgeKeywords = isKnowledgeBaseRequest(message);

    if (articleCode && productIndex.size > 0) {
      const normalizedCode = articleCode.toLowerCase();
      
      // === CHECK ARTICLE CACHE FIRST ===
      if (!hasKnowledgeKeywords) {
        const cachedArticle = getCachedArticleResponse(normalizedCode);
        if (cachedArticle) {
          return NextResponse.json({
            content: cachedArticle.content,
            attachments: cachedArticle.attachments,
            cached: true,
            articleCache: true,
          });
        }
      }
      
      const matchedProducts = productIndex.get(normalizedCode) || [];

      // === EXACT MATCH FOUND ===
      if (matchedProducts.length > 0 && !hasKnowledgeKeywords) {
        const product = matchedProducts[0];

        // Return product info as JSON payload
        const productInfoPayload = {
          type: "product_info",
          data: {
            name: product.name,
            vendorCode: product.vendorCode,
            description: product.description,
            picture: product.picture,
            price: product.price ? `${product.price}` : "не указана",
            params: product.params || {},
          },
        };

        const aiAttachments = product.picture
          ? [{ name: product.name, url: product.picture, type: "image" }]
          : [];

        const responseContent = JSON.stringify(productInfoPayload);
        
        // Cache the article response
        cacheArticleResponse(normalizedCode, responseContent, aiAttachments);

        return NextResponse.json({
          content: responseContent,
          attachments: aiAttachments,
        });
      }

      // === SIMILAR ARTICLES SEARCH ===
      if (!hasKnowledgeKeywords && matchedProducts.length === 0) {
        const similarArticles: Product[] = [];

        // Search by prefix and contains
        productIndex.forEach((products, key) => {
          // Prefix match (e.g., "ABC12" matches "ABC12-1", "ABC12-2")
          if (key.startsWith(normalizedCode) && key !== normalizedCode) {
            similarArticles.push(...products);
          }
          // Contains match (e.g., "123" matches "ABC123")
          else if (key.includes(normalizedCode) && key !== normalizedCode && !key.startsWith(normalizedCode)) {
            similarArticles.push(...products);
          }
        });

        if (similarArticles.length > 0) {
          // Deduplicate by vendor code
          const uniqueArticles = similarArticles.reduce<Product[]>(
            (acc, product) => {
              if (!acc.find((p) => p.vendorCode === product.vendorCode)) {
                acc.push(product);
              }
              return acc;
            },
            []
          );

          // Sort alphabetically and limit to 15
          uniqueArticles.sort((a, b) =>
            String(a.vendorCode).localeCompare(String(b.vendorCode))
          );
          const limitedArticles = uniqueArticles.slice(0, 15);

          const suggestionText = `Точного артикула **${articleCode.toUpperCase()}** не найдено, но есть похожие варианты:\n\n${limitedArticles
            .map((p) => `🔸 **${p.vendorCode}** — ${p.name}`)
            .join("\n")}${uniqueArticles.length > 15 ? `\n\n...и ещё ${uniqueArticles.length - 15} вариантов` : ""}\n\nПожалуйста, уточните, какой именно артикул вас интересует.`;

          return NextResponse.json({
            content: suggestionText,
            attachments: [],
          });
        } else {
          // No similar articles found
          return NextResponse.json({
            content: `Извините, артикул **${articleCode.toUpperCase()}** не найден в базе данных. Проверьте правильность написания или попробуйте ввести часть артикула для поиска.`,
            attachments: [],
          });
        }
      }
      
      // === KNOWLEDGE BASE REQUEST FOR SPECIFIC ARTICLE ===
      if (hasKnowledgeKeywords && matchedProducts.length > 0) {
        // Continue to knowledge base logic below with article context
        const product = matchedProducts[0];
        // Add product context to the knowledge base search
        const productContext = `\n\nПродукт по артикулу ${product.vendorCode}: ${product.name}`;
        // This will be used in knowledge base search
      }
    }

    // === GENERAL KNOWLEDGE BASE LOGIC ===
    const knowledgeItems = aiKnowledgeBase.filter(
      (item) => item.type !== KnowledgeType.XML_FEED
    );
    let relevantItems: KnowledgeItem[] = [];

    if (knowledgeItems.length > 0) {
      const itemListForLLM = knowledgeItems.map((item) => ({
        title: item.title,
        description: item.description,
        article_code: item.articleCode,
      }));

      // Use LLM to find relevant items
      const searchPrompt = `Проанализируй запрос пользователя: "${message}".
Найди наиболее релевантные элементы из этого списка:
${JSON.stringify(itemListForLLM, null, 2)}
Верни ТОЛЬКО названия (title) самых подходящих элементов. Если ничего не подходит, верни пустой массив.`;

      const searchResult = (await invokeLLM({
        prompt: searchPrompt,
        responseJsonSchema: {
          type: "object",
          properties: {
            relevant_titles: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["relevant_titles"],
        },
        settings: llmSettings,
      })) as { relevant_titles?: string[] };

      if (searchResult?.relevant_titles?.length) {
        relevantItems = knowledgeItems.filter((item) =>
          searchResult.relevant_titles!.includes(item.title)
        );

        // Apply keyword filters
        const messageLower = message.toLowerCase();
        if (messageLower.includes("логотип")) {
          relevantItems = relevantItems.filter((i) =>
            i.title.toLowerCase().includes("логотип")
          );
        } else if (messageLower.includes("презентац")) {
          relevantItems = relevantItems.filter((i) =>
            i.title.toLowerCase().includes("презентац")
          );
        } else if (messageLower.includes("каталог")) {
          relevantItems = relevantItems.filter((i) =>
            i.title.toLowerCase().includes("каталог")
          );
        } else if (messageLower.includes("сертификат")) {
          relevantItems = relevantItems.filter((i) =>
            i.title.toLowerCase().includes("сертификат")
          );
        } else if (messageLower.includes("брендбук")) {
          relevantItems = relevantItems.filter((i) =>
            i.title.toLowerCase().includes("брендбук")
          );
        }
      }
    }

    // Check for download-type items (yandex_disk)
    if (relevantItems.length > 0) {
      const yandexDiskItems = relevantItems.filter(
        (i) => i.type === KnowledgeType.YANDEX_DISK
      );
      const downloadKeywords = [
        "скачать",
        "документ",
        "файл",
        "лого",
        "каталог",
        "инструкци",
        "сертификат",
        "брендбук",
        "презентац",
      ];
      const isDirectDownloadRequest = downloadKeywords.some((kw) =>
        message.toLowerCase().includes(kw)
      );
      const allRelevantAreYandexDisk = relevantItems.every(
        (i) => i.type === KnowledgeType.YANDEX_DISK
      );
      const shouldShowAsCards =
        isDirectDownloadRequest ||
        (allRelevantAreYandexDisk &&
          yandexDiskItems.length > 0 &&
          yandexDiskItems.length <= 3);

      if (yandexDiskItems.length > 1 && shouldShowAsCards) {
        // Return multi download links
        const multiDownloadPayload = {
          type: "multi_download_links",
          data: {
            items: yandexDiskItems.map((item) => ({
              text: `Скачать "${item.title}"`,
              url: item.url,
              title: item.title,
            })),
          },
        };
        return NextResponse.json({
          content: JSON.stringify(multiDownloadPayload),
          attachments: [],
        });
      }

      if (yandexDiskItems.length === 1 && shouldShowAsCards) {
        // Return single download link
        const item = yandexDiskItems[0];
        const downloadPayload = {
          type: "download_link",
          data: {
            text: `Вы можете скачать "${item.title}" по следующей ссылке`,
            url: item.url,
          },
        };
        return NextResponse.json({
          content: JSON.stringify(downloadPayload),
          attachments: [],
        });
      }

      // Use LLM with context
      let knowledgeContext = relevantItems
        .map((item) => {
          let ctx = `Источник: ${item.title}\nОписание: ${item.description || ""}\nСодержимое: ${item.content || ""}`;
          if (item.url) ctx += `\nСсылка на ресурс: ${item.url}`;
          if (item.fileUrl) ctx += `\nСсылка на файл: ${item.fileUrl}`;
          return ctx;
        })
        .join("\n\n---\n\n");

      const systemPrompt = `${aiSettings?.systemPrompt || "Вы - полезный ИИ-ассистент."}

Твоя главная задача — предоставлять пользователю точную информацию и прямые ссылки на материалы из базы знаний. Внимательно изучи предоставленный контекст.

ПРАВИЛА ОТВЕТА:
1. Отвечай СТРОГО на основе предоставленного контекста из базы знаний.
2. Если в контексте для какого-либо материала есть "Ссылка на ресурс" или "Ссылка на файл", ты ОБЯЗАН включить эту ссылку в свой ответ. Форматируй ссылки как кликабельные, например: [Название ссылки](URL).
3. Если ссылок несколько, предоставь их все.
4. Не придумывай информацию. Если ответа нет в контексте, сообщи об этом.`;

      const prompt = `Контекст из базы знаний:\n${knowledgeContext}\n\nИстория чата:\n${chatHistory
        .slice(-5)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n")}\n\nЗапрос пользователя: ${message}`;

      const textResponse = await invokeLLM({
        prompt,
        systemPrompt,
        settings: llmSettings,
      });

      const aiAttachments = relevantItems
        .filter((i) => i.imageUrl)
        .map((i) => ({ name: i.title, url: i.imageUrl!, type: "image" }));

      return NextResponse.json({
        content: textResponse as string,
        attachments: aiAttachments,
      });
    }

    // === FALLBACK: No relevant items found ===
    const clarificationPrompt = `Я не смог найти точный ответ на запрос пользователя: "${message}".
Проанализируй этот запрос и список тем, которые я знаю:
${JSON.stringify(knowledgeItems.map((i) => i.title))}

Сформируй дружелюбный уточняющий вопрос. Предложи 3-4 наиболее вероятные темы из списка, которые могли бы заинтересовать пользователя.
Например: "Я не совсем уверен, что вы ищете. Возможно, вас интересует что-то из этого: ...?"`;

    const clarificationResponse = await invokeLLM({
      prompt: clarificationPrompt,
      settings: llmSettings,
    });

    return NextResponse.json({
      content: clarificationResponse as string,
      attachments: [],
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

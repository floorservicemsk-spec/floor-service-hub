import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invokeLLM, AIProviderSettings } from "@/lib/llm";
import { KnowledgeType } from "@prisma/client";

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

    // Load AI settings
    const aiSettingsArr = await prisma.aISettings.findMany({ take: 1 });
    const aiSettings = aiSettingsArr[0] || null;

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

    // Load knowledge base items marked as AI source (excluding xml_feed)
    const aiKnowledgeBase = await prisma.knowledgeBase.findMany({
      where: { isAiSource: true },
    });

    // Load XML feed products for article lookup
    const xmlFeedItems = await prisma.knowledgeBase.findMany({
      where: { type: KnowledgeType.XML_FEED },
    });

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
    const articleRegex = /\b((?=\w*\d)(?=\w*[a-zA-Z])\w{3,})\b/i;
    const articleMatch = message.match(articleRegex);

    const knowledgeKeywords = [
      "текстур",
      "интерьер",
      "фото",
      "изображен",
      "картинк",
      "выглядит",
      "смотрится",
    ];
    const hasKnowledgeKeywords = knowledgeKeywords.some((kw) =>
      message.toLowerCase().includes(kw)
    );

    if (articleMatch && productIndex.size > 0) {
      const articleCode = articleMatch[1].toLowerCase();
      const matchedProducts = productIndex.get(articleCode) || [];

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
            price: product.price ? `${product.price} руб.` : "не указана",
            params: product.params || {},
          },
        };

        const aiAttachments = product.picture
          ? [{ name: product.name, url: product.picture, type: "image" }]
          : [];

        return NextResponse.json({
          content: JSON.stringify(productInfoPayload),
          attachments: aiAttachments,
        });
      }

      // If no exact match, suggest similar articles
      if (!hasKnowledgeKeywords && matchedProducts.length === 0) {
        const searchPrefix = articleMatch[1].toLowerCase();
        const similarArticles: Product[] = [];

        productIndex.forEach((products, key) => {
          if (key.startsWith(searchPrefix) && key !== searchPrefix) {
            similarArticles.push(...products);
          }
        });

        if (similarArticles.length > 0) {
          // Deduplicate
          const uniqueArticles = similarArticles.reduce<Product[]>(
            (acc, product) => {
              if (!acc.find((p) => p.vendorCode === product.vendorCode)) {
                acc.push(product);
              }
              return acc;
            },
            []
          );

          uniqueArticles.sort((a, b) =>
            String(a.vendorCode).localeCompare(String(b.vendorCode))
          );

          const suggestionText = `Точного артикула ${articleMatch[1].toUpperCase()} не найдено, но есть похожие варианты:\n\n${uniqueArticles
            .map((p) => `🔸 **${p.vendorCode}** — ${p.name}`)
            .join("\n")}\n\nПожалуйста, уточните, какой именно артикул вас интересует.`;

          return NextResponse.json({
            content: suggestionText,
            attachments: [],
          });
        } else {
          return NextResponse.json({
            content: `Извините, артикул ${articleMatch[1].toUpperCase()} не найден в базе данных. Проверьте правильность написания.`,
            attachments: [],
          });
        }
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

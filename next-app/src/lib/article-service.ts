/**
 * Article Service
 * 
 * Логика обработки артикулов как в оригинальном Base44:
 * 1. Идентификация артикула в сообщении
 * 2. Поиск точного совпадения в productIndex
 * 3. Поиск похожих артикулов
 * 4. Формирование ответа product_info
 * 5. Интеграция с базой знаний для текстур/фото
 */

import prisma from "@/lib/prisma";
import { KnowledgeType } from "@prisma/client";
import { withCache, knowledgeBaseCache } from "@/lib/cache";

// Types
export interface Product {
  id: string;
  name: string;
  vendorCode: string;
  price: number | null;
  description: string;
  picture: string;
  params: Record<string, unknown>;
  vendor?: string;
  url?: string;
}

export interface ArticleSearchResult {
  type: 'exact_match' | 'similar_matches' | 'not_found' | 'knowledge_base';
  product?: Product;
  similarProducts?: Product[];
  knowledgeContent?: string;
  articleCode: string;
}

export interface ProductInfoPayload {
  type: 'product_info';
  data: {
    name: string;
    vendorCode: string;
    description: string;
    picture: string;
    price: string;
    params: Record<string, unknown>;
  };
}

// Article regex - matches alphanumeric codes with at least one letter and one digit
const ARTICLE_REGEX = /\b((?=\w*\d)(?=\w*[a-zA-Z])\w{3,})\b/i;

// Keywords indicating knowledge base lookup (textures, photos, etc.)
const KNOWLEDGE_KEYWORDS = [
  'текстур',
  'интерьер', 
  'фото',
  'изображен',
  'картинк',
  'выглядит',
  'смотрится',
  'дизайн',
  'применен',
  'пример',
  'сочетан',
  'комбинир',
];

// Keywords for document requests
const DOCUMENT_KEYWORDS = [
  'укладк',
  'монтаж',
  'инструкци',
  'сертификат',
  'документ',
];

/**
 * Extract article code from user message
 */
export function extractArticleCode(message: string): string | null {
  const match = message.match(ARTICLE_REGEX);
  return match ? match[1] : null;
}

/**
 * Check if message requests knowledge base content (textures, photos, etc.)
 */
export function isKnowledgeBaseRequest(message: string): boolean {
  const msgLower = message.toLowerCase();
  return KNOWLEDGE_KEYWORDS.some(kw => msgLower.includes(kw));
}

/**
 * Check if message requests documents
 */
export function isDocumentRequest(message: string): boolean {
  const msgLower = message.toLowerCase();
  return DOCUMENT_KEYWORDS.some(kw => msgLower.includes(kw));
}

/**
 * Build product index from XML feeds (cached)
 */
export async function getProductIndex(): Promise<Map<string, Product[]>> {
  const xmlFeeds = await withCache(
    knowledgeBaseCache,
    "xml-feeds-full",
    () => prisma.knowledgeBase.findMany({
      where: { type: KnowledgeType.XML_FEED },
      select: { xmlData: true },
    }),
    10 * 60 * 1000 // 10 min cache
  );

  const index = new Map<string, Product[]>();

  for (const feed of xmlFeeds) {
    const xmlData = feed.xmlData as { products?: Product[] } | null;
    if (xmlData?.products) {
      for (const product of xmlData.products) {
        if (product.vendorCode) {
          const code = String(product.vendorCode).toLowerCase();
          if (!index.has(code)) {
            index.set(code, []);
          }
          index.get(code)!.push(product);
        }
      }
    }
  }

  return index;
}

/**
 * Find exact product match by article code
 */
export function findExactProduct(
  productIndex: Map<string, Product[]>,
  articleCode: string
): Product | null {
  const matches = productIndex.get(articleCode.toLowerCase());
  return matches?.[0] || null;
}

/**
 * Find similar products (prefix match)
 */
export function findSimilarProducts(
  productIndex: Map<string, Product[]>,
  articleCode: string,
  limit: number = 10
): Product[] {
  const prefix = articleCode.toLowerCase();
  const similar: Product[] = [];

  productIndex.forEach((products, key) => {
    // Match by prefix or partial match
    if (key.startsWith(prefix) && key !== prefix) {
      similar.push(...products);
    } else if (key.includes(prefix) && key !== prefix) {
      similar.push(...products);
    }
  });

  // Deduplicate by vendor code
  const unique = similar.reduce<Product[]>((acc, product) => {
    if (!acc.find(p => p.vendorCode === product.vendorCode)) {
      acc.push(product);
    }
    return acc;
  }, []);

  // Sort alphabetically
  unique.sort((a, b) => 
    String(a.vendorCode).localeCompare(String(b.vendorCode))
  );

  return unique.slice(0, limit);
}

/**
 * Format product as product_info JSON payload
 */
export function formatProductInfoPayload(product: Product): ProductInfoPayload {
  return {
    type: 'product_info',
    data: {
      name: product.name,
      vendorCode: product.vendorCode,
      description: product.description || '',
      picture: product.picture || '',
      price: product.price ? `${product.price}` : 'не указана',
      params: product.params || {},
    },
  };
}

/**
 * Format similar products suggestion message
 */
export function formatSimilarProductsMessage(
  articleCode: string,
  products: Product[]
): string {
  if (products.length === 0) {
    return `Артикул ${articleCode.toUpperCase()} не найден в базе данных. Проверьте правильность написания.`;
  }

  const productList = products
    .map(p => `🔸 **${p.vendorCode}** — ${p.name}`)
    .join('\n');

  return `Точного артикула ${articleCode.toUpperCase()} не найдено, но есть похожие варианты:\n\n${productList}\n\nПожалуйста, уточните, какой именно артикул вас интересует.`;
}

/**
 * Main article processing function
 */
export async function processArticleRequest(
  message: string,
  productIndex: Map<string, Product[]>
): Promise<ArticleSearchResult | null> {
  // 1. Extract article code
  const articleCode = extractArticleCode(message);
  if (!articleCode) {
    return null; // No article found in message
  }

  // 2. Check if this is a knowledge base request
  const isKbRequest = isKnowledgeBaseRequest(message);

  // 3. Find exact product match
  const exactProduct = findExactProduct(productIndex, articleCode);

  if (exactProduct && !isKbRequest) {
    // Return product info
    return {
      type: 'exact_match',
      product: exactProduct,
      articleCode,
    };
  }

  // 4. If no exact match, find similar products
  if (!exactProduct) {
    const similarProducts = findSimilarProducts(productIndex, articleCode);
    
    if (similarProducts.length > 0) {
      return {
        type: 'similar_matches',
        similarProducts,
        articleCode,
      };
    }

    return {
      type: 'not_found',
      articleCode,
    };
  }

  // 5. Knowledge base request for specific article
  if (isKbRequest && exactProduct) {
    return {
      type: 'knowledge_base',
      product: exactProduct,
      articleCode,
    };
  }

  return null;
}

/**
 * Generate response for article search result
 */
export function generateArticleResponse(
  result: ArticleSearchResult
): { content: string; attachments: Array<{ name: string; url: string; type: string }> } {
  switch (result.type) {
    case 'exact_match':
      if (result.product) {
        const payload = formatProductInfoPayload(result.product);
        const attachments = result.product.picture
          ? [{ name: result.product.name, url: result.product.picture, type: 'image' }]
          : [];
        return {
          content: JSON.stringify(payload),
          attachments,
        };
      }
      break;

    case 'similar_matches':
      return {
        content: formatSimilarProductsMessage(result.articleCode, result.similarProducts || []),
        attachments: [],
      };

    case 'not_found':
      return {
        content: `Извините, артикул ${result.articleCode.toUpperCase()} не найден в базе данных. Проверьте правильность написания или попробуйте ввести другой артикул.`,
        attachments: [],
      };

    case 'knowledge_base':
      // This case should be handled by the main chat logic with AI
      break;
  }

  return {
    content: '',
    attachments: [],
  };
}

// Cache for article responses (server-side)
const articleCache = new Map<string, {
  content: string;
  attachments: Array<{ name: string; url: string; type: string }>;
  timestamp: number;
}>();

const ARTICLE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get cached article response
 */
export function getCachedArticleResponse(articleCode: string): {
  content: string;
  attachments: Array<{ name: string; url: string; type: string }>;
} | null {
  const cached = articleCache.get(articleCode.toLowerCase());
  
  if (cached && Date.now() - cached.timestamp < ARTICLE_CACHE_TTL) {
    return {
      content: cached.content,
      attachments: cached.attachments,
    };
  }
  
  if (cached) {
    articleCache.delete(articleCode.toLowerCase());
  }
  
  return null;
}

/**
 * Cache article response
 */
export function cacheArticleResponse(
  articleCode: string,
  content: string,
  attachments: Array<{ name: string; url: string; type: string }>
): void {
  articleCache.set(articleCode.toLowerCase(), {
    content,
    attachments,
    timestamp: Date.now(),
  });

  // Limit cache size
  if (articleCache.size > 1000) {
    const entries = Array.from(articleCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    entries.slice(0, 200).forEach(([key]) => articleCache.delete(key));
  }
}

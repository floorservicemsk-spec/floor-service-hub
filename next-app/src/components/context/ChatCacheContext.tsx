"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

/**
 * ChatCacheContext - Кэширование ответов для артикулов
 * 
 * Логика как в оригинальном Base44:
 * - Кэширует ответы по артикулам для мгновенного повторного показа
 * - Различает запросы по артикулу и запросы по базе знаний
 */

interface CachedArticleResponse {
  articleCode: string;
  response: string;
  attachments: Array<{ name: string; url: string; type: string }>;
  timestamp: number;
  hitCount: number;
}

interface ChatCacheContextValue {
  // Get cached response for article
  getCachedResponse: (articleCode: string) => CachedArticleResponse | null;
  // Cache a new response
  cacheResponse: (
    articleCode: string,
    response: string,
    attachments?: Array<{ name: string; url: string; type: string }>
  ) => void;
  // Check if article request should use knowledge base
  isKnowledgeBaseRequest: (message: string) => boolean;
  // Clear cache
  clearCache: () => void;
  // Get cache stats
  getCacheStats: () => { size: number; hitRate: number; totalHits: number };
}

const ChatCacheContext = createContext<ChatCacheContextValue | null>(null);

// Keywords that indicate knowledge base lookup needed (not just product info)
const KNOWLEDGE_BASE_KEYWORDS = [
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
  'укладк',
  'монтаж',
  'инструкци',
];

// Article code regex pattern
const ARTICLE_REGEX = /\b((?=\w*\d)(?=\w*[a-zA-Z])\w{3,})\b/gi;

export function ChatCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache] = useState<Map<string, CachedArticleResponse>>(new Map());
  const [stats, setStats] = useState({ hits: 0, misses: 0 });

  // Check if message contains knowledge base keywords
  const isKnowledgeBaseRequest = useCallback((message: string): boolean => {
    const msgLower = message.toLowerCase();
    return KNOWLEDGE_BASE_KEYWORDS.some(kw => msgLower.includes(kw));
  }, []);

  // Extract article code from message
  const extractArticleCode = useCallback((message: string): string | null => {
    const matches = message.match(ARTICLE_REGEX);
    if (matches && matches.length > 0) {
      return matches[0].toLowerCase();
    }
    return null;
  }, []);

  // Get cached response
  const getCachedResponse = useCallback((articleCode: string): CachedArticleResponse | null => {
    const normalized = articleCode.toLowerCase();
    const cached = cache.get(normalized);
    
    if (cached) {
      // Check TTL (1 hour)
      const TTL = 60 * 60 * 1000;
      if (Date.now() - cached.timestamp > TTL) {
        cache.delete(normalized);
        return null;
      }
      
      // Update hit count
      cached.hitCount++;
      setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
      return cached;
    }
    
    setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
    return null;
  }, [cache]);

  // Cache a response
  const cacheResponse = useCallback((
    articleCode: string,
    response: string,
    attachments: Array<{ name: string; url: string; type: string }> = []
  ): void => {
    const normalized = articleCode.toLowerCase();
    
    cache.set(normalized, {
      articleCode: normalized,
      response,
      attachments,
      timestamp: Date.now(),
      hitCount: 0,
    });

    // Limit cache size to 500 items
    if (cache.size > 500) {
      // Remove oldest entries
      const entries = Array.from(cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, 100);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, [cache]);

  // Clear all cache
  const clearCache = useCallback((): void => {
    cache.clear();
    setStats({ hits: 0, misses: 0 });
  }, [cache]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const total = stats.hits + stats.misses;
    return {
      size: cache.size,
      hitRate: total > 0 ? Math.round((stats.hits / total) * 100) : 0,
      totalHits: stats.hits,
    };
  }, [cache.size, stats]);

  const value = useMemo((): ChatCacheContextValue => ({
    getCachedResponse,
    cacheResponse,
    isKnowledgeBaseRequest,
    clearCache,
    getCacheStats,
  }), [getCachedResponse, cacheResponse, isKnowledgeBaseRequest, clearCache, getCacheStats]);

  return (
    <ChatCacheContext.Provider value={value}>
      {children}
    </ChatCacheContext.Provider>
  );
}

export function useChatCache() {
  const context = useContext(ChatCacheContext);
  if (!context) {
    throw new Error("useChatCache must be used within a ChatCacheProvider");
  }
  return context;
}

// Utility function to extract article from message
export function extractArticleFromMessage(message: string): string | null {
  const matches = message.match(ARTICLE_REGEX);
  if (matches && matches.length > 0) {
    return matches[0];
  }
  return null;
}

// Check if message is asking about knowledge base content for an article
export function isArticleKnowledgeRequest(message: string): boolean {
  const msgLower = message.toLowerCase();
  return KNOWLEDGE_BASE_KEYWORDS.some(kw => msgLower.includes(kw));
}

export default ChatCacheContext;

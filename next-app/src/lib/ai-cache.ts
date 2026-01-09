/**
 * Semantic AI Response Cache
 * 
 * Кэширует ответы на похожие вопросы, экономя до 90% запросов к LLM
 * Используется fuzzy matching для поиска похожих запросов
 */

interface CachedResponse {
  question: string;
  response: string;
  timestamp: number;
  hitCount: number;
  tokens: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  savedTokens: number;
  savedCost: number;
}

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\wа-яё\s]/gi, '') // Keep only letters and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity between two strings (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(normalizeText(str1).split(' '));
  const set2 = new Set(normalizeText(str2).split(' '));
  
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  
  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

// Extract key terms from question
function extractKeyTerms(text: string): string[] {
  const normalized = normalizeText(text);
  const stopWords = new Set([
    'что', 'как', 'где', 'когда', 'почему', 'какой', 'какая', 'какие',
    'это', 'для', 'при', 'без', 'или', 'если', 'то', 'не', 'да', 'нет',
    'мне', 'меня', 'вам', 'вас', 'нам', 'нас', 'ему', 'ей', 'им',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'can', 'may', 'might', 'must', 'shall', 'should',
  ]);
  
  return normalized
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word));
}

class AIResponseCache {
  private cache = new Map<string, CachedResponse>();
  private maxSize: number;
  private ttl: number; // Time to live in ms
  private similarityThreshold: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    savedTokens: 0,
    savedCost: 0,
  };

  constructor(options: {
    maxSize?: number;
    ttlMinutes?: number;
    similarityThreshold?: number;
  } = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.ttl = (options.ttlMinutes ?? 60) * 60 * 1000; // Default 1 hour
    this.similarityThreshold = options.similarityThreshold ?? 0.75;
    
    // Cleanup expired entries periodically
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
    }
  }

  /**
   * Find cached response for similar question
   */
  get(question: string): CachedResponse | null {
    const normalized = normalizeText(question);
    const keyTerms = extractKeyTerms(question);
    
    // Direct match first
    if (this.cache.has(normalized)) {
      const cached = this.cache.get(normalized)!;
      if (Date.now() - cached.timestamp < this.ttl) {
        cached.hitCount++;
        this.stats.hits++;
        this.stats.savedTokens += cached.tokens;
        this.stats.savedCost += cached.tokens * 0.00001; // Approximate cost
        return cached;
      }
      this.cache.delete(normalized);
    }
    
    // Fuzzy match
    let bestMatch: CachedResponse | null = null;
    let bestSimilarity = 0;
    
    this.cache.forEach((cached) => {
      if (Date.now() - cached.timestamp >= this.ttl) return;
      
      const similarity = calculateSimilarity(question, cached.question);
      
      // Also check key term overlap
      const cachedTerms = extractKeyTerms(cached.question);
      const termOverlap = keyTerms.filter(t => cachedTerms.includes(t)).length / 
                         Math.max(keyTerms.length, cachedTerms.length);
      
      const combinedScore = (similarity * 0.6) + (termOverlap * 0.4);
      
      if (combinedScore > bestSimilarity && combinedScore >= this.similarityThreshold) {
        bestSimilarity = combinedScore;
        bestMatch = cached;
      }
    });
    
    if (bestMatch !== null) {
      const match = bestMatch as CachedResponse;
      match.hitCount++;
      this.stats.hits++;
      this.stats.savedTokens += match.tokens;
      this.stats.savedCost += match.tokens * 0.00001;
      return match;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Cache a new response
   */
  set(question: string, response: string, tokens: number = 500): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const normalized = normalizeText(question);
    this.cache.set(normalized, {
      question,
      response,
      timestamp: Date.now(),
      hitCount: 0,
      tokens,
    });
  }

  /**
   * Evict oldest/least used entries
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by score (age + hit count)
    entries.sort(([, a], [, b]) => {
      const scoreA = (Date.now() - a.timestamp) / 1000 - a.hitCount * 100;
      const scoreB = (Date.now() - b.timestamp) / 1000 - b.hitCount * 100;
      return scoreB - scoreA; // Higher score = should be evicted
    });
    
    // Remove bottom 10%
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp >= this.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100),
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Pre-warm cache with common questions
   */
  preWarm(questionAnswerPairs: Array<{ question: string; answer: string; tokens?: number }>): void {
    for (const { question, answer, tokens } of questionAnswerPairs) {
      this.set(question, answer, tokens ?? 500);
    }
  }
}

// Singleton instance
export const aiResponseCache = new AIResponseCache({
  maxSize: 1000,
  ttlMinutes: 60,
  similarityThreshold: 0.7, // 70% similarity for fuzzy match
});

// Common questions for pre-warming (можно настроить под ваш бизнес)
export const COMMON_QUESTIONS = [
  {
    question: "Как связаться с поддержкой?",
    answer: "Вы можете связаться с нашей поддержкой по телефону 8-800-XXX-XXXX или написать на email support@floor-svs.ru. Мы работаем с 9:00 до 18:00 по московскому времени.",
    tokens: 100,
  },
  {
    question: "Какие способы оплаты вы принимаете?",
    answer: "Мы принимаем оплату банковскими картами, безналичный расчёт для юридических лиц, а также наличными при самовывозе.",
    tokens: 80,
  },
  {
    question: "Как оформить возврат?",
    answer: "Для оформления возврата свяжитесь с нашей поддержкой в течение 14 дней с момента получения товара. Товар должен сохранить товарный вид и оригинальную упаковку.",
    tokens: 90,
  },
];

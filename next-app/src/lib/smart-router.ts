/**
 * Smart AI Model Router
 * 
 * Автоматически выбирает модель в зависимости от сложности запроса:
 * - Простые вопросы → gpt-4o-mini (быстрее, дешевле)
 * - Сложные вопросы → gpt-4o / claude (точнее)
 * - Информация о товарах → не требует AI (из базы)
 */

interface RoutingDecision {
  useAI: boolean;
  model: 'fast' | 'standard' | 'advanced';
  reason: string;
  confidence: number;
}

// Паттерны для простых запросов (можно ответить быстро)
const SIMPLE_PATTERNS = [
  /^(привет|здравствуй|добрый день|доброе утро|добрый вечер)/i,
  /^(спасибо|благодарю|благодарность)/i,
  /^(пока|до свидания|всего хорошего)/i,
  /^(да|нет|ок|окей|хорошо|понятно)$/i,
  /как (связаться|позвонить|написать)/i,
  /ваш (телефон|адрес|email|почта|контакт)/i,
  /режим работы/i,
  /способ (оплаты|доставки)/i,
  /срок (доставки|гарантии)/i,
];

// Паттерны для товарных запросов (можно достать из базы)
const PRODUCT_PATTERNS = [
  /артикул\s*[:\s]?\s*([a-zA-Z0-9\-]+)/i,
  /\b([a-zA-Z]{2,}\d{2,}[a-zA-Z0-9\-]*)\b/i, // Артикулы типа AB123
  /цена\s+(на\s+)?[a-zA-Z0-9]/i,
  /наличи[еи]\s+[a-zA-Z0-9]/i,
  /характеристик[иа]\s+[a-zA-Z0-9]/i,
  /остат(ок|ки)\s+[a-zA-Z0-9]/i,
];

// Паттерны для сложных запросов (требуют мощной модели)
const COMPLEX_PATTERNS = [
  /сравн[иите]/i,
  /порекоменд/i,
  /подобр(ать|и)/i,
  /какой лучше/i,
  /разница между/i,
  /объясн[ии]/i,
  /почему/i,
  /в чём отличи/i,
  /для (какого|каких) (помещени|интерьер)/i,
];

// Паттерны для файловых запросов
const FILE_PATTERNS = [
  /скачать/i,
  /документ/i,
  /сертификат/i,
  /каталог/i,
  /прайс/i,
  /инструкци/i,
  /презентац/i,
  /логотип/i,
  /брендбук/i,
];

/**
 * Analyze question complexity and route to appropriate model
 */
export function analyzeQuestion(question: string): RoutingDecision {
  const text = question.toLowerCase().trim();
  const wordCount = text.split(/\s+/).length;
  
  // Very short greetings/confirmations - no AI needed
  if (wordCount <= 3) {
    for (const pattern of SIMPLE_PATTERNS) {
      if (pattern.test(text)) {
        return {
          useAI: false,
          model: 'fast',
          reason: 'simple_greeting',
          confidence: 0.95,
        };
      }
    }
  }
  
  // Product lookup - search database first
  for (const pattern of PRODUCT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        useAI: false,
        model: 'fast',
        reason: 'product_lookup',
        confidence: 0.9,
      };
    }
  }
  
  // File/document requests - search knowledge base
  for (const pattern of FILE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        useAI: true,
        model: 'fast', // Just need to find the right file
        reason: 'file_request',
        confidence: 0.85,
      };
    }
  }
  
  // Complex analytical questions - use advanced model
  for (const pattern of COMPLEX_PATTERNS) {
    if (pattern.test(text)) {
      return {
        useAI: true,
        model: 'advanced',
        reason: 'complex_analysis',
        confidence: 0.8,
      };
    }
  }
  
  // Long questions are usually complex
  if (wordCount > 20) {
    return {
      useAI: true,
      model: 'advanced',
      reason: 'long_question',
      confidence: 0.7,
    };
  }
  
  // Simple factual questions
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        useAI: true,
        model: 'fast',
        reason: 'simple_question',
        confidence: 0.85,
      };
    }
  }
  
  // Default: standard model
  return {
    useAI: true,
    model: 'standard',
    reason: 'general_question',
    confidence: 0.6,
  };
}

/**
 * Get model name based on routing decision
 */
export function getModelForRoute(
  decision: RoutingDecision,
  settings: { model?: string; fastModel?: string; advancedModel?: string }
): string {
  const fastModel = settings.fastModel || 'gpt-4o-mini';
  const standardModel = settings.model || 'gpt-4o-mini';
  const advancedModel = settings.advancedModel || settings.model || 'gpt-4o';
  
  switch (decision.model) {
    case 'fast':
      return fastModel;
    case 'advanced':
      return advancedModel;
    default:
      return standardModel;
  }
}

/**
 * Pre-defined responses for common simple questions
 */
export const INSTANT_RESPONSES: Record<string, string> = {
  'привет': 'Здравствуйте! Чем могу помочь?',
  'здравствуйте': 'Здравствуйте! Готов ответить на ваши вопросы.',
  'добрый день': 'Добрый день! Чем могу быть полезен?',
  'доброе утро': 'Доброе утро! Готов помочь вам.',
  'добрый вечер': 'Добрый вечер! Чем могу помочь?',
  'спасибо': 'Пожалуйста! Если будут ещё вопросы — обращайтесь.',
  'благодарю': 'Рад помочь! Обращайтесь, если понадобится.',
  'пока': 'До свидания! Хорошего дня!',
  'до свидания': 'До свидания! Будем рады видеть вас снова.',
};

/**
 * Try to get instant response without AI
 */
export function getInstantResponse(question: string): string | null {
  const normalized = question.toLowerCase().trim();
  
  // Direct match
  if (INSTANT_RESPONSES[normalized]) {
    return INSTANT_RESPONSES[normalized];
  }
  
  // Partial match
  for (const [key, response] of Object.entries(INSTANT_RESPONSES)) {
    if (normalized.startsWith(key) || normalized.includes(key)) {
      return response;
    }
  }
  
  return null;
}

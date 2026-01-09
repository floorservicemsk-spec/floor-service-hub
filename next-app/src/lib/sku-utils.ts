/**
 * SKU/Product utilities
 */

export interface StockInfo {
  inStock: boolean;
  displayText: string;
  qty: number | null;
}

export const parseStock = (text: unknown): StockInfo => {
  if (text === null || text === undefined) {
    return { inStock: false, displayText: 'Нет в наличии', qty: null };
  }

  // Normalize: remove all whitespace types, lowercase
  const stockText = String(text)
    .toLowerCase()
    .replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F]/g, ' ')
    .trim();

  // Explicit "out of stock" cases
  if (
    stockText === '0' ||
    stockText.includes('нет') ||
    stockText.includes('отсутствует') ||
    stockText === '' ||
    stockText === 'null'
  ) {
    return { inStock: false, displayText: 'Нет в наличии', qty: null };
  }

  // Cases like "более X" or ">= X" (highest priority)
  const moreMatch = stockText.match(/(?:более|больше|>|≥)\s*(\d+)/);
  if (moreMatch) {
    const number = parseInt(moreMatch[1], 10);
    return {
      inStock: true,
      displayText: `В наличии (≥${number} уп.)`,
      qty: null,
    };
  }

  // Just "в наличии" without number
  if (stockText.includes('в наличии') && !stockText.match(/\d+/)) {
    return { inStock: true, displayText: 'В наличии', qty: null };
  }

  // Numeric values with suffixes
  const numberMatch = stockText.match(/^(\d+)(?:\s*(?:шт|уп|ед|pcs|упак))?\.?$/);
  if (numberMatch) {
    const qty = parseInt(numberMatch[1], 10);
    if (qty > 0) {
      return {
        inStock: true,
        displayText: `В наличии (${qty} уп.)`,
        qty: qty,
      };
    } else {
      return { inStock: false, displayText: 'Нет в наличии', qty: 0 };
    }
  }

  // Fallback: if not recognized but has a number > 0
  const anyNumberMatch = stockText.match(/(\d+)/);
  if (anyNumberMatch) {
    const qty = parseInt(anyNumberMatch[1], 10);
    if (qty > 0) {
      return {
        inStock: true,
        displayText: `В наличии (${qty} уп.)`,
        qty: qty,
      };
    }
  }

  // Default - out of stock
  return { inStock: false, displayText: 'Нет в наличии', qty: null };
};

export const colorDictionary: Record<string, string> = {
  // Main feed colors (priority)
  'натуральный': '#d8b47a',
  'светло-серый': '#d3d3d3',
  'серый': '#808080',
  'бежевый': '#f5f5dc',
  'дуб': '#c8a165',
  'белёный дуб': '#f5f0e8',
  'выбеленный дуб': '#f0ead6',
  'белый': '#ffffff',
  'чёрный': '#000000',
  'черный': '#000000',

  // Extended palette
  'светлый дуб': '#d4b896',
  'тёмный дуб': '#8b6f47',
  'дуб натуральный': '#c19a6b',
  'дуб рустик': '#a67c52',
  'дуб винтаж': '#9d7a56',
  'дуб кантри': '#b8956f',
  'дуб классик': '#c8a165',

  // Brown shades
  'коричневый': '#964b00',
  'светло-коричневый': '#c4a484',
  'тёмно-коричневый': '#654321',
  'шоколадный': '#d2691e',
  'орех': '#773f1a',
  'тёмный орех': '#5d2f0a',
  'светлый орех': '#8b5a2b',
  'венге': '#645452',
  'махагон': '#c04000',

  // Gray shades
  'антрацит': '#36454f',
  'графитовый': '#4c4e52',
  'платиновый': '#e5e4e2',
  'серебристый': '#c0c0c0',
  'пепельный': '#b2beb5',
  'стальной': '#71797e',

  // Beige/cream
  'кремовый': '#fffdd0',
  'слоновая кость': '#fffff0',
  'молочный': '#fdfbf4',
  'песочный': '#f4a460',
  'пшеничный': '#f5deb3',
  'льняной': '#faf0e6',

  // Red shades
  'красный': '#ff0000',
  'вишнёвый': '#911e42',
  'бордовый': '#800000',
  'алый': '#ff2400',
  'терракотовый': '#e2725b',

  // Other colors
  'зелёный': '#008000',
  'синий': '#0000ff',
  'жёлтый': '#ffff00',
  'оранжевый': '#ffa500',
  'фиолетовый': '#8b00ff',
  'розовый': '#ffc0cb',
  'голубой': '#add8e6',
};

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const hexToRgb = (hex: string): RGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const parseColorText = (text: string): RGB | null => {
  if (!text || typeof text !== 'string') return null;

  // Normalize: lowercase, remove extra spaces
  const cleanedText = text.toLowerCase().trim().replace(/\s+/g, ' ');

  // Check for HEX in text
  const hexMatch = cleanedText.match(/#([a-f0-9]{6}|[a-f0-9]{3})/i);
  if (hexMatch) {
    return hexToRgb(hexMatch[0]);
  }

  // Exact match in dictionary
  if (colorDictionary[cleanedText]) {
    return hexToRgb(colorDictionary[cleanedText]);
  }

  // Search by inclusion (for compound names like "дуб светлый")
  for (const [key, hex] of Object.entries(colorDictionary)) {
    if (cleanedText.includes(key) || key.includes(cleanedText)) {
      return hexToRgb(hex);
    }
  }

  // Search by first word
  const firstWord = cleanedText.split(/[\s/-]/)[0];
  if (colorDictionary[firstWord]) {
    return hexToRgb(colorDictionary[firstWord]);
  }

  return null;
};

export const colorDistance = (rgb1: RGB | null, rgb2: RGB | null): number => {
  if (!rgb1 || !rgb2) return Infinity;
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );
};

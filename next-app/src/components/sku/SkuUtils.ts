export const colorDictionary: Record<string, string> = {
  // Основные цвета фида (приоритетные)
  натуральный: "#d8b47a",
  "светло-серый": "#d3d3d3",
  серый: "#808080",
  бежевый: "#f5f5dc",
  дуб: "#c8a165",
  "белёный дуб": "#f5f0e8",
  "выбеленный дуб": "#f0ead6",
  белый: "#ffffff",
  чёрный: "#000000",
  черный: "#000000",

  // Расширенная палитра
  "светлый дуб": "#d4b896",
  "тёмный дуб": "#8b6f47",
  "дуб натуральный": "#c19a6b",
  "дуб рустик": "#a67c52",
  "дуб винтаж": "#9d7a56",
  "дуб кантри": "#b8956f",
  "дуб классик": "#c8a165",

  // Коричневые оттенки
  коричневый: "#964b00",
  "светло-коричневый": "#c4a484",
  "тёмно-коричневый": "#654321",
  шоколадный: "#d2691e",
  орех: "#773f1a",
  "тёмный орех": "#5d2f0a",
  "светлый орех": "#8b5a2b",
  венге: "#645452",
  махагон: "#c04000",

  // Серые оттенки
  антрацит: "#36454f",
  графитовый: "#4c4e52",
  платиновый: "#e5e4e2",
  серебристый: "#c0c0c0",
  пепельный: "#b2beb5",
  стальной: "#71797e",

  // Бежевые/кремовые
  кремовый: "#fffdd0",
  "слоновая кость": "#fffff0",
  молочный: "#fdfbf4",
  песочный: "#f4a460",
  пшеничный: "#f5deb3",
  льняной: "#faf0e6",

  // Красные оттенки
  красный: "#ff0000",
  вишнёвый: "#911e42",
  бордовый: "#800000",
  алый: "#ff2400",
  терракотовый: "#e2725b",

  // Прочие цвета
  зелёный: "#008000",
  синий: "#0000ff",
  жёлтый: "#ffff00",
  оранжевый: "#ffa500",
  фиолетовый: "#8b00ff",
  розовый: "#ffc0cb",
  голубой: "#add8e6",
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

export const parseColorText = (text: string | null | undefined): RGB | null => {
  if (!text || typeof text !== "string") return null;

  // Нормализация: нижний регистр, убираем лишние пробелы
  const cleanedText = text.toLowerCase().trim().replace(/\s+/g, " ");

  // Проверяем HEX в тексте
  const hexMatch = cleanedText.match(/#([a-f0-9]{6}|[a-f0-9]{3})/i);
  if (hexMatch) {
    return hexToRgb(hexMatch[0]);
  }

  // Точное соответствие в словаре
  if (colorDictionary[cleanedText]) {
    return hexToRgb(colorDictionary[cleanedText]);
  }

  // Поиск по включению (для составных названий типа "дуб светлый")
  for (const [key, hex] of Object.entries(colorDictionary)) {
    if (cleanedText.includes(key) || key.includes(cleanedText)) {
      return hexToRgb(hex);
    }
  }

  // Поиск по первому слову
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

export interface StockInfo {
  inStock: boolean;
  displayText: string;
  qty: number | null;
}

export const parseStock = (text: string | null | undefined): StockInfo => {
  if (text === null || text === undefined) {
    return { inStock: false, displayText: "Нет в наличии", qty: null };
  }

  // Нормализация: убираем все виды пробелов, приводим к нижнему регистру
  const stockText = String(text)
    .toLowerCase()
    .replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F]/g, " ")
    .trim();

  // Явные случаи "нет в наличии"
  if (
    stockText === "0" ||
    stockText.includes("нет") ||
    stockText.includes("отсутствует") ||
    stockText === "" ||
    stockText === "null"
  ) {
    return { inStock: false, displayText: "Нет в наличии", qty: null };
  }

  // Случаи "более X" или ">= X" (высший приоритет)
  const moreMatch = stockText.match(/(?:более|больше|>|≥)\s*(\d+)/);
  if (moreMatch) {
    const number = parseInt(moreMatch[1], 10);
    return {
      inStock: true,
      displayText: `В наличии (≥${number} уп.)`,
      qty: null,
    };
  }

  // Просто "в наличии" без числа
  if (stockText.includes("в наличии") && !stockText.match(/\d+/)) {
    return { inStock: true, displayText: "В наличии", qty: null };
  }

  // Числовые значения с суффиксами
  const numberMatch = stockText.match(
    /^(\d+)(?:\s*(?:шт|уп|ед|pcs|упак))?\.?$/
  );
  if (numberMatch) {
    const qty = parseInt(numberMatch[1], 10);
    if (qty > 0) {
      return {
        inStock: true,
        displayText: `В наличии (${qty} уп.)`,
        qty: qty,
      };
    } else {
      return { inStock: false, displayText: "Нет в наличии", qty: 0 };
    }
  }

  // Fallback: если не распознали, но есть число > 0
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

  // По умолчанию - нет в наличии
  return { inStock: false, displayText: "Нет в наличии", qty: null };
};

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Bot, ChevronDown, ChevronUp, Calculator, ListTree, Heart, Info, Percent, Archive, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import OrderForm from "./OrderForm";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { parseStock } from "@/components/sku/SkuUtils";

const DownloadLinkCard = ({ linkData }) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-800 flex-1 pr-4">{linkData.text}</p>
      <a href={linkData.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
        <Button className="bg-[#313131] hover:bg-[#4a4a4a] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all">
          СКАЧАТЬ
        </Button>
      </a>
    </div>
  );
};

const MultiDownloadLinksCard = ({ data }) => {
  return (
    <div className="space-y-3">
      {data.items.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-200/50">
          <p className="text-sm text-slate-800 flex-1 pr-4">{item.text}</p>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <Button className="bg-[#313131] hover:bg-[#4a4a4a] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all">
              СКАЧАТЬ
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
};

// Renamed to avoid conflicts
const InlineProductCalculator = ({ product }) => {
  const [area, setArea] = useState('');
  const [installationType, setInstallationType] = useState('straight');
  const [discount, setDiscount] = useState('');
  const [results, setResults] = useState({
    cleanArea: 0,
    areaWithReserve: 0,
    packagesNeeded: 0,
    baseCost: 0,
    totalCost: 0,
    myEarnings: 0
  });
  const [isOpen, setIsOpen] = useState(false); // State for collapsible

  // Извлекаем данные из товара
  const areaPerPackage = product.params?.['Кол-во м2 в упаковке'] ? parseFloat(String(product.params['Кол-во м2 в упаковке']).replace(',', '.')) : null;
  const pricePerM2 = parseFloat(product.price) || 0; // Теперь цена за м²

  // Коэффициенты запаса
  const reserveCoefficients = {
    straight: 1.05,   // +5%
    diagonal: 1.10,   // +10%
    herringbone: 1.15 // +15%
  };

  useEffect(() => {
    calculateResults();
  }, [area, installationType, discount]);

  const handleNumberInput = (value, setter) => {
    // Разрешаем только цифры, точку и запятую
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setter(sanitized);
  };
  
  const handleDiscountInput = (value) => {
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    // Ограничиваем скидку максимум 10%
    const numValue = parseFloat(sanitized) || 0;
    if (numValue > 10) {
      setDiscount("10");
    } else {
      setDiscount(sanitized);
    }
  };

  const calculateResults = () => {
    if (!areaPerPackage || !pricePerM2) return;

    const cleanArea = parseFloat(area) || 0;
    const userDiscount = Math.min(Math.max(0, parseFloat(discount) || 0), 10);

    if (cleanArea <= 0) {
      setResults({
        cleanArea: 0,
        areaWithReserve: 0,
        packagesNeeded: 0,
        baseCost: 0,
        totalCost: 0,
        myEarnings: 0
      });
      return;
    }

    // Площадь с запасом
    const reserveCoeff = reserveCoefficients[installationType];
    const areaWithReserve = cleanArea * reserveCoeff;

    // Количество упаковок (округляем вверх)
    const packagesNeeded = Math.ceil(areaWithReserve / areaPerPackage);

    // Итоговая стоимость (цена за м²)
    const baseCost = areaWithReserve * pricePerM2;
    const earnings = baseCost * (userDiscount / 100);
    const totalCost = baseCost - earnings;

    setResults({
      cleanArea: Math.round(cleanArea * 100) / 100,
      areaWithReserve: Math.round(areaWithReserve * 100) / 100,
      packagesNeeded,
      baseCost: Math.round(baseCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      myEarnings: Math.round(earnings * 100) / 100
    });
  };

  const clearCalculation = () => {
    setArea("");
    setInstallationType("straight");
    setDiscount("");
    setResults({
      cleanArea: 0,
      areaWithReserve: 0,
      packagesNeeded: 0,
      baseCost: 0,
      totalCost: 0,
      myEarnings: 0
    });
  };

  if (!areaPerPackage || !pricePerM2) {
    return null; // Не показываем калькулятор если нет данных
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-[#007AFF]" />
            <span className="font-medium text-slate-900 text-base">Рассчитать количество</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3">
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50 space-y-3">
           <p className="text-base font-semibold text-slate-800">Введите данные</p>
          {/* Площадь помещения */}
          <div>
            <Label htmlFor="area-chat" className="text-sm font-medium text-slate-700">Площадь помещения, м²</Label>
            <Input
              id="area-chat"
              type="text"
              inputMode="decimal"
              value={area}
              onChange={(e) => handleNumberInput(e.target.value, setArea)}
              placeholder="Например, 40"
              className="focus:border-blue-300 focus:ring-blue-300/20 mt-1 text-sm"
            />
          </div>

          {/* Способ укладки */}
          <div>
             <div className="flex items-center gap-1.5 mb-1">
              <Label className="text-sm font-medium text-slate-700">Способ укладки</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="w-3 h-3 text-slate-400 cursor-pointer" /></TooltipTrigger>
                  <TooltipContent><p>Запас материала зависит от способа укладки.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={installationType} onValueChange={setInstallationType}>
              <SelectTrigger className="focus:border-blue-300 focus:ring-blue-300/20 text-sm">
                <SelectValue placeholder="Выберите способ укладки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight">Прямая укладка (+5%)</SelectItem>
                <SelectItem value="diagonal">Диагональная укладка (+10%)</SelectItem>
                <SelectItem value="herringbone">Укладка "ёлочкой" (+15%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Скидка без таймера */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="discount-chat" className="text-sm font-medium text-slate-700">Ваша скидка, % (макс. 10%)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="w-3 h-3 text-slate-400 cursor-pointer" /></TooltipTrigger>
                    <TooltipContent><p>Скидка применяется к базовой стоимости.</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="relative">
              <Input
                id="discount-chat"
                type="text"
                inputMode="decimal"
                value={discount}
                onChange={(e) => handleDiscountInput(e.target.value)}
                placeholder="от 0 до 10"
                className="focus:border-blue-300 focus:ring-blue-300/20 mt-1 text-sm pr-7"
              />
              <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              onClick={calculateResults} 
              className="flex-1 bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:from-[#0A84FF] hover:to-[#0a6cff] text-white font-medium py-2 px-4 rounded-lg text-sm"
            >
              Рассчитать
            </Button>
            <Button 
              variant="outline"
              onClick={clearCalculation}
              className="px-4 text-sm"
            >
              Очистить
            </Button>
          </div>
        </div>

        {results.cleanArea > 0 && (
          <div className="space-y-3 mt-3">
             <Card className="bg-white/80 border-slate-200">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">
                  Результаты расчета
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2 text-xs">
                <div className="flex justify-between"><span>Площадь с запасом:</span><span className="font-bold">{results.areaWithReserve} м²</span></div>
                <div className="flex justify-between"><span>Нужно упаковок:</span><span className="font-bold text-[#C31E2E]">{results.packagesNeeded} шт.</span></div>
                <Separator />
                <div className="flex justify-between"><span>Базовая стоимость:</span><span className="font-bold">{results.baseCost.toLocaleString('ru-RU')} ₽</span></div>
                {results.myEarnings > 0 && (
                  <div className="flex justify-between text-green-600"><span>Скидка:</span><span className="font-bold">− {results.myEarnings.toLocaleString('ru-RU')} ₽</span></div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-bold">Итого:</span>
                  <span className="font-bold text-lg text-[#C31E2E]">{results.totalCost.toLocaleString('ru-RU')} ₽</span>
                </div>
              </CardContent>
            </Card>

            {/* Карточка экономии */}
            {results.myEarnings > 0 && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-100 via-green-50 to-emerald-50 border-l-4 border-green-500">
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-green-700 fill-current" />
                  </div>
                  <div className="flex-1">
                    <p className="text-green-800 font-semibold text-sm">Я заработаю:</p>
                    <p className="text-green-700 font-bold text-xl">{results.myEarnings.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

// Helper function to decode HTML entities for display
// This function is no longer used in the updated ProductInfoCard for warehouse names
// but keeping it in case it's used elsewhere or needed for future expansions.
const decodeHtmlEntities = (htmlString) => {
  if (typeof window === 'undefined') {
    // For server-side rendering or non-browser environments, return as is
    return htmlString;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return doc.documentElement.textContent;
};

const ProductInfoCard = ({ product }) => {
  const [characteristicsOpen, setCharacteristicsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const params = product.params || {};
  
  // Parse documents directly from params
  const documents = (() => {
    const docFiles = {};
    const docNames = {};
    
    Object.keys(params).forEach(key => {
      const keyLower = key.toLowerCase();
      const fileMatch = keyLower.match(/документы файл (\d+)/);
      const nameMatch = keyLower.match(/документы наименование (\d+)/);
      
      if (fileMatch) {
        const num = fileMatch[1];
        docFiles[num] = params[key];
      } else if (nameMatch) {
        const num = nameMatch[1];
        docNames[num] = params[key];
      }
    });
    
    // Pair documents
    const docs = [];
    Object.keys(docFiles).forEach(num => {
      const url = docFiles[num];
      const name = docNames[num] || `Документ ${num}`;
      if (url && url.trim()) {
        docs.push({ url: url.trim(), name: name.trim() });
      }
    });
    
    return docs;
  })();
  

  
  // Группируем и объединяем некоторые параметры
  const getGroupedParams = () => {
    const grouped = {};
    
    // Объединяем размеры и толщину
    const length = params['Длина'] || params['Длина, мм'];
    const width = params['Ширина'] || params['Ширина, мм'];  
    const thickness = params['Толщина'] || params['Толщина, мм'];
    
    if (length && width) {
      let sizeText = `${length}×${width} мм`;
      if (thickness) {
        sizeText += `, толщина ${thickness}`;
      }
      grouped['Размеры'] = sizeText;
    } else if (thickness) {
      grouped['Толщина'] = thickness;
    }
    
    // Объединяем цвет и породу дерева
    const color = params['Цвет'];
    const wood = params['Порода дерева'];
    if (color && wood) {
      grouped['Цвет и порода'] = `${color}, ${wood}`;
    } else if (color) {
      grouped['Цвет'] = color;
    } else if (wood) {
      grouped['Порода дерева'] = wood;
    }
    
    // Исключаем нежелательные параметры и объекты
    const excludedKeys = [
      'Длина', 'Длина, мм', 'Ширина', 'Ширина, мм', 'Толщина', 'Толщина, мм',
      'Цвет', 'Порода дерева', 'Кол-во м2 в упаковке', 'Остаток', 'Склады', 'Остаток_число',
      'Фото1', 'Фото2', 'Фото3', 'Фото4', 'URL', 'Ссылка на QR'
    ];
    
    Object.keys(params).forEach(key => {
      // Skip document-related params and excluded keys as documents are now a separate array
      const keyLower = key.toLowerCase();
      // Original line: if (keyLower.startsWith('документы файл') || keyLower.startsWith('документы наименование')) { return; }
      // This is now handled by the specific document parsing logic, but we still want to exclude the raw params from the characteristics list.
      if (keyLower.includes('документы файл') || keyLower.includes('документы наименование')) {
        return;
      }
      
      if (!excludedKeys.includes(key)) {
        const value = params[key];
        // Проверяем, что значение не является объектом
        if (typeof value !== 'object' || value === null) {
          grouped[key] = value;
        }
      }
    });
    
    return grouped;
  };

  const groupedParams = getGroupedParams();
  const paramKeys = Object.keys(groupedParams);

  // Подстраховка для разных названий параметров остатков
  const stockText = 
    product.params?.['Остаток'] ??
    product.params?.['остаток'] ??
    product.params?.['наличие'] ??
    product.params?.['quantity'] ??
    product.params?.['Количество на складе'] ??
    product.params?.['склад'] ??
    '';
  
  const stockInfo = parseStock(stockText);
  
  // Извлекаем информацию о складах, если есть
  const warehouseStock = params['Склады'];
  const hasWarehouseInfo = warehouseStock && typeof warehouseStock === 'object';
  
  // Check if we have documents
  const hasDocuments = documents.length > 0;



  return (
    <div className="bg-white min-h-full">
      {/* Изображение без отступов */}
      {product.picture && (
        <div className="w-full">
          <img 
            src={product.picture} 
            alt={product.name} 
            className="w-full h-48 md:h-64 object-cover block" 
          />
        </div>
      )}

      {/* Контент с отступами */}
      <div className="p-4 space-y-4">
        {/* Заголовок и описание */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900 leading-tight mb-2">
            {product.name}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-3">
            <span>Артикул: {product.vendorCode}</span>
            
            <span className="text-slate-300">•</span>
            {stockInfo.inStock ? (
                <span className="text-green-600 font-medium">{stockInfo.displayText}</span>
            ) : (
                <span className="text-red-600 font-medium">{stockInfo.displayText}</span>
            )}

            {product.price && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">{product.price} ₽/м²</span>
              </>
            )}
          </div>

          {product.description && (
            <p className="text-slate-600 text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Информация о складах (если есть) */}
        {hasWarehouseInfo && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-900 text-base">Остатки по складам</span>
                </div>
                <ChevronDown className="w-5 h-5 text-slate-500 transition-transform" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="bg-slate-50/50 rounded-xl divide-y divide-slate-200/50 border border-slate-200/50">
                {Object.entries(warehouseStock).map(([whName, whStock]) => {
                  const whStockInfo = parseStock(whStock);
                  return (
                    <div key={whName} className="px-4 py-2 flex justify-between items-center text-sm">
                      <span className="text-slate-600">{whName}</span>
                      <span className={`font-medium text-right ${whStockInfo.inStock ? 'text-green-600' : 'text-slate-500'}`}>
                        {whStock}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Аккордеон Характеристики */}
        {paramKeys.length > 0 && (
          <Collapsible open={characteristicsOpen} onOpenChange={setCharacteristicsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <ListTree className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-900 text-base">Характеристики</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${characteristicsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="bg-slate-50/50 rounded-xl divide-y divide-slate-200/50 border border-slate-200/50">
                {paramKeys.map((key) => (
                  <div key={key} className="px-4 py-2 flex justify-between items-center text-sm">
                    <span className="text-slate-600">{key}</span>
                    <span className="font-medium text-slate-900 text-right">{groupedParams[key]}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Секция Документы */}
        {hasDocuments && (
          <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-900 text-base">Документы ({documents.length})</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${documentsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50 space-y-2">
                {documents.map((doc, index) => (
                  <a 
                    key={index}
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      {doc.name}
                    </Button>
                  </a>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Аккордеон Калькулятор */}
        <InlineProductCalculator product={product} />
        
        {/* Кнопки Заказать и Ремонт */}
        <div className="pt-2 space-y-2">
          <OrderForm product={product} />
          <a 
            href="https://tvo.floor-svs.ru/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <Button 
              variant="outline" 
              className="w-full border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF] hover:text-white"
            >
              Ремонт
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};


export default function ChatMessage({ message, tier = null, bonusEnabled = true }) {
  let contentData;
  let isProductInfo = false;
  let isDownloadLink = false;
  let isMultiDownloadLinks = false;
  const isUser = message.role === "user";

  try {
    contentData = JSON.parse(message.content);
    if (contentData && contentData.type === 'product_info') {
      isProductInfo = true;
    }
    if (contentData && contentData.type === 'download_link') {
      isDownloadLink = true;
    }
    if (contentData && contentData.type === 'multi_download_links') {
      isMultiDownloadLinks = true;
    }
  } catch (e) {
    // Not a JSON object, treat as plain text
  }

  // Tier-based glow for user avatar (only glow, icon stays same)
  const userAvatarGlow = (() => {
    if (!bonusEnabled || !tier) {
      return "bg-gradient-to-br from-[#0A84FF] to-[#007AFF] ring-2 ring-blue-300/40 shadow-[0_0_18px_rgba(59,130,246,0.25)]";
    }
    switch (tier) {
      case "tier4":
        return "bg-gradient-to-br from-indigo-500 to-blue-500 ring-2 ring-indigo-300/60 shadow-[0_0_22px_rgba(99,102,241,0.35)]";
      case "tier3":
        return "bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-300 ring-2 ring-amber-300/60 shadow-[0_0_22px_rgba(245,158,11,0.35)]";
      case "tier2":
        return "bg-gradient-to-br from-zinc-200 via-slate-100 to-white ring-2 ring-zinc-300/60 shadow-[0_0_18px_rgba(148,163,184,0.25)]";
      case "tier1":
      default:
        return "bg-gradient-to-br from-slate-200 to-slate-300 ring-2 ring-slate-300/60 shadow-[0_0_16px_rgba(100,116,139,0.25)]";
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-2 ${
        isUser 
          ? userAvatarGlow
          : "bg-white/80 border border-white/50"
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-slate-600" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-2xl shadow-sm ${
          isUser 
            ? "bg-[#0A84FF] text-white ml-auto px-5 py-3"              /* iMessage blue */
            : isProductInfo 
              ? "bg-white border border-white/60 mr-auto w-full overflow-hidden p-0 rounded-2xl shadow" 
              : (isDownloadLink || isMultiDownloadLinks)
                ? "bg-white mr-auto w-full p-3 rounded-2xl border border-white/60 shadow"
                : "bg-white mr-auto px-5 py-3 rounded-2xl border border-white/60 shadow"
        }`}>
          {isProductInfo ? (
            <ProductInfoCard product={contentData.data} />
          ) : isDownloadLink ? (
            <DownloadLinkCard linkData={contentData.data} />
          ) : isMultiDownloadLinks ? (
            <MultiDownloadLinksCard data={contentData.data} />
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-white">{message.content}</p>
          ) : (
            <div className={`prose prose-sm max-w-none prose-slate`}>
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#007AFF] hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-slate-500 mt-2 px-2 ${
          isUser ? "text-right" : "text-left"
        }`}>
          {format(new Date(message.timestamp), "HH:mm", { locale: ru })}
        </div>
      </div>
    </motion.div>
  );
}
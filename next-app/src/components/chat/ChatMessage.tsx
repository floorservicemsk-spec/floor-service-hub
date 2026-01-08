"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  User,
  Bot,
  ChevronDown,
  Calculator,
  ListTree,
  Heart,
  Info,
  Percent,
  Archive,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { parseStock } from "@/lib/sku-utils";
import OrderForm from "./OrderForm";
import type { ChatMessage as ChatMessageType } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface ProductParams {
  [key: string]: unknown;
  "Кол-во м2 в упаковке"?: string | number;
  Остаток?: string;
  остаток?: string;
  наличие?: string;
  quantity?: string;
  "Количество на складе"?: string;
  склад?: string;
  Склады?: Record<string, string>;
}

interface ProductInfoData {
  name: string;
  vendorCode: string;
  description: string;
  picture: string;
  price: string | number | null;
  params: ProductParams;
}

interface DownloadLinkData {
  text: string;
  url: string;
}

interface MultiDownloadLinksData {
  items: Array<{ text: string; url: string; title: string }>;
}

interface DocumentItem {
  url: string;
  name: string;
}

// ============================================================================
// DOWNLOAD LINK CARDS
// ============================================================================

const DownloadLinkCard = ({ linkData }: { linkData: DownloadLinkData }) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-800 flex-1 pr-4">{linkData.text}</p>
      <a
        href={linkData.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0"
      >
        <Button className="bg-[#313131] hover:bg-[#4a4a4a] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all">
          СКАЧАТЬ
        </Button>
      </a>
    </div>
  );
};

const MultiDownloadLinksCard = ({
  data,
}: {
  data: MultiDownloadLinksData;
}) => {
  return (
    <div className="space-y-3">
      {data.items.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-200/50"
        >
          <p className="text-sm text-slate-800 flex-1 pr-4">{item.text}</p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <Button className="bg-[#313131] hover:bg-[#4a4a4a] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all">
              СКАЧАТЬ
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// INLINE PRODUCT CALCULATOR
// ============================================================================

interface CalculatorResults {
  cleanArea: number;
  areaWithReserve: number;
  packagesNeeded: number;
  baseCost: number;
  totalCost: number;
  myEarnings: number;
}

const InlineProductCalculator = ({ product }: { product: ProductInfoData }) => {
  const [area, setArea] = useState("");
  const [installationType, setInstallationType] = useState("straight");
  const [discount, setDiscount] = useState("");
  const [results, setResults] = useState<CalculatorResults>({
    cleanArea: 0,
    areaWithReserve: 0,
    packagesNeeded: 0,
    baseCost: 0,
    totalCost: 0,
    myEarnings: 0,
  });
  const [isOpen, setIsOpen] = useState(false);

  // Extract data from product
  const areaPerPackageRaw = product.params?.["Кол-во м2 в упаковке"];
  const areaPerPackage = areaPerPackageRaw
    ? parseFloat(String(areaPerPackageRaw).replace(",", "."))
    : null;
  const pricePerM2 = parseFloat(String(product.price)) || 0;

  const calculateResults = useCallback(() => {
    // Reserve coefficients
    const reserveCoefficients: Record<string, number> = {
      straight: 1.05, // +5%
      diagonal: 1.1, // +10%
      herringbone: 1.15, // +15%
    };

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
        myEarnings: 0,
      });
      return;
    }

    const reserveCoeff = reserveCoefficients[installationType];
    const areaWithReserve = cleanArea * reserveCoeff;
    const packagesNeeded = Math.ceil(areaWithReserve / areaPerPackage);
    const baseCost = areaWithReserve * pricePerM2;
    const earnings = baseCost * (userDiscount / 100);
    const totalCost = baseCost - earnings;

    setResults({
      cleanArea: Math.round(cleanArea * 100) / 100,
      areaWithReserve: Math.round(areaWithReserve * 100) / 100,
      packagesNeeded,
      baseCost: Math.round(baseCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      myEarnings: Math.round(earnings * 100) / 100,
    });
  }, [area, discount, installationType, areaPerPackage, pricePerM2]);

  useEffect(() => {
    calculateResults();
  }, [calculateResults]);

  const handleNumberInput = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setter(sanitized);
  };

  const handleDiscountInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    const numValue = parseFloat(sanitized) || 0;
    if (numValue > 10) {
      setDiscount("10");
    } else {
      setDiscount(sanitized);
    }
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
      myEarnings: 0,
    });
  };

  if (!areaPerPackage || !pricePerM2) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-[#007AFF]" />
            <span className="font-medium text-slate-900 text-base">
              Рассчитать количество
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3">
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50 space-y-3">
          <p className="text-base font-semibold text-slate-800">
            Введите данные
          </p>

          {/* Area input */}
          <div>
            <Label htmlFor="area-chat" className="text-sm font-medium text-slate-700">
              Площадь помещения, м²
            </Label>
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

          {/* Installation type */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Label className="text-sm font-medium text-slate-700">
                Способ укладки
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Запас материала зависит от способа укладки.</p>
                  </TooltipContent>
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
                <SelectItem value="herringbone">Укладка &quot;ёлочкой&quot; (+15%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Discount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="discount-chat" className="text-sm font-medium text-slate-700">
                  Ваша скидка, % (макс. 10%)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-slate-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Скидка применяется к базовой стоимости.</p>
                    </TooltipContent>
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
            <Button variant="outline" onClick={clearCalculation} className="px-4 text-sm">
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
                <div className="flex justify-between">
                  <span>Площадь с запасом:</span>
                  <span className="font-bold">{results.areaWithReserve} м²</span>
                </div>
                <div className="flex justify-between">
                  <span>Нужно упаковок:</span>
                  <span className="font-bold text-[#C31E2E]">
                    {results.packagesNeeded} шт.
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Базовая стоимость:</span>
                  <span className="font-bold">
                    {results.baseCost.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
                {results.myEarnings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Скидка:</span>
                    <span className="font-bold">
                      − {results.myEarnings.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-bold">Итого:</span>
                  <span className="font-bold text-lg text-[#C31E2E]">
                    {results.totalCost.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Earnings card */}
            {results.myEarnings > 0 && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-100 via-green-50 to-emerald-50 border-l-4 border-green-500">
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-green-700 fill-current" />
                  </div>
                  <div className="flex-1">
                    <p className="text-green-800 font-semibold text-sm">
                      Я заработаю:
                    </p>
                    <p className="text-green-700 font-bold text-xl">
                      {results.myEarnings.toLocaleString("ru-RU")} ₽
                    </p>
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

// ============================================================================
// PRODUCT INFO CARD
// ============================================================================

const ProductInfoCard = ({ product }: { product: ProductInfoData }) => {
  const [characteristicsOpen, setCharacteristicsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const params = product.params || {};

  // Parse documents from params
  const documents: DocumentItem[] = (() => {
    const docFiles: Record<string, string> = {};
    const docNames: Record<string, string> = {};

    Object.keys(params).forEach((key) => {
      const keyLower = key.toLowerCase();
      const fileMatch = keyLower.match(/документы файл (\d+)/);
      const nameMatch = keyLower.match(/документы наименование (\d+)/);

      if (fileMatch) {
        const num = fileMatch[1];
        docFiles[num] = String(params[key]);
      } else if (nameMatch) {
        const num = nameMatch[1];
        docNames[num] = String(params[key]);
      }
    });

    const docs: DocumentItem[] = [];
    Object.keys(docFiles).forEach((num) => {
      const url = docFiles[num];
      const name = docNames[num] || `Документ ${num}`;
      if (url && url.trim()) {
        docs.push({ url: url.trim(), name: name.trim() });
      }
    });

    return docs;
  })();

  // Group and combine some parameters
  const getGroupedParams = () => {
    const grouped: Record<string, unknown> = {};

    // Combine dimensions
    const length = params["Длина"] || params["Длина, мм"];
    const width = params["Ширина"] || params["Ширина, мм"];
    const thickness = params["Толщина"] || params["Толщина, мм"];

    if (length && width) {
      let sizeText = `${length}×${width} мм`;
      if (thickness) {
        sizeText += `, толщина ${thickness}`;
      }
      grouped["Размеры"] = sizeText;
    } else if (thickness) {
      grouped["Толщина"] = thickness;
    }

    // Combine color and wood type
    const color = params["Цвет"];
    const wood = params["Порода дерева"];
    if (color && wood) {
      grouped["Цвет и порода"] = `${color}, ${wood}`;
    } else if (color) {
      grouped["Цвет"] = color;
    } else if (wood) {
      grouped["Порода дерева"] = wood;
    }

    // Exclude unwanted params
    const excludedKeys = [
      "Длина",
      "Длина, мм",
      "Ширина",
      "Ширина, мм",
      "Толщина",
      "Толщина, мм",
      "Цвет",
      "Порода дерева",
      "Кол-во м2 в упаковке",
      "Остаток",
      "Склады",
      "Остаток_число",
      "Фото1",
      "Фото2",
      "Фото3",
      "Фото4",
      "URL",
      "Ссылка на QR",
    ];

    Object.keys(params).forEach((key) => {
      const keyLower = key.toLowerCase();
      if (
        keyLower.includes("документы файл") ||
        keyLower.includes("документы наименование")
      ) {
        return;
      }

      if (!excludedKeys.includes(key)) {
        const value = params[key];
        if (typeof value !== "object" || value === null) {
          grouped[key] = value;
        }
      }
    });

    return grouped;
  };

  const groupedParams = getGroupedParams();
  const paramKeys = Object.keys(groupedParams);

  // Get stock info
  const stockText =
    params["Остаток"] ??
    params["остаток"] ??
    params["наличие"] ??
    params["quantity"] ??
    params["Количество на складе"] ??
    params["склад"] ??
    "";

  const stockInfo = parseStock(stockText);

  // Warehouse stock info
  const warehouseStock = params["Склады"] as Record<string, string> | undefined;
  const hasWarehouseInfo = warehouseStock && typeof warehouseStock === "object";

  // Documents
  const hasDocuments = documents.length > 0;

  return (
    <div className="bg-white min-h-full">
      {/* Image */}
      {product.picture && (
        <div className="w-full relative h-48 md:h-64">
          <Image
            src={product.picture}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={false}
            unoptimized={product.picture.includes('http')}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Title and description */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900 leading-tight mb-2">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-3">
            <span>Артикул: {product.vendorCode}</span>

            <span className="text-slate-300">•</span>
            {stockInfo.inStock ? (
              <span className="text-green-600 font-medium">
                {stockInfo.displayText}
              </span>
            ) : (
              <span className="text-red-600 font-medium">
                {stockInfo.displayText}
              </span>
            )}

            {product.price && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">
                  {product.price} ₽/м²
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="text-slate-600 text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Warehouse info */}
        {hasWarehouseInfo && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-900 text-base">
                    Остатки по складам
                  </span>
                </div>
                <ChevronDown className="w-5 h-5 text-slate-500 transition-transform" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="bg-slate-50/50 rounded-xl divide-y divide-slate-200/50 border border-slate-200/50">
                {Object.entries(warehouseStock).map(([whName, whStock]) => {
                  const whStockInfo = parseStock(whStock);
                  return (
                    <div
                      key={whName}
                      className="px-4 py-2 flex justify-between items-center text-sm"
                    >
                      <span className="text-slate-600">{whName}</span>
                      <span
                        className={`font-medium text-right ${
                          whStockInfo.inStock ? "text-green-600" : "text-slate-500"
                        }`}
                      >
                        {whStock}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Characteristics */}
        {paramKeys.length > 0 && (
          <Collapsible
            open={characteristicsOpen}
            onOpenChange={setCharacteristicsOpen}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <ListTree className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-900 text-base">
                    Характеристики
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 transition-transform ${
                    characteristicsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="bg-slate-50/50 rounded-xl divide-y divide-slate-200/50 border border-slate-200/50">
                {paramKeys.map((key) => (
                  <div
                    key={key}
                    className="px-4 py-2 flex justify-between items-center text-sm"
                  >
                    <span className="text-slate-600">{key}</span>
                    <span className="font-medium text-slate-900 text-right">
                      {String(groupedParams[key])}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Documents */}
        {hasDocuments && (
          <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-900 text-base">
                    Документы ({documents.length})
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 transition-transform ${
                    documentsOpen ? "rotate-180" : ""
                  }`}
                />
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

        {/* Calculator */}
        <InlineProductCalculator product={product} />

        {/* Order buttons */}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ChatMessageProps {
  message: ChatMessageType;
  tier?: string | null;
  bonusEnabled?: boolean;
}

export default function ChatMessage({
  message,
  tier = null,
  bonusEnabled = true,
}: ChatMessageProps) {
  let contentData: {
    type?: string;
    data?: ProductInfoData | DownloadLinkData | MultiDownloadLinksData;
  } | null = null;
  let isProductInfo = false;
  let isDownloadLink = false;
  let isMultiDownloadLinks = false;
  const isUser = message.role === "user";

  try {
    contentData = JSON.parse(message.content);
    if (contentData && contentData.type === "product_info") {
      isProductInfo = true;
    }
    if (contentData && contentData.type === "download_link") {
      isDownloadLink = true;
    }
    if (contentData && contentData.type === "multi_download_links") {
      isMultiDownloadLinks = true;
    }
  } catch {
    // Not JSON, treat as plain text
  }

  // Tier-based glow for user avatar
  const userAvatarGlow = (() => {
    if (!bonusEnabled || !tier) {
      return "bg-gradient-to-br from-[#0A84FF] to-[#007AFF] ring-2 ring-blue-300/40 shadow-[0_0_18px_rgba(59,130,246,0.25)]";
    }
    switch (tier) {
      case "TIER4":
        return "bg-gradient-to-br from-indigo-500 to-blue-500 ring-2 ring-indigo-300/60 shadow-[0_0_22px_rgba(99,102,241,0.35)]";
      case "TIER3":
        return "bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-300 ring-2 ring-amber-300/60 shadow-[0_0_22px_rgba(245,158,11,0.35)]";
      case "TIER2":
        return "bg-gradient-to-br from-zinc-200 via-slate-100 to-white ring-2 ring-zinc-300/60 shadow-[0_0_18px_rgba(148,163,184,0.25)]";
      case "TIER1":
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
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-2 ${
          isUser ? userAvatarGlow : "bg-white/80 border border-white/50"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-slate-600" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-3xl ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        <div
          className={`rounded-2xl shadow-sm ${
            isUser
              ? "bg-[#0A84FF] text-white ml-auto px-5 py-3"
              : isProductInfo
                ? "bg-white border border-white/60 mr-auto w-full overflow-hidden p-0 rounded-2xl shadow"
                : isDownloadLink || isMultiDownloadLinks
                  ? "bg-white mr-auto w-full p-3 rounded-2xl border border-white/60 shadow"
                  : "bg-white mr-auto px-5 py-3 rounded-2xl border border-white/60 shadow"
          }`}
        >
          {isProductInfo && contentData?.data ? (
            <ProductInfoCard product={contentData.data as ProductInfoData} />
          ) : isDownloadLink && contentData?.data ? (
            <DownloadLinkCard linkData={contentData.data as DownloadLinkData} />
          ) : isMultiDownloadLinks && contentData?.data ? (
            <MultiDownloadLinksCard
              data={contentData.data as MultiDownloadLinksData}
            />
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-white">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-slate">
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
        <div
          className={`text-xs text-slate-500 mt-2 px-2 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {format(new Date(message.timestamp), "HH:mm", { locale: ru })}
        </div>
      </div>
    </motion.div>
  );
}

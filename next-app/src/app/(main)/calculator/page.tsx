"use client";

import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Calculator as CalculatorIcon,
  Search,
  Package,
  Ruler,
  Archive,
  ChevronDown,
  Info,
  Percent,
  Heart,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProductData } from "@/components/context/ProductDataContext";
import { parseStock } from "@/components/sku/SkuUtils";
import type { Product } from "@/lib/api";

interface CalculatorState {
  area: string;
  installationType: string;
  discount: string;
}

interface CalculatorResults {
  cleanArea: number;
  areaWithReserve: number;
  packagesNeeded: number;
  baseCost: number;
  totalCost: number;
  myEarnings: number;
}

function ProductCalculator({ product }: { product: Product }) {
  const [state, setState] = useState<CalculatorState>({
    area: "",
    installationType: "straight",
    discount: "",
  });
  const [results, setResults] = useState<CalculatorResults>({
    cleanArea: 0,
    areaWithReserve: 0,
    packagesNeeded: 0,
    baseCost: 0,
    totalCost: 0,
    myEarnings: 0,
  });
  const [isOpen, setIsOpen] = useState(false);

  const areaPerPackage = product.params?.["Кол-во м2 в упаковке"]
    ? parseFloat(
        String(product.params["Кол-во м2 в упаковке"]).replace(",", ".")
      )
    : null;
  const pricePerM2 = product.price || 0;

  const calculateResults = useCallback(() => {
    const reserveCoefficients: Record<string, number> = {
      straight: 1.05,
      diagonal: 1.1,
      herringbone: 1.15,
    };

    if (!areaPerPackage || !pricePerM2) return;

    const cleanArea = parseFloat(state.area) || 0;
    const userDiscount = Math.min(
      Math.max(0, parseFloat(state.discount) || 0),
      10
    );

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

    const reserveCoeff = reserveCoefficients[state.installationType];
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
  }, [state, areaPerPackage, pricePerM2]);

  useEffect(() => {
    calculateResults();
  }, [calculateResults]);

  const handleNumberInput = (value: string, field: keyof CalculatorState) => {
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setState((prev) => ({ ...prev, [field]: sanitized }));
  };

  const handleDiscountInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    const numValue = parseFloat(sanitized) || 0;
    setState((prev) => ({
      ...prev,
      discount: numValue > 10 ? "10" : sanitized,
    }));
  };

  const clearCalculation = () => {
    setState({ area: "", installationType: "straight", discount: "" });
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
            <CalculatorIcon className="w-5 h-5 text-[#007AFF]" />
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
          <p className="text-base font-semibold text-slate-800">Введите данные</p>

          <div>
            <Label htmlFor="area" className="text-sm font-medium text-slate-700">
              Площадь помещения, м²
            </Label>
            <Input
              id="area"
              type="text"
              inputMode="decimal"
              value={state.area}
              onChange={(e) => handleNumberInput(e.target.value, "area")}
              placeholder="Например, 40"
              className="mt-1 text-sm"
            />
          </div>

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
            <Select
              value={state.installationType}
              onValueChange={(value) =>
                setState((prev) => ({ ...prev, installationType: value }))
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Выберите способ укладки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight">Прямая укладка (+5%)</SelectItem>
                <SelectItem value="diagonal">Диагональная укладка (+10%)</SelectItem>
                <SelectItem value="herringbone">Укладка &quot;ёлочкой&quot; (+15%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="discount" className="text-sm font-medium text-slate-700">
                  Ваша скидка, % (макс. 10%)
                </Label>
              </div>
            </div>
            <div className="relative">
              <Input
                id="discount"
                type="text"
                inputMode="decimal"
                value={state.discount}
                onChange={(e) => handleDiscountInput(e.target.value)}
                placeholder="от 0 до 10"
                className="mt-1 text-sm pr-7"
              />
              <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={calculateResults}
              className="flex-1 bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-sm"
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
                  <span className="font-bold text-[#007AFF]">
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
                  <span className="font-bold text-lg text-[#007AFF]">
                    {results.totalCost.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              </CardContent>
            </Card>

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
}

export default function CalculatorPage() {
  const { calculatorProducts, loading } = useProductData();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filteredProducts = useMemo(() => {
    if (!deferredQuery.trim()) return calculatorProducts;

    const query = deferredQuery.toLowerCase();
    return calculatorProducts.filter(
      (product) =>
        product.name?.toLowerCase().includes(query) ||
        product.vendorCode?.toLowerCase().includes(query) ||
        product.vendor?.toLowerCase().includes(query)
    );
  }, [calculatorProducts, deferredQuery]);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery]);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedProducts = filteredProducts.slice(start, end);

  const canPrev = page > 1;
  const canNext = end < filteredProducts.length;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => p + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-4 md:p-8 mb-6 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <CalculatorIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent mb-4">
              Калькулятор напольных покрытий
            </h1>
            <p className="text-slate-600 text-base md:text-lg">
              Рассчитайте необходимое количество материала и итоговую стоимость
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Поиск по названию, артикулу, производителю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 md:py-4 text-base md:text-lg bg-white/80 border-slate-200 focus:border-blue-300 focus:ring-blue-300/20 rounded-xl"
            />
          </div>

          <div className="mt-4 md:mt-6 text-center">
            <Badge variant="outline" className="bg-white/50 border-slate-200">
              Найдено товаров с возможностью расчета: {filteredProducts.length}
            </Badge>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
              {pagedProducts.map((product, index) => {
                const stockText =
                  (product.params?.["Остаток"] as string) ??
                  (product.params?.["остаток"] as string) ??
                  "";
                const stockInfo = parseStock(stockText);

                return (
                  <Card
                    key={`${product.id}-${index}`}
                    className="bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg w-full"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold text-slate-900 mb-2 break-words">
                            {product.name}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-800 border-yellow-200"
                            >
                              Артикул: {product.vendorCode}
                            </Badge>
                            {product.vendor && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-800 border-blue-200"
                              >
                                {product.vendor}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {product.picture && (
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              src={product.picture}
                              alt={product.name}
                              fill
                              className="object-cover rounded-lg"
                              sizes="64px"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mt-3">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        <span>
                          {String(product.params?.["Кол-во м2 в упаковке"] || "")} м²/уп.
                        </span>
                      </div>
                        <div className="flex items-center gap-1">
                          <Ruler className="w-4 h-4" />
                          <span className="font-semibold text-[#007AFF]">
                            {product.price} ₽/м²
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Archive
                            className={`w-4 h-4 ${stockInfo.inStock ? "text-green-600" : "text-red-600"}`}
                          />
                          <span
                            className={
                              stockInfo.inStock
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {stockInfo.displayText}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="w-full">
                      <ProductCalculator product={product} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {/* Pagination */}
            {filteredProducts.length > pageSize && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <Button variant="outline" onClick={goPrev} disabled={!canPrev}>
                  Назад
                </Button>
                <span className="text-sm text-slate-600">Страница {page}</span>
                <Button variant="outline" onClick={goNext} disabled={!canNext}>
                  Вперёд
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="bg-white/60 backdrop-blur-sm border-white/20 text-center p-8 md:p-12">
            <CardContent>
              <CalculatorIcon className="w-12 h-12 md:w-16 md:h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Товары не найдены
              </h3>
              <p className="text-slate-600">
                {searchQuery
                  ? `По запросу "${searchQuery}" не найдено товаров с данными для расчета.`
                  : "Товары с возможностью расчета отсутствуют в базе данных."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

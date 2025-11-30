
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import OrderForm from "./OrderForm";

export default function ProductCalculator({ product }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [area, setArea] = useState("");
  const [installationType, setInstallationType] = useState("straight");
  const [results, setResults] = useState({
    cleanArea: 0,
    areaWithReserve: 0,
    packagesNeeded: 0,
    totalMaterial: 0,
    totalCost: 0
  });

  // Извлекаем данные из товара
  const areaPerPackage = parseFloat(product.params['Кол-во м2 в упаковке']?.replace(',', '.')) || 0;
  const pricePerM2 = parseFloat(product.price) || 0;

  // Коэффициенты запаса
  const reserveCoefficients = {
    straight: 1.05,   // +5%
    diagonal: 1.10,   // +10%
    herringbone: 1.15 // +15%
  };

  // This useEffect ensures the calculator updates results
  // whenever relevant input values or expansion state changes.
  // It is not a timer, but a dependency-driven update mechanism.
  useEffect(() => {
    if (isExpanded) {
      calculateResults();
    }
  }, [length, width, area, installationType, isExpanded]);

  const handleNumberInput = (value, setter) => {
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setter(sanitized);
  };

  const calculateResults = () => {
    if (!areaPerPackage || !pricePerM2) return;

    let cleanArea = 0;

    if (length && width) {
      cleanArea = parseFloat(length) * parseFloat(width);
      setArea("");
    } else if (area) {
      cleanArea = parseFloat(area);
      setLength("");
      setWidth("");
    }

    if (cleanArea <= 0) {
      setResults({
        cleanArea: 0,
        areaWithReserve: 0,
        packagesNeeded: 0,
        totalMaterial: 0,
        totalCost: 0
      });
      return;
    }

    const reserveCoeff = reserveCoefficients[installationType];
    const areaWithReserve = cleanArea * reserveCoeff;
    const packagesNeeded = Math.ceil(areaWithReserve / areaPerPackage);
    const totalMaterial = packagesNeeded * areaPerPackage;
    const totalCost = totalMaterial * pricePerM2;

    setResults({
      cleanArea: Math.round(cleanArea * 100) / 100,
      areaWithReserve: Math.round(areaWithReserve * 1000) / 1000,
      packagesNeeded,
      totalMaterial: Math.round(totalMaterial * 1000) / 1000,
      totalCost: Math.round(totalCost * 100) / 100
    });
  };

  // Проверяем, есть ли необходимые данные для калькулятора
  if (!areaPerPackage || !pricePerM2) {
    return null; // Не показываем калькулятор если нет данных
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <Button
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#C31E2E]" />
          <span>Калькулятор расчета</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {isExpanded && (
        <div className="space-y-4 bg-slate-50/50 rounded-lg p-4">
          {/* Ввод размеров */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`calc-length-${product.vendorCode}`} className="text-sm">Длина, м</Label>
              <Input
                id={`calc-length-${product.vendorCode}`}
                type="text"
                value={length}
                onChange={(e) => handleNumberInput(e.target.value, setLength)}
                placeholder="0.00"
                className="mt-1 focus:border-red-300 focus:ring-red-300/20"
                size="sm"
              />
            </div>
            <div>
              <Label htmlFor={`calc-width-${product.vendorCode}`} className="text-sm">Ширина, м</Label>
              <Input
                id={`calc-width-${product.vendorCode}`}
                type="text"
                value={width}
                onChange={(e) => handleNumberInput(e.target.value, setWidth)}
                placeholder="0.00"
                className="mt-1 focus:border-red-300 focus:ring-red-300/20"
                size="sm"
              />
            </div>
          </div>

          <div className="text-center text-slate-500 text-xs">или</div>

          <div>
            <Label htmlFor={`calc-area-${product.vendorCode}`} className="text-sm">Площадь, м²</Label>
            <Input
              id={`calc-area-${product.vendorCode}`}
              type="text"
              value={area}
              onChange={(e) => handleNumberInput(e.target.value, setArea)}
              placeholder="0.00"
              className="mt-1 focus:border-red-300 focus:ring-red-300/20"
              size="sm"
            />
          </div>

          {/* Способ укладки */}
          <div>
            <Label className="text-sm font-medium">Способ укладки</Label>
            <RadioGroup
              value={installationType}
              onValueChange={setInstallationType}
              className="mt-2 space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="straight" id={`calc-straight-${product.vendorCode}`} />
                <Label htmlFor={`calc-straight-${product.vendorCode}`} className="text-sm">Прямая (+5%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="diagonal" id={`calc-diagonal-${product.vendorCode}`} />
                <Label htmlFor={`calc-diagonal-${product.vendorCode}`} className="text-sm">Диагональная (+10%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="herringbone" id={`calc-herringbone-${product.vendorCode}`} />
                <Label htmlFor={`calc-herringbone-${product.vendorCode}`} className="text-sm">Ёлочкой (+15%)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Результаты */}
          {results.cleanArea > 0 && (
            <div className="bg-white rounded-lg p-3 border border-green-200 mt-4">
              <h4 className="text-sm font-semibold text-green-800 mb-3">Результат расчета</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Чистая площадь:</span>
                  <span className="font-semibold">{results.cleanArea} м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">С учётом запаса:</span>
                  <span className="font-semibold">{results.areaWithReserve} м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Упаковок:</span>
                  <span className="font-semibold text-[#C31E2E]">{results.packagesNeeded} шт.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Материала:</span>
                  <span className="font-semibold">{results.totalMaterial} м²</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Стоимость:</span>
                  <span className="text-lg font-bold text-[#C31E2E]">{results.totalCost.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

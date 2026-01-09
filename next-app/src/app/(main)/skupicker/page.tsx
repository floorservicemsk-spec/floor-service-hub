"use client";

import React, { useState, useCallback, useRef } from "react";
import NextImage from "next/image";
import { parseColorText, colorDistance, parseStock } from "@/components/sku/SkuUtils";
import { useProductData } from "@/components/context/ProductDataContext";
import { Palette, Upload, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface DominantColor extends RGB {
  hex: string;
}

interface StockInfo {
  inStock: boolean;
  displayText: string;
}

interface ProductResult {
  id: string;
  name: string;
  url?: string;
  image?: string;
  colorText: string;
  colorRgb: RGB | null;
  distance: number;
  stockInfo: StockInfo;
  price?: number | null;
  vendor?: string;
}

// Helper function to get dominant color using k-means clustering
const getDominantColor = (imageUrl: string): Promise<DominantColor> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const pixels: RGB[] = [];

        // Extract pixels (skip transparent and sample for performance)
        for (let i = 0; i < data.length; i += 4 * 10) {
          if (data[i + 3] >= 16) {
            pixels.push({
              r: data[i],
              g: data[i + 1],
              b: data[i + 2],
            });
          }
        }

        if (pixels.length === 0) {
          reject(new Error("Изображение слишком прозрачное"));
          return;
        }

        // Simple k-means clustering (k=5)
        const clusters = kMeansClustering(pixels, 5, 10);
        const dominantCluster = clusters.reduce((prev, current) =>
          prev.pixels.length > current.pixels.length ? prev : current
        );

        const dominantColorRgb = dominantCluster.center;
        const toHex = (c: number) =>
          ("0" + Math.round(c).toString(16)).slice(-2);
        const hex = `#${toHex(dominantColorRgb.r)}${toHex(dominantColorRgb.g)}${toHex(dominantColorRgb.b)}`;

        resolve({
          r: Math.round(dominantColorRgb.r),
          g: Math.round(dominantColorRgb.g),
          b: Math.round(dominantColorRgb.b),
          hex,
        });
      } catch (error) {
        reject(new Error("Ошибка при анализе изображения"));
      }
    };
    img.onerror = () => {
      reject(new Error("Ошибка загрузки изображения"));
    };
    img.src = imageUrl;
  });
};

interface Cluster {
  center: RGB;
  pixels: RGB[];
}

// K-means clustering implementation
const kMeansClustering = (
  pixels: RGB[],
  k: number,
  maxIterations: number
): Cluster[] => {
  let centroids: RGB[] = [];
  for (let i = 0; i < k; i++) {
    const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
    centroids.push({ ...randomPixel });
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const clusters: Cluster[] = centroids.map(() => ({
      pixels: [],
      center: { r: 0, g: 0, b: 0 },
    }));

    pixels.forEach((pixel) => {
      let minDistance = Infinity;
      let closestCluster = 0;

      centroids.forEach((centroid, index) => {
        const distance = Math.sqrt(
          Math.pow(pixel.r - centroid.r, 2) +
            Math.pow(pixel.g - centroid.g, 2) +
            Math.pow(pixel.b - centroid.b, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = index;
        }
      });

      clusters[closestCluster].pixels.push(pixel);
    });

    let converged = true;
    centroids = clusters.map((cluster, index) => {
      if (cluster.pixels.length === 0) return centroids[index];

      const newCenter = {
        r:
          cluster.pixels.reduce((sum, p) => sum + p.r, 0) /
          cluster.pixels.length,
        g:
          cluster.pixels.reduce((sum, p) => sum + p.g, 0) /
          cluster.pixels.length,
        b:
          cluster.pixels.reduce((sum, p) => sum + p.b, 0) /
          cluster.pixels.length,
      };

      const oldCenter = centroids[index];
      if (
        Math.abs(newCenter.r - oldCenter.r) > 1 ||
        Math.abs(newCenter.g - oldCenter.g) > 1 ||
        Math.abs(newCenter.b - oldCenter.b) > 1
      ) {
        converged = false;
      }

      cluster.center = newCenter;
      return newCenter;
    });

    if (converged) break;
  }

  return centroids.map((center, index) => ({
    center,
    pixels: pixels.filter((pixel) => {
      let minDistance = Infinity;
      let closestCluster = 0;

      centroids.forEach((centroid, idx) => {
        const distance = Math.sqrt(
          Math.pow(pixel.r - centroid.r, 2) +
            Math.pow(pixel.g - centroid.g, 2) +
            Math.pow(pixel.b - centroid.b, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = idx;
        }
      });

      return closestCluster === index;
    }),
  }));
};

function ColorSwatch({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <div
      className="rounded-lg border-2 border-white shadow-md"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  );
}

function ResultItem({
  image,
  name,
  vendorCode,
  colorText,
  colorHex,
  price,
  stockInfo,
  url,
  distance,
}: {
  image?: string;
  name: string;
  vendorCode: string;
  colorText: string;
  colorHex: string | null;
  price?: number | null;
  stockInfo: StockInfo;
  url?: string;
  distance: number;
}) {
  return (
    <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {image && (
            <div className="relative w-20 h-20 flex-shrink-0">
              <NextImage
                src={image}
                alt={name}
                fill
                className="object-cover rounded-lg"
                sizes="80px"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 mb-1 truncate">{name}</h3>
            <p className="text-sm text-slate-600 mb-2">Артикул: {vendorCode}</p>
            <div className="flex items-center gap-2 mb-2">
              {colorHex && <ColorSwatch color={colorHex} size={20} />}
              <span className="text-sm text-slate-600">{colorText}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                {price && (
                  <span className="font-semibold text-[#007AFF]">{price} ₽/м²</span>
                )}
                <span
                  className={`ml-2 text-sm ${stockInfo.inStock ? "text-green-600" : "text-red-600"}`}
                >
                  {stockInfo.displayText}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Δ {Math.round(distance)}
              </span>
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-blue-600 hover:underline"
              >
                Подробнее →
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SkuPickerPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState<DominantColor | null>(null);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingColor, setIsDetectingColor] = useState(false);
  const [error, setError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { products: feedData, loading: feedLoading } = useProductData();

  const handleFileDrop = useCallback(async (file: File) => {
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      setError("Файл слишком большой. Максимальный размер - 1 МБ.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Неверный формат файла. Поддерживаются: .jpeg, .png, .webp.");
      return;
    }

    setError("");
    setIsDetectingColor(true);
    setDominantColor(null);
    setImageUrl(null);
    setResults([]);

    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result as string;
      setImageUrl(url);
      try {
        const color = await getDominantColor(url);
        setDominantColor(color);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsDetectingColor(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileDrop(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileDrop(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleProcess = () => {
    if (!dominantColor) {
      setError("Сначала загрузите изображение, чтобы определить цвет.");
      return;
    }
    if (!feedData?.length) {
      setError("Данные фида не загружены.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const products: ProductResult[] = feedData
        .map((product) => {
          const colorText = (product.params?.["Цвет"] as string) || "";
          const stockText = (product.params?.["Остаток"] as string) || "";

          const stockInfo = parseStock(stockText);
          const colorRgb = parseColorText(colorText);

          return {
            id: product.vendorCode || product.id,
            name: product.name,
            url: product.url,
            image: product.picture,
            colorText: colorText,
            colorRgb,
            distance: colorRgb ? colorDistance(dominantColor, colorRgb) : Infinity,
            stockInfo: stockInfo,
            price: product.price,
            vendor: product.vendor,
          };
        })
        .filter((p) => p.distance !== Infinity && p.colorText);

      // Sort by distance, then by stock
      products.sort((a, b) => {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        if (a.stockInfo.inStock && !b.stockInfo.inStock) return -1;
        if (!a.stockInfo.inStock && b.stockInfo.inStock) return 1;
        return 0;
      });

      setResults(products.slice(0, 5));

      if (products.length === 0) {
        setError(
          "Не удалось найти товары с подходящими цветами. Попробуйте другое изображение."
        );
      }
    } catch (e) {
      setError("Ошибка при обработке данных: " + (e as Error).message);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <Card className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent mb-4">
              Подобрать артикул по цвету
            </CardTitle>
            <p className="text-slate-600 text-lg">
              Загрузите изображение, и мы найдём похожие товары из нашего
              каталога
            </p>
          </CardHeader>

          <CardContent className="space-y-8 pb-8">
            {/* Upload Section */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={openFileDialog}
                className={`bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? "ring-2 ring-blue-500 scale-[1.02]"
                    : "hover:shadow-lg"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp"
                />
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Upload className="w-12 h-12 text-slate-400" />
                  {isDetectingColor ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin w-5 h-5 text-blue-500" />
                      <span className="text-slate-600">Анализируем цвет...</span>
                    </div>
                  ) : imageUrl ? (
                    <div className="relative w-full max-w-xs h-40">
                      <NextImage
                        src={imageUrl}
                        alt="Превью"
                        fill
                        className="object-contain rounded-xl shadow-lg"
                        sizes="320px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-slate-700">
                        Перетащите изображение сюда
                      </p>
                      <p className="text-sm text-slate-500">
                        или нажмите для выбора файла
                      </p>
                      <p className="text-sm text-slate-500">
                        (до 1 МБ, .jpeg/.png/.webp)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {dominantColor && (
                  <Card className="bg-white/60 backdrop-blur-sm border border-white/20 p-6">
                    <div className="flex items-center gap-4">
                      <ColorSwatch color={dominantColor.hex} size={32} />
                      <div>
                        <p className="font-semibold text-slate-900">
                          Определённый цвет
                        </p>
                        <p className="text-sm text-slate-500 font-mono">
                          {dominantColor.hex}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                <Button
                  onClick={handleProcess}
                  disabled={
                    isLoading ||
                    isDetectingColor ||
                    !dominantColor ||
                    feedLoading ||
                    !feedData?.length
                  }
                  className="w-full bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white py-6 text-lg"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-3 w-5 h-5" />
                      Подбираем товары...
                    </>
                  ) : (
                    <>
                      <Palette className="mr-3 w-5 h-5" />
                      Подобрать товары
                    </>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Card className="bg-red-50/60 border-red-200/60 p-4">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <Card className="bg-white/60 backdrop-blur-sm border border-white/20 p-6 text-center">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Топ-5 подходящих товаров
              </h2>
              <p className="text-slate-600">
                Товары отсортированы по схожести цвета
              </p>
            </Card>

            <div className="space-y-4">
              {results.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <ResultItem
                    image={product.image}
                    name={product.name}
                    vendorCode={product.id}
                    colorText={product.colorText}
                    colorHex={
                      product.colorRgb
                        ? `#${product.colorRgb.r.toString(16).padStart(2, "0")}${product.colorRgb.g.toString(16).padStart(2, "0")}${product.colorRgb.b.toString(16).padStart(2, "0")}`
                        : null
                    }
                    price={product.price}
                    stockInfo={product.stockInfo}
                    url={product.url}
                    distance={product.distance}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

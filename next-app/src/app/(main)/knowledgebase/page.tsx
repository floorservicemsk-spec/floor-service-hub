"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, ExternalLink, Filter, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, KnowledgeBaseItem } from "@/lib/api";

export default function KnowledgeBasePage() {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeBaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "all",
    category: "all",
  });
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      const items = await api.getKnowledgeBase({ isPublic: true, limit: 100 });
      setKnowledgeItems(items);
    } catch (error) {
      console.error("Error loading knowledge base:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let result = knowledgeItems;

    // Filter by type
    if (filters.type !== "all") {
      result = result.filter((item) => item.type === filters.type);
    }

    // Filter by category
    if (filters.category !== "all") {
      result = result.filter(
        (item) => item.categories && item.categories.includes(filters.category)
      );
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.articleCode &&
            item.articleCode.toLowerCase().includes(query)) ||
          (item.categories &&
            item.categories.some((cat) => cat.toLowerCase().includes(query)))
      );
    }

    return result;
  }, [knowledgeItems, filters, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  const getAllCategories = () => {
    const categories = new Set<string>();
    knowledgeItems.forEach((item) => {
      if (item.categories) {
        item.categories.forEach((cat) => categories.add(cat));
      }
    });
    return Array.from(categories);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT":
        return <FileText className="w-4 h-4" />;
      case "LINK":
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "DOCUMENT":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LINK":
        return "bg-green-100 text-green-800 border-green-200";
      case "YANDEX_DISK":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedItems = filteredItems.slice(start, end);

  const canPrev = page > 1;
  const canNext = end < filteredItems.length;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => p + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-4 md:p-8 mb-6 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-xl mx-auto mb-4 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent mb-4">
              База знаний
            </h1>
            <p className="text-slate-600 text-base md:text-lg">
              Найдите нужную информацию, документы и материалы
            </p>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Поиск по названию, описанию, артикулу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 md:py-4 text-base md:text-lg bg-white/80 border-slate-200 focus:border-blue-300 focus:ring-blue-300/20 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-2 md:gap-4 items-center">
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="w-32 md:w-40 border-slate-200">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="DOCUMENT">Документы</SelectItem>
                  <SelectItem value="LINK">Ссылки</SelectItem>
                  <SelectItem value="YANDEX_DISK">Яндекс.Диск</SelectItem>
                </SelectContent>
              </Select>

              {getAllCategories().length > 0 && (
                <Select
                  value={filters.category}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="w-32 md:w-40 border-slate-200">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {getAllCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(searchQuery ||
                filters.type !== "all" ||
                filters.category !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setFilters({ type: "all", category: "all" });
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Сбросить
                </Button>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 md:mt-6 text-center">
            <Badge variant="outline" className="bg-white/50 border-slate-200">
              {loading ? "Загрузка..." : `Найдено: ${filteredItems.length}`}
            </Badge>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(pageSize)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="bg-white/60 rounded-2xl h-44 animate-pulse"
                />
              ))}
          </div>
        ) : pagedItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {pagedItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <Badge
                            variant="outline"
                            className={getTypeColor(item.type)}
                          >
                            {getTypeIcon(item.type)}
                            <span className="ml-1">
                              {item.type === "DOCUMENT"
                                ? "Документ"
                                : item.type === "LINK"
                                  ? "Ссылка"
                                  : item.type === "YANDEX_DISK"
                                    ? "Яндекс.Диск"
                                    : item.type}
                            </span>
                          </Badge>
                        </div>

                        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {item.categories && item.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.categories.slice(0, 2).map((cat) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className="text-xs"
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              className="w-full bg-gradient-to-r from-[#0A84FF] to-[#007AFF]"
                            >
                              Открыть
                            </Button>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {filteredItems.length > pageSize && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={!canPrev}
                  className="border-slate-200"
                >
                  Назад
                </Button>
                <span className="text-sm text-slate-600">Страница {page}</span>
                <Button
                  variant="outline"
                  onClick={goNext}
                  disabled={!canNext}
                  className="border-slate-200"
                >
                  Вперёд
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="bg-white/60 backdrop-blur-sm border-white/20 text-center p-8 md:p-12">
            <CardContent>
              <BookOpen className="w-12 h-12 md:w-16 md:h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Ничего не найдено
              </h3>
              <p className="text-slate-600">
                Попробуйте изменить параметры поиска
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


import React, { useState, useEffect, Suspense } from "react";
import { KnowledgeBase as KB } from "@/entities/KnowledgeBase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, ExternalLink, Tag, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SearchResults = React.lazy(() => import("../components/knowledge/SearchResults"));
// Optionally lazy FilterPanel later if used
// const FilterPanel = React.lazy(() => import("../components/knowledge/FilterPanel"));

export default function KnowledgeBasePage() {
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "all",
    category: "all"
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // New pagination states
  const [page, setPage] = useState(1);
  const pageSize = 12; // 12 items per page
  const [loadedLimit, setLoadedLimit] = useState(pageSize); // How many items to load from the backend

  useEffect(() => {
    loadKnowledgeBase();
  }, [loadedLimit]); // Re-fetch data when loadedLimit changes

  useEffect(() => {
    // Reset page to 1 whenever search query or filters change to avoid empty pages
    setPage(1); 
    filterAndDeduplicateItems();
  }, [searchQuery, filters, knowledgeItems]); // knowledgeItems dependency is crucial here too

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      // Сортируем по дате обновления, чтобы легко находить самую свежую версию
      // Load in chunks based on loadedLimit
      const items = await KB.filter({ is_public: true }, "-updated_date", loadedLimit); 
      setKnowledgeItems(items);
    } catch (error) {
      console.error("Ошибка загрузки базы знаний:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndDeduplicateItems = () => {
    let tempFiltered = knowledgeItems;

    // Фильтр по типу
    if (filters.type !== "all") {
      tempFiltered = tempFiltered.filter(item => item.type === filters.type);
    }

    // Фильтр по категории
    if (filters.category !== "all") {
      tempFiltered = tempFiltered.filter(item =>
        item.categories && item.categories.includes(filters.category)
      );
    }

    // Поиск по тексту
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Возвращаем более широкий поиск, чтобы находить по тегам и описанию
      tempFiltered = tempFiltered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.article_code && item.article_code.toLowerCase().includes(query)) ||
        (item.categories && item.categories.some(cat => cat.toLowerCase().includes(query)))
      );
    }

    // Дедупликация убрана, чтобы показывать все релевантные материалы,
    // даже если у них одинаковый артикул.
    setFilteredItems(tempFiltered);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4" />;
      case "link":
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "document":
        return "bg-red-100 text-red-800 border-red-200";
      case "link":
        return "bg-green-100 text-green-800 border-green-200";
      case "yandex_disk":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getAllCategories = () => {
    const categories = new Set();
    knowledgeItems.forEach(item => {
      if (item.categories) {
        item.categories.forEach(cat => categories.add(cat));
      }
    });
    return Array.from(categories);
  };

  // Pagination calculations
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedItems = filteredItems.slice(start, end);

  // Determine if previous/next buttons should be enabled
  const canPrev = page > 1;
  // canNext is true if there are more filtered items locally OR if we loaded exactly the limit,
  // indicating there might be more items on the backend to fetch.
  const canNext = end < filteredItems.length || knowledgeItems.length === loadedLimit;

  const goPrev = () => {
    if (!canPrev) return;
    setPage(p => Math.max(1, p - 1));
  };
  const goNext = async () => {
    // If next page requires more items than currently loaded from the backend, increase the loadedLimit
    const need = (page + 1) * pageSize;
    if (knowledgeItems.length < need) {
      setLoadedLimit(need);
    }
    setPage(p => p + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-4 md:p-8 mb-6 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
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
                className="pl-12 pr-4 py-3 md:py-4 text-base md:text-lg bg-white/80 border-slate-200 focus:border-red-300 focus:ring-red-300/20 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-2 md:gap-4 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-slate-200 hover:bg-slate-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Фильтры
              </Button>

              <div className="flex flex-wrap gap-2">
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({...prev, type: value}))}>
                  <SelectTrigger className="w-32 md:w-40 border-slate-200">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="document">Документы</SelectItem>
                    <SelectItem value="link">Ссылки</SelectItem>
                    <SelectItem value="yandex_disk">Яндекс.Диск</SelectItem>
                  </SelectContent>
                </Select>

                {getAllCategories().length > 0 && (
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({...prev, category: value}))}>
                    <SelectTrigger className="w-32 md:w-40 border-slate-200">
                      <SelectValue placeholder="Категория" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {getAllCategories().map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {(searchQuery || filters.type !== "all" || filters.category !== "all") && (
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
              {loading && filteredItems.length === 0 ? "Загрузка..." : `Найдено: ${filteredItems.length}`}
            </Badge>
          </div>
        </div>

        {/* Results */}
        <div className="card-grid">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(pageSize).fill(0).map((_, i) => ( // Show skeleton based on pageSize
                  <div key={i} className="bg-white/60 rounded-2xl h-44 animate-pulse" />
                ))}
              </div>
            }
          >
            <SearchResults
              items={pagedItems} // Pass only items for the current page
              loading={loading}
              searchQuery={searchQuery}
              getTypeIcon={getTypeIcon}
              getTypeColor={getTypeColor}
            />
          </Suspense>

          {/* Pagination Controls - only show if there are more items than a single page or if there's potential for more */}
          {filteredItems.length > 0 && (filteredItems.length > pageSize || canNext || canPrev) && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="outline" onClick={goPrev} disabled={!canPrev} className="border-slate-200">
                Назад
              </Button>
              <span className="text-sm text-slate-600">Страница {page}</span>
              <Button 
                variant="outline" 
                onClick={goNext} 
                // Disable if canNext is false AND we've shown all filtered items up to current page AND we didn't load exactly to the limit (meaning no more on backend)
                disabled={!canNext && end >= filteredItems.length} 
                className="border-slate-200"
              >
                Вперёд
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

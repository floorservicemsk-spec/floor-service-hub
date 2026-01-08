"use client";

import React, { useEffect, useMemo, useState, useDeferredValue, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Heart, Search, Lightbulb } from "lucide-react";
import { api } from "@/lib/api";
import { useUser } from "@/components/context/UserContext";

interface AdviceArticle {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  type: string;
  coverUrl?: string;
  categoryIds?: string[];
  allowedUserTypes?: string[];
  status?: string;
}

interface AdviceCategory {
  id: string;
  name: string;
}

export default function TipsPage() {
  const [articles, setArticles] = useState<AdviceArticle[]>([]);
  const [categories, setCategories] = useState<AdviceCategory[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const { user } = useUser();

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [type, category, deferredQ]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [arts, cats] = await Promise.all([
        api.getAdviceArticles(),
        api.getAdviceCategories(),
      ]);
      setArticles(arts);
      setCategories(cats);
    } catch (error) {
      console.error("Error loading tips:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFav = (articleId: string) => favorites.includes(articleId);
  const toggleFav = (articleId: string) => {
    if (!user) {
      alert("Войдите, чтобы добавлять в избранное");
      return;
    }
    setFavorites((prev) =>
      prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId]
    );
  };

  const getUserType = useCallback(() => user?.userType || "USER", [user?.userType]);

  const canSeeArticle = useCallback((article: AdviceArticle) => {
    if (user?.role === "ADMIN") return true;
    const allowed = article.allowedUserTypes;
    if (!allowed || allowed.length === 0) return true;
    return allowed.includes(getUserType());
  }, [user?.role, getUserType]);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (!canSeeArticle(a)) return false;

      const byType = type === "all" || a.type === type;
      const byCat =
        category === "all" ||
        (a.categoryIds || []).includes(category);
      const text = (a.title + " " + (a.summary || "")).toLowerCase();
      const bySearch = deferredQ.trim()
        ? text.includes(deferredQ.toLowerCase())
        : true;
      return byType && byCat && bySearch;
    });
  }, [articles, type, category, deferredQ, canSeeArticle]);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const visibleArticles = useMemo(
    () => filtered.slice(start, end),
    [filtered, start, end]
  );

  const canPrev = page > 1;
  const canNext = end < filtered.length;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => p + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 md:p-8 mb-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-xl mx-auto mb-3 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent">
              Советы
            </h1>
            <p className="text-slate-600 mt-2">Полезные статьи и чек‑листы</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по заголовку и содержимому..."
                className="pl-9"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="article">Статьи</SelectItem>
                <SelectItem value="checklist">Чек‑листы</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading
            ? Array(pageSize)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="bg-white/60 h-64" />
                ))
            : visibleArticles.map((a) => (
                <Card
                  key={a.id}
                  className="bg-white/70 border-white/20 overflow-hidden hover:shadow-xl transition-all"
                >
                  {a.coverUrl ? (
                    <div className="aspect-video w-full bg-slate-100 relative">
                      <Image
                        src={a.coverUrl}
                        alt={a.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200" />
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg line-clamp-2">
                        {a.title}
                      </CardTitle>
                      <button
                        aria-label="В избранное"
                        onClick={() => toggleFav(a.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isFav(a.id)
                            ? "text-red-500"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Heart
                          className="w-5 h-5"
                          fill={isFav(a.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                    {a.summary && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {a.summary}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {a.type === "checklist" ? "Чек‑лист" : "Статья"}
                      </Badge>
                      <Link href={`/tips/${encodeURIComponent(a.slug)}`}>
                        <Button
                          size="sm"
                          className="bg-[#007AFF] hover:bg-[#0a6cff]"
                        >
                          Читать
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Pagination Controls */}
        {!loading && filtered.length > pageSize && (
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
      </div>
    </div>
  );
}

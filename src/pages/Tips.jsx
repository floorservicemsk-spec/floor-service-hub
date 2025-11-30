
import React, { useEffect, useMemo, useState, useRef, useDeferredValue } from "react";
import { AdviceArticle } from "@/entities/AdviceArticle";
import { AdviceCategory } from "@/entities/AdviceCategory";
import { AdviceFavorite } from "@/entities/AdviceFavorite";
import { AdviceMedia } from "@/entities/AdviceMedia";
import { User } from "@/entities/User";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, Search, Filter, Lightbulb } from "lucide-react";
import { preloadImage } from "@/components/utils/imageCache";

export default function TipsPage() {
  const [articles, setArticles] = useState([]);
  const [mediaMap, setMediaMap] = useState({});
  const mediaMapRef = useRef({}); // Using useRef to hold mediaMap for efficient updates
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q); // Debounce search query input
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [favorites, setFavorites] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [loadedLimit, setLoadedLimit] = useState(pageSize); // How many articles have been loaded from the API

  // Load initial data or re-load when 'loadedLimit' changes (to fetch more articles)
  useEffect(() => {
    loadAll();
  }, [loadedLimit]);

  // Reset page to 1 when filters or search query change
  useEffect(() => {
    setPage(1);
  }, [type, category, deferredQ]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const meUser = await User.me().catch(() => null);
      setMe(meUser);

      const [cats, arts] = await Promise.all([
        AdviceCategory.list("name"),
        // Fetch articles up to the current loadedLimit
        AdviceArticle.filter({ status: "published", is_public: true }, "-publish_at", loadedLimit)
      ]);
      setCategories(cats);
      setArticles(arts);

      // Fetch user favorites if logged in
      if (meUser) {
        const favs = await AdviceFavorite.filter({ user_id: meUser.id });
        setFavorites(favs);
      }
      
      // Clear media map and ref, as media will be loaded on demand for visible articles
      mediaMapRef.current = {};
      setMediaMap({});
    } finally {
      setLoading(false);
    }
  };

  const isFav = (articleId) => favorites.some(f => f.article_id === articleId);
  const toggleFav = async (article) => {
    if (!me) return alert("Войдите, чтобы добавлять в избранное");
    const existing = favorites.find(f => f.article_id === article.id);
    if (existing) {
      await AdviceFavorite.delete(existing.id);
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
    } else {
      const f = await AdviceFavorite.create({ article_id: article.id, user_id: me.id });
      setFavorites(prev => [f, ...prev]);
    }
  };

  const getUserType = () => (me?.user_type || "client");
  const canSeeArticle = (a) => {
    if (me?.role === "admin") return true;
    const allowed = a.allowed_user_types;
    if (!allowed || allowed.length === 0) return true;
    return allowed.includes(getUserType());
  };

  const filtered = useMemo(() => {
    return articles.filter(a => {
      // доступ
      if (!canSeeArticle(a)) return false;

      const byType = type === "all" || a.type === type;
      const byCat = category === "all" || (a.category_ids || []).includes(category);
      const text = (a.title + " " + (a.summary || "") + " " + (a.html || "")).toLowerCase();
      const bySearch = deferredQ.trim() ? text.includes(deferredQ.toLowerCase()) : true;
      return byType && byCat && bySearch;
    });
  }, [articles, type, category, deferredQ, me]);

  // Calculate start and end indices for the current page
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  // Slice filtered articles for the current page
  const visibleArticles = useMemo(() => filtered.slice(start, end), [filtered, start, end]);

  // Targeted media loading for visible articles
  useEffect(() => {
    // Identify media IDs that are needed for visible articles but not yet loaded/cached
    const idsToLoad = Array.from(
      new Set(visibleArticles.map(a => a.cover_media_id).filter(Boolean))
    ).filter(id => !mediaMapRef.current[id]);

    if (idsToLoad.length === 0) {
      // Even if meta not needed, still warm cache for visible covers
      visibleArticles.forEach(a => {
        const cover = a.cover_media_id ? mediaMapRef.current[a.cover_media_id] : null;
        if (cover?.url) preloadImage(cover.url);
      });
      return; 
    }

    const loadMedia = async () => {
      const results = await Promise.all(
        idsToLoad.map(async (id) => {
          const res = await AdviceMedia.filter({ id }, undefined, 1);
          return res[0] ? { id, media: res[0] } : null;
        })
      );
      
      const newMedia = {};
      results.forEach(r => {
        if (r && r.media) {
          newMedia[r.id] = r.media;
          // Warm cache for the image URL
          if (r.media.url) preloadImage(r.media.url);
        }
      });

      mediaMapRef.current = { ...mediaMapRef.current, ...newMedia };
      setMediaMap(mediaMapRef.current);
    };

    loadMedia();
  }, [visibleArticles]); // Re-run when visible articles change

  // Pagination controls logic
  const canPrev = page > 1;
  // canNext is true if there are more filtered articles to show (end < filtered.length)
  // OR if we've loaded exactly `loadedLimit` articles, implying there might be more on the server
  // (articles.length === loadedLimit && articles.length > 0 ensures we don't try to load more if no articles were found)
  const canNext = end < filtered.length || (articles.length === loadedLimit && articles.length > 0);
  
  const goPrev = () => setPage(p => Math.max(1, p - 1));
  const goNext = () => {
    // Calculate how many articles would be needed for the next page
    const need = (page + 1) * pageSize;
    // If the currently loaded articles count is less than what's needed for the next page
    // AND we previously fetched exactly `loadedLimit` (meaning there might be more on the server),
    // then increase loadedLimit to trigger a new fetch.
    if (articles.length < need && articles.length === loadedLimit) {
      setLoadedLimit(prevLimit => prevLimit + pageSize); // Increase limit by one page size
    }
    setPage(p => p + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 md:p-8 mb-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-xl mx-auto mb-3 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent">Советы</h1>
            <p className="text-slate-600 mt-2">Полезные статьи и чек‑листы</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по заголовку и содержимому..." className="pl-9" />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="article">Статьи</SelectItem>
                <SelectItem value="checklist">Чек‑листы</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? Array(pageSize).fill(0).map((_, i) => ( // Use pageSize for loading skeletons
            <Card key={i} className="bg-white/60 h-64" />
          )) : visibleArticles.map(a => { // Render only visible articles
            const cover = a.cover_media_id ? mediaMap[a.cover_media_id] : null;
            return (
              <Card key={a.id} className="bg-white/70 border-white/20 overflow-hidden hover:shadow-xl transition-all">
                {cover?.url ? (
                  <div className="aspect-video w-full bg-slate-100">
                    <img src={cover.url} alt={a.title} className="w-full h-full object-cover" loading="lazy" /> {/* Lazy loading for images */}
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg line-clamp-2">{a.title}</CardTitle>
                    <button aria-label="В избранное" onClick={() => toggleFav(a)} className={`p-2 rounded-lg transition-colors ${isFav(a.id) ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Heart className="w-5 h-5" fill={isFav(a.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {a.summary && <p className="text-sm text-slate-600 line-clamp-2">{a.summary}</p>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{a.type === 'checklist' ? 'Чек‑лист' : 'Статья'}</Badge>
                    <Link to={createPageUrl(`TipDetail?slug=${encodeURIComponent(a.slug)}`)}>
                      <Button size="sm" className="bg-[#007AFF] hover:bg-[#0a6cff]">Читать</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {!loading && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <Button variant="outline" onClick={goPrev} disabled={!canPrev}>Назад</Button>
            <span className="text-sm text-slate-600">Страница {page}</span>
            <Button variant="outline" onClick={goNext} disabled={!canNext}>Вперёд</Button>
          </div>
        )}
      </div>
    </div>
  );
}

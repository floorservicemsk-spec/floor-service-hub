
import React, { useState, useEffect } from "react";
import { Video as VideoEntity } from "@/entities/Video";
import { VideoCategory } from "@/entities/VideoCategory";
import { User } from "@/entities/User"; // Added import for User entity
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PlayCircle, Youtube, Video as VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const PlatformIcon = ({ platform }) => {
  switch (platform) {
    case 'youtube':
      return <Youtube className="w-5 h-5 text-[#0A84FF]" />; // Changed from red to blue
    case 'rutube':
      return <PlayCircle className="w-5 h-5 text-[#0A84FF]" />; // Changed from red to blue
    case 'vk':
      return <VideoIcon className="w-5 h-5 text-blue-500" />; // Retained blue shade for VK as it was already blue-ish
    default:
      return <PlayCircle className="w-5 h-5 text-slate-500" />;
  }
};

export default function VideoPage() {
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [loadedLimit, setLoadedLimit] = useState(pageSize);

  // User state for access control
  const [me, setMe] = useState(null);

  useEffect(() => {
    loadData();
  }, [loadedLimit]); // Reload data if loadedLimit changes

  useEffect(() => {
    filterVideos();
    setPage(1); // Reset page to 1 on filter/search/video data change
  }, [searchQuery, selectedCategory, videos, me]); // Added 'me' to dependencies

  // Helper functions for access control
  const getUserType = () => (me?.user_type || "client");

  const canSeeVideo = (v) => {
    // Admins can see all videos
    if (me?.role === "admin") return true;

    const allowed = v.allowed_user_types;
    // If allowed_user_types is not defined or is empty, the video is accessible to all by default
    if (!allowed || allowed.length === 0) return true;

    // Check if the current user's type is in the allowed list
    return allowed.includes(getUserType());
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [videoData, categoryData, userData] = await Promise.all([
        VideoEntity.filter({ is_published: true }, "order", loadedLimit), // Pass loadedLimit to fetch more
        VideoCategory.filter({ is_active: true }, "order"),
        User.me().catch(() => null) // Fetch current user data, catch errors and set to null
      ]);
      setVideos(videoData);
      setCategories(categoryData);
      setMe(userData); // Set the current user data
    } catch (error) {
      console.error("Ошибка загрузки видео:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterVideos = () => {
    let filtered = videos;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(video =>
        video.categories && video.categories.includes(selectedCategory)
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) ||
        (video.description && video.description.toLowerCase().includes(query))
      );
    }
    // Apply access control filter
    filtered = filtered.filter(v => canSeeVideo(v));
    setFilteredVideos(filtered);
  };

  // Pagination calculations
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedVideos = filteredVideos.slice(start, end);

  const canPrev = page > 1;
  const canNext = end < filteredVideos.length || videos.length === loadedLimit; // Can go next if more filtered videos exist OR if we've loaded exactly 'loadedLimit' from backend, implying more might exist

  const goPrev = () => setPage(p => Math.max(1, p - 1));
  const goNext = () => {
    const need = (page + 1) * pageSize; // Calculate the total items needed for the next page
    if (videos.length < need) { // If currently loaded videos don't cover the 'need' for the next page
      setLoadedLimit(need); // Increase loadedLimit to fetch more data
    }
    setPage(p => p + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent mb-4">
              Видеогалерея
            </h1>
            <p className="text-slate-600 text-lg">
              Полезные видео, инструкции и обзоры
            </p>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Поиск по видео..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-4 text-lg bg-white/80 border-slate-200 focus:border-blue-300 focus:ring-blue-300/20 rounded-xl" // Changed focus colors to blue
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setSelectedCategory("all")}
              className={selectedCategory === "all" ? "bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white hover:shadow-[0_0_15px_rgba(0,122,255,0.4)]" : "border-slate-200 hover:bg-slate-50"} // Changed button colors and shadow to blue
            >
              Все видео
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id ? "bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white hover:shadow-[0_0_15px_rgba(0,122,255,0.4)]" : "border-slate-200 hover:bg-slate-50"} // Changed button colors and shadow to blue
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {pagedVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pagedVideos.map(video => (
              <Card key={video.id} className="bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4">
                  <div className="aspect-video mb-4 rounded-lg overflow-hidden">
                    <iframe
                      src={video.embed_url}
                      title={video.title}
                      frameBorder="0"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                     <h3 className="font-semibold text-slate-900 text-md leading-tight">{video.title}</h3>
                     <PlatformIcon platform={video.platform} />
                  </div>
                  {video.description && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{video.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/60 backdrop-blur-sm border-white/20 text-center p-12">
            <CardContent>
              <PlayCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">Видео не найдены</h3>
              <p className="text-slate-600">
                Попробуйте изменить поисковый запрос или выбрать другую категорию.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button variant="outline" onClick={goPrev} disabled={!canPrev}>Назад</Button>
          <span className="text-sm text-slate-600">Страница {page}</span>
          <Button variant="outline" onClick={goNext} disabled={!canNext}>Вперёд</Button>
        </div>
      </div>
    </div>
  );
}

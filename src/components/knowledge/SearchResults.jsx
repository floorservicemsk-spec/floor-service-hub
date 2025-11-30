
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AISettings } from "@/entities/AISettings";

export default function SearchResults({ items, loading, searchQuery, getTypeIcon, getTypeColor }) {
  const [aiSettings, setAiSettings] = React.useState(null);

  React.useEffect(() => {
    loadAISettings();
  }, []);

  const loadAISettings = async () => {
    try {
      const settings = await AISettings.list();
      if (settings.length > 0) {
        setAiSettings(settings[0]);
      }
    } catch (error) {
      console.error("Ошибка загрузки настроек:", error);
    }
  };

  // The getYandexDiskUrl function is removed as per the updated outline.
  // The 'Открыть' button will now directly use item.url for all types.

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i} className="bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-white/20 text-center p-12">
        <div className="text-slate-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <Tag className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Ничего не найдено</h3>
          <p>
            {searchQuery 
              ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить поисковый запрос.`
              : "В базе знаний пока нет материалов."
            }
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-2">
                    {item.title}
                  </CardTitle>
                  <Badge className={`${getTypeColor(item.type)} border flex-shrink-0`}>
                    {getTypeIcon(item.type)}
                    <span className="ml-1 capitalize">
                      {item.type === "document" ? "Документ" : 
                       item.type === "link" ? "Ссылка" : "Я.Диск"}
                    </span>
                  </Badge>
                </div>
                
                {item.article_code && (
                  <Badge variant="outline" className="w-fit bg-yellow-50 text-yellow-800 border-yellow-200">
                    Артикул: {item.article_code}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {item.description && (
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-1">
                    {item.description}
                  </p>
                )}

                {/* Categories */}
                {item.categories && item.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.categories.map(category => (
                      <Badge 
                        key={category} 
                        variant="outline" 
                        className="text-xs bg-slate-50 text-slate-600 border-slate-200"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(item.created_date), "d MMM yyyy", { locale: ru })}
                  </div>
                  
                  <div className="flex gap-2">
                    {/* The condition and onClick handler for the 'Open' button have been updated */}
                    {item.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(item.url, '_blank')} // Now directly uses item.url
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        {item.type === 'yandex_disk' ? 'Открыть в Я.Диск' : 'Открыть'}
                      </Button>
                    )}
                    {item.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(item.file_url, '_blank')}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Скачать
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

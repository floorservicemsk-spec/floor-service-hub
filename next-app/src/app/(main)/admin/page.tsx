"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/components/context/UserContext";
import { api, KnowledgeBaseItem } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import {
  BookMarked,
  BrainCircuit,
  ShieldAlert,
  Database,
  HelpCircle,
  Users,
  PlayCircle,
  UserCheck,
  X,
  Menu,
  Lightbulb,
  Image,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const adminSections: AdminSection[] = [
  {
    id: "knowledge",
    title: "База знаний",
    description: "Управление документами и материалами",
    icon: BookMarked,
    color: "bg-blue-500",
  },
  {
    id: "ai-data",
    title: "Данные для ИИ",
    description: "Источники знаний для ИИ-ассистента",
    icon: Database,
    color: "bg-purple-500",
  },
  {
    id: "ai-settings",
    title: "Настройки ИИ",
    description: "Конфигурация ИИ-ассистента",
    icon: BrainCircuit,
    color: "bg-cyan-500",
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Часто задаваемые вопросы",
    icon: HelpCircle,
    color: "bg-green-500",
  },
  {
    id: "video",
    title: "Видео",
    description: "Управление видеогалереей",
    icon: PlayCircle,
    color: "bg-red-500",
  },
  {
    id: "tips",
    title: "Советы",
    description: "Статьи и чек‑листы",
    icon: Lightbulb,
    color: "bg-blue-500",
  },
  {
    id: "banner",
    title: "Баннер главной",
    description: "Контент заставки и CTA",
    icon: Image,
    color: "bg-blue-600",
  },
  {
    id: "users",
    title: "Пользователи",
    description: "Управление пользователями",
    icon: Users,
    color: "bg-indigo-500",
  },
];

// AI Data Manager Component
function AIDataManager() {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      const items = await api.getKnowledgeBase({ isAiSource: true });
      setKnowledgeItems(items);
    } catch (error) {
      console.error("Error loading knowledge base:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncXml = async (id: string) => {
    setSyncing(id);
    try {
      const result = await api.syncXmlFeed(id);
      if (result.success) {
        toast({
          title: "Синхронизация завершена",
          description: `Загружено ${result.products_count || 0} товаров`,
        });
        loadKnowledgeBase();
      }
    } catch (error) {
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось синхронизировать XML фид",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Источники знаний для ИИ</h3>
        <Button variant="outline" onClick={loadKnowledgeBase}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {knowledgeItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Нет источников знаний для ИИ
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {knowledgeItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                    {item.description && (
                      <p className="text-sm text-slate-600 mt-1">
                        {item.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{item.type}</Badge>
                      {item.xmlData?.total_products && (
                        <Badge variant="secondary">
                          {item.xmlData.total_products} товаров
                        </Badge>
                      )}
                      {item.lastSync && (
                        <Badge variant="secondary">
                          Синхр: {new Date(item.lastSync).toLocaleDateString("ru-RU")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {item.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {item.type === "XML_FEED" && (
                      <Button
                        size="sm"
                        onClick={() => handleSyncXml(item.id)}
                        disabled={syncing === item.id}
                      >
                        {syncing === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Синхронизировать
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Placeholder component for other sections
function PlaceholderSection({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-slate-500">
          Раздел "{title}" находится в разработке.
        </p>
        <p className="text-sm text-slate-400 mt-2">
          Функциональность будет добавлена в следующих обновлениях.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("knowledge");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  if (userLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 text-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 max-w-md w-full">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Доступ запрещен
          </h1>
          <p className="text-slate-600">
            У вас нет прав администратора для просмотра этой страницы.
          </p>
          <Button className="mt-4" onClick={() => router.push("/chat")}>
            Вернуться в чат
          </Button>
        </div>
      </div>
    );
  }

  const currentSection = adminSections.find((s) => s.id === activeSection);
  const Icon = currentSection?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-white/20 p-4 lg:hidden md:hidden">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent">
              Админ-панель
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/chat")}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/60 backdrop-blur-xl border-r border-white/20 transform transition-transform lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Desktop Header */}
            <div className="p-6 border-b border-white/20 hidden lg:block">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent">
                  Панель администратора
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/chat")}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-600 text-sm">
                Управление системой и пользователями
              </p>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pt-20 lg:pt-4">
              {adminSections.map((section) => {
                const SectionIcon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white shadow-lg"
                        : "hover:bg-white/60 hover:shadow-md text-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive ? "bg-white/20" : section.color
                        }`}
                      >
                        <SectionIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold text-sm mb-1 ${
                            isActive ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {section.title}
                        </h3>
                        <p
                          className={`text-xs ${
                            isActive ? "text-white/80" : "text-slate-500"
                          }`}
                        >
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-screen pt-16 lg:pt-0">
          <div className="p-4 lg:p-6">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${currentSection?.color}`}
                >
                  {Icon && <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />}
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                    {currentSection?.title}
                  </h1>
                  <p className="text-slate-600 text-sm lg:text-base">
                    {currentSection?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="bg-white/30 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-white/20">
              {activeSection === "ai-data" ? (
                <AIDataManager />
              ) : (
                <PlaceholderSection title={currentSection?.title || ""} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

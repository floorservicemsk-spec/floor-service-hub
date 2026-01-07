"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/context/UserContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  Settings,
  MessageSquare,
  Users,
  HelpCircle,
  Video,
  Image,
  Award,
  BookOpen,
} from "lucide-react";

// Admin managers
import KnowledgeManager from "./components/KnowledgeManager";
import SettingsManager from "./components/SettingsManager";
import ChatHistoryViewer from "./components/ChatHistoryViewer";
import UserManager from "./components/UserManager";
import FAQManager from "./components/FAQManager";
import VideoManager from "./components/VideoManager";
import BannerManager from "./components/BannerManager";
import DealerManager from "./components/DealerManager";
import TipsAdmin from "./components/TipsAdmin";

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("knowledge");

  useEffect(() => {
    if (!userLoading && (!user || user.role !== "ADMIN")) {
      router.push("/chat");
    }
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  const tabs = [
    { id: "knowledge", label: "База знаний", icon: Database },
    { id: "settings", label: "Настройки ИИ", icon: Settings },
    { id: "chat", label: "История чатов", icon: MessageSquare },
    { id: "users", label: "Пользователи", icon: Users },
    { id: "faq", label: "FAQ", icon: HelpCircle },
    { id: "video", label: "Видео", icon: Video },
    { id: "tips", label: "Советы", icon: BookOpen },
    { id: "banners", label: "Баннеры", icon: Image },
    { id: "dealers", label: "Дилеры", icon: Award },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Панель администратора</h1>
        <p className="text-slate-600 mt-1">
          Управление системой Floor Service Hub
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-white/50 p-2 rounded-xl mb-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="knowledge">
          <KnowledgeManager />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsManager />
        </TabsContent>

        <TabsContent value="chat">
          <ChatHistoryViewer />
        </TabsContent>

        <TabsContent value="users">
          <UserManager />
        </TabsContent>

        <TabsContent value="faq">
          <FAQManager />
        </TabsContent>

        <TabsContent value="video">
          <VideoManager />
        </TabsContent>

        <TabsContent value="tips">
          <TipsAdmin />
        </TabsContent>

        <TabsContent value="banners">
          <BannerManager />
        </TabsContent>

        <TabsContent value="dealers">
          <DealerManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

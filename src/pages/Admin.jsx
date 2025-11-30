
import React, { useState, useEffect, Suspense } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookMarked, 
  BrainCircuit, 
  ShieldAlert, 
  History, 
  Database, 
  HelpCircle, 
  Users, 
  PlayCircle, 
  UserCheck,
  X,
  Menu,
  Plug, // Added Plug icon
  Lightbulb, // Added Lightbulb icon for 'Tips'
  Image // Added Image icon for Banner
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Lazy-load admin modules to split admin bundle
const KnowledgeManager = React.lazy(() => import("../components/admin/KnowledgeManager"));
const AIDataManager = React.lazy(() => import("../components/admin/AIDataManager"));
const SettingsManager = React.lazy(() => import("../components/admin/SettingsManager"));
const ChatHistoryViewer = React.lazy(() => import("../components/admin/ChatHistoryViewer"));
const FAQManager = React.lazy(() => import("../components/admin/FAQManager"));
const UserManager = React.lazy(() => import("../components/admin/UserManager"));
const UserDataManager = React.lazy(() => import("../components/admin/UserDataManager"));
const VideoManager = React.lazy(() => import("../components/admin/VideoManager"));
const IntegrationsManager = React.lazy(() => import("../components/admin/IntegrationsManager"));
const TipsAdmin = React.lazy(() => import("../components/admin/TipsAdmin"));
const BannerManager = React.lazy(() => import("../components/admin/BannerManager"));
const DealerManager = React.lazy(() => import("../components/admin/DealerManager")); // Added DealerManager

const adminSections = [
  {
    id: 'knowledge',
    title: 'База знаний',
    description: 'Управление документами и материалами',
    icon: BookMarked,
    color: 'bg-blue-500',
    component: KnowledgeManager
  },
  {
    id: 'ai-data',
    title: 'Данные для ИИ',
    description: 'Источники знаний для ИИ-ассистента',
    icon: Database,
    color: 'bg-purple-500',
    component: AIDataManager
  },
  {
    id: 'integrations',
    title: 'Интеграции',
    description: 'Email и WhatsApp, шаблоны и журнал',
    icon: Plug,
    color: 'bg-rose-500',
    component: IntegrationsManager
  },
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Часто задаваемые вопросы',
    icon: HelpCircle,
    color: 'bg-green-500',
    component: FAQManager
  },
  {
    id: 'video',
    title: 'Видео',
    description: 'Управление видеогалереей',
    icon: PlayCircle,
    color: 'bg-red-500',
    component: VideoManager
  },
  {
    id: 'tips',
    title: 'Советы',
    description: 'Статьи и чек‑листы для пользователей',
    icon: Lightbulb,
    color: 'bg-blue-500',
    component: TipsAdmin
  },
  {
    id: 'home-banner',
    title: 'Баннер главной',
    description: 'Контент заставки и CTA',
    icon: Image,
    color: 'bg-blue-600',
    component: BannerManager
  },
  // Переименовано: Дилеры -> Бонусы
  {
    id: 'dealers',
    title: 'Бонусы',
    description: 'Тиры, баллы, ручные правки и глобальный выключатель',
    icon: Users,
    color: 'bg-indigo-600',
    component: DealerManager
  },
  {
    id: 'users',
    title: 'Пользователи',
    description: 'Управление данными пользователей',
    icon: Users,
    color: 'bg-indigo-500',
    component: UserDataManager
  },
  {
    id: 'authorizations',
    title: 'Авторизации',
    description: 'Одобрение и блокировка пользователей',
    icon: UserCheck,
    color: 'bg-amber-500',
    component: UserManager
  },
  {
    id: 'settings',
    title: 'Настройки ИИ',
    description: 'Конфигурация ИИ-ассистента',
    icon: BrainCircuit,
    color: 'bg-cyan-500',
    component: SettingsManager
  },
  {
    id: 'history',
    title: 'История чатов',
    description: 'Просмотр переписок пользователей',
    icon: History,
    color: 'bg-slate-500',
    component: ChatHistoryViewer
  }
];

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('knowledge');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // NEW: remount active module on user-updated
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  // NEW: listen for global user updates to refresh lists (Users, Bonuses, Authorizations)
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('user-updated', handler);
    return () => window.removeEventListener('user-updated', handler);
  }, []);

  const checkAdminStatus = async () => {
    try {
      const user = await User.me();
      if (user.role === 'admin') {
        setIsAdmin(true);
      } else {
        navigate(createPageUrl("Chat"));
      }
    } catch (error) {
      navigate(createPageUrl("Chat"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 text-center overflow-hidden">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 max-w-md w-full">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Доступ запрещен</h1>
          <p className="text-slate-600">У вас нет прав администратора для просмотра этой страницы.</p>
        </div>
      </div>
    );
  }

  const ActiveComponent = adminSections.find(section => section.id === activeSection)?.component;

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      <style>
        {`
          /* Критически важные стили для устранения горизонтального скролла */
          .admin-container {
            width: 100vw;
            height: 100vh;
            max-width: 100vw;
            max-height: 100vh;
            overflow: hidden;
            display: grid;
            grid-template-columns: 280px 1fr;
            box-sizing: border-box;
          }
          
          @media (max-width: 1024px) {
            .admin-container {
              grid-template-columns: 1fr;
            }
          }
          
          .admin-sidebar {
            width: 280px;
            max-width: 280px;
            min-width: 280px;
            height: 100vh;
            overflow-y: auto;
            overflow-x: hidden;
            box-sizing: border-box;
          }
          
          .admin-content {
            width: 100%;
            height: 100vh;
            min-width: 0;
            overflow-y: auto;
            overflow-x: hidden;
            box-sizing: border-box;
          }
          
          /* Исправления для таблиц */
          .admin-table-container {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            box-sizing: border-box;
          }
          
          .admin-table-container table {
            width: 100%;
            min-width: 600px;
            box-sizing: border-box;
          }
          
          .admin-table-container th,
          .admin-table-container td {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
          }

          .admin-mobile-menu {
            display: none;
          }
          
          @media (max-width: 1024px) {
            .admin-sidebar {
              position: fixed;
              left: 0;
              top: 0;
              z-index: 50;
              transform: translateX(-100%);
              transition: transform 0.3s ease;
            }
            
            .admin-sidebar.open {
              transform: translateX(0);
            }
            
            .admin-mobile-menu {
              display: block;
            }
          }
        `}
      </style>

      <div className="admin-container">
        {/* Mobile Header */}
        <div className="admin-mobile-menu fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-white/20 p-4 lg:hidden">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-[#C31E2E] to-[#940815] bg-clip-text text-transparent">
              Админ-панель
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl("Chat"))}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`admin-sidebar bg-white/60 backdrop-blur-xl border-r border-white/20 ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="flex flex-col h-full">
            {/* Desktop Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#C31E2E] to-[#940815] bg-clip-text text-transparent">
                  Панель администратора
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(createPageUrl("Chat"))}
                  className="text-slate-500 hover:text-slate-700 hidden lg:flex"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-600 text-sm">Управление системой и пользователями</p>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {adminSections.map((section) => {
                const Icon = section.icon;
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
                        ? 'bg-gradient-to-r from-[#C31E2E] to-[#940815] text-white shadow-lg'
                        : 'hover:bg-white/60 hover:shadow-md text-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-white/20' : section.color
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-sm mb-1 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {section.title}
                        </h3>
                        <p className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
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

        {/* Main Content */}
        <div className="admin-content pt-16 lg:pt-0">
          <div className="h-full p-4 lg:p-6">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center gap-4 mb-2">
                {(() => {
                  const currentSection = adminSections.find(s => s.id === activeSection);
                  const Icon = currentSection?.icon;
                  return (
                    <>
                      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${currentSection?.color}`}>
                        <Icon className="w-5 h-5 lg:w-6 lg-h-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{currentSection?.title}</h1>
                        <p className="text-slate-600 text-sm lg:text-base">{currentSection?.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Content Container */}
            <div className="bg-white/30 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-white/20 w-full min-w-0">
              {ActiveComponent && (
                <Suspense
                  fallback={
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                      <span>Загрузка модуля…</span>
                    </div>
                  }
                >
                  {/* key forces remount to reload data after name change */}
                  <ActiveComponent key={`${activeSection}-${refreshKey}`} />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

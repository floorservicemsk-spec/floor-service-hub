import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare, BookOpen, Settings, LogOut, User, Menu, HelpCircle, ShieldAlert, Clock, PlayCircle, Calculator, Palette, Building, History, Lightbulb } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { User as UserEntity } from "@/entities/User";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { UserProvider, useUser } from "@/components/context/UserContext";
import { ProductDataProvider } from "@/components/context/ProductDataContext";

const navigationItems = [
  {
    title: "Чат",
    url: createPageUrl("Chat"),
    icon: MessageSquare
  },
  {
    title: "База знаний",
    url: createPageUrl("KnowledgeBase"),
    icon: BookOpen
  },
  {
    title: "Советы",
    url: createPageUrl("Tips"),
    icon: Lightbulb
  },
  {
    title: "Подобрать артикул",
    url: createPageUrl("SkuPicker"),
    icon: Palette
  },
  {
    title: "FAQ",
    url: createPageUrl("FAQ"),
    icon: HelpCircle
  },
  {
    title: "Видео",
    url: createPageUrl("Video"),
    icon: PlayCircle
  },
  {
    title: "Калькулятор",
    url: createPageUrl("Calculator"),
    icon: Calculator
  }
];

const adminItems = [
  {
    title: "Админ-панель",
    url: createPageUrl("Admin"),
    icon: Settings
  }
];

// Внутренний компонент Layout который использует контекст
function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const { 
    user, 
    dealerProfile, 
    bonusEnabled, 
    loading, 
    isBlocked, 
    needsApproval, 
    isAdmin, 
    displayName,
    logout: handleLogout,
    login: handleLogin
  } = useUser();

  const isHomePage = currentPageName === "HomeSplash";

  // Tier helpers
  const tierPill = () => {
    if (!bonusEnabled || !dealerProfile) return null;
    const tier = (dealerProfile?.manual_tier_enabled && (!dealerProfile?.manual_tier_expires_at || new Date(dealerProfile.manual_tier_expires_at) > new Date()))
      ? dealerProfile?.manual_tier
      : dealerProfile?.current_tier;

    // Hide textual pill for platinum (tier4) as requested
    if (tier === "tier4") return null;

    const map = {
      tier1: { label: "Базовый", cls: "bg-slate-100 text-slate-700 border-slate-200" },
      tier2: { label: "Серебряный", cls: "bg-zinc-100 text-zinc-700 border-zinc-200" },
      tier3: { label: "Золотой", cls: "bg-amber-100 text-amber-800 border-amber-200" }
    };
    const t = map[tier] || map.tier1;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${t.cls} mt-0.5`}>
        {t.label}
      </span>
    );
  };

  // Text color for role/status line under app title (tier-based)
  const tierStatusTextClass = () => {
    if (!bonusEnabled || !dealerProfile) return "text-slate-500";
    const tier = (dealerProfile?.manual_tier_enabled && (!dealerProfile?.manual_tier_expires_at || new Date(dealerProfile.manual_tier_expires_at) > new Date()))
      ? dealerProfile?.manual_tier
      : dealerProfile?.current_tier;
    switch (tier) {
      case "tier4": return "text-indigo-700";
      case "tier3": return "text-amber-700";
      case "tier2": return "text-zinc-700";
      default: return "text-slate-500";
    }
  };

  // Tier-based glow for chat icons (header avatar, footer avatar)
  const computeTierIconClass = () => {
    if (!bonusEnabled) {
      return "bg-gradient-to-br from-[#0A84FF] to-[#007AFF] ring-2 ring-blue-300/40 shadow-[0_0_18px_rgba(59,130,246,0.25)]";
    }
    const tier = (dealerProfile?.manual_tier_enabled && (!dealerProfile?.manual_tier_expires_at || new Date(dealerProfile.manual_tier_expires_at) > new Date()))
      ? dealerProfile?.manual_tier
      : dealerProfile?.current_tier;

    switch (tier) {
      case "tier4": // platinum
        return "bg-gradient-to-br from-indigo-500 to-blue-500 ring-2 ring-indigo-300/60 shadow-[0_0_22px_rgba(99,102,241,0.35)]";
      case "tier3": // gold
        return "bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-300 ring-2 ring-amber-300/60 shadow-[0_0_22px_rgba(245,158,11,0.35)]";
      case "tier2": // silver
        return "bg-gradient-to-br from-zinc-200 via-slate-100 to-white ring-2 ring-zinc-300/60 shadow-[0_0_18px_rgba(148,163,184,0.25)]";
      case "tier1": // base
      default:
        return "bg-gradient-to-br from-slate-200 to-slate-300 ring-2 ring-slate-300/60 shadow-[0_0_16px_rgba(100,116,139,0.25)]";
    }
  };
  const chatIconBg = computeTierIconClass();

  // Active icon color in sidebar should be theme blue
  const isActiveUrl = (url) => location.pathname === url;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card-l1 p-8 rounded-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card-l2 p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-h1 mb-4">Доступ заблокирован</h1>
          <p className="text-secondary mb-8">Ваш аккаунт был заблокирован администратором. Пожалуйста, свяжитесь с поддержкой для получения дополнительной информации.</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Обновить страницу
          </Button>
        </div>
      </div>
    );
  }

  if (needsApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card-l2 p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-h1 mb-4">Ожидание одобрения</h1>
          <p className="text-secondary mb-4">Ваш аккаунт находится на модерации. Администратор должен одобрить ваш доступ к системе.</p>
          <p className="text-caption text-secondary mb-8">Обычно это занимает не более 24 часов. Вы получите уведомление на email, когда доступ будет предоставлен.</p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Проверить статус
            </Button>
            <Button onClick={handleLogout} variant="secondary" className="w-full">
              Выйти из аккаунта
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card-l2 p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#C31E2E] to-[#940815] rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-h1 mb-4">ИИ-Ассистент</h1>
          <p className="text-secondary mb-8">Войдите в систему для доступа к чату и базе знаний</p>
          <Button onClick={handleLogin} className="w-full">
            Войти в систему
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <style>
          {`
            html, body {
              width: 100%;
              overflow-x: hidden;
              box-sizing: border-box;
              margin: 0; /* Ensure no default margin/padding */
              padding: 0;
            }

            body {
              background-color: var(--bg-color);
              background-image: linear-gradient(135deg, #e0f2f7 0%, #cce7ee 100%); /* Subtle background gradient */
            }

            * {
              box-sizing: border-box;
            }

            /* Glassmorphism variables */
            :root {
              --primary-gradient: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); /* Kept from original */
              --bg-color: #f0f4f8; /* Light background for the overall page */
              --card-bg-light: rgba(255, 255, 255, 0.5); /* L1 glass card bg */
              --card-bg-medium: rgba(255, 255, 255, 0.6); /* L2 glass card bg */
              --card-border: rgba(255, 255, 255, 0.2); /* Glass card border */
              --glass-blur: 20px; /* Blur amount for glass effect */
              --text-h1-color: #1e293b; /* slate-900 */
              --text-secondary-color: #475569; /* slate-600 */
              --text-caption-color: #64748b; /* slate-500 */
            }

            /* Glassmorphism classes */
            .glass-card-l1 {
              background-color: var(--card-bg-light);
              backdrop-filter: blur(var(--glass-blur));
              -webkit-backdrop-filter: blur(var(--glass-blur)); /* For Safari */
              border: 1px solid var(--card-border);
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            }

            .glass-card-l2 {
              background-color: var(--card-bg-medium);
              backdrop-filter: blur(var(--glass-blur));
              -webkit-backdrop-filter: blur(var(--glass-blur)); /* For Safari */
              border: 1px solid var(--card-border);
              box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.08);
            }

            .glass-navbar {
              background-color: var(--card-bg-medium);
              backdrop-filter: blur(var(--glass-blur));
              -webkit-backdrop-filter: blur(var(--glass-blur)); /* For Safari */
            }

            /* Text utility classes */
            .text-h1 {
              color: var(--text-h1-color);
              font-weight: bold;
              font-size: 1.5rem; /* Equivalent to text-2xl */
              line-height: 2rem;
            }

            .text-secondary {
              color: var(--text-secondary-color);
            }

            .text-caption {
              color: var(--text-caption-color);
              font-size: 0.875rem; /* Equivalent to text-sm */
              line-height: 1.25rem;
            }

            /* Полное устранение горизонтального скролла */
            .main-layout {
              width: 100vw;
              max-width: 100vw;
              overflow-x: hidden;
            }

            /* Исправление для админ страницы */
            .admin-page-override {
              width: 100vw !important;
              max-width: 100vw !important;
              overflow-x: hidden !important;
              margin-left: 0 !important;
              padding-left: 0 !important;
            }

            img {
              max-width: 100%;
              height: auto;
              display: block;
            }

            p, a, div {
              overflow-wrap: break-word;
              word-break: break-word;
            }

            /* Обеспечиваем правильный скролл на мобильных */
            @media (max-width: 768px) {
              .sidebar-content {
                max-width: 100vw;
                overflow-x: auto;
              }

              .main-content {
                width: 100%;
                min-width: 0;
                overflow-x: auto;
              }

              /* Исправляем таблицы на мобильных */
              table {
                min-width: 100%;
                display: block;
                overflow-x: auto;
                white-space: nowrap;
              }

              /* Исправляем карточки */
              .card-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
              }

              /* Исправляем формы */
              .form-grid {
                grid-template-columns: 1fr;
              }
            }
          `}
        </style>

        {/* Mobile Header - Fixed */}
        {!isHomePage &&
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-navbar border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="glass-card-l1 p-2 rounded-lg">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${chatIconBg} rounded-lg flex items-center justify-center`}>
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-lg font-bold">ИИ-Ассистент</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-7 h-7 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center hover:from-slate-300 hover:to-slate-400 transition-colors">
                      <Settings className="w-4 h-4 text-slate-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AccountProfile")} className="flex items-center gap-2 w-full">
                        <User className="w-4 h-4" />
                        Личные данные
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AccountLegal")} className="flex items-center gap-2 w-full">
                        <Building className="w-4 h-4" />
                        Юр. лица
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AccountOrders")} className="flex items-center gap-2 w-full">
                        <History className="w-4 h-4" />
                        История заказов
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        }

        {currentPageName !== "Admin" && !isHomePage &&
          <Sidebar className="border-r border-white/20 glass-navbar z-20">
            <SidebarHeader className="border-b border-white/20 p-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${chatIconBg} rounded-xl flex items-center justify-center`}>
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-lg font-bold">Floor Service hub</h2>
                  <p className={`${tierStatusTextClass()} text-xs`}>
                    {isAdmin ? "Администратор" : user?.user_type === 'dealer' ? "Дилер" : user?.user_type === 'manager' ? "Менеджер" : "Пользователь"}
                  </p>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="p-4 sidebar-content">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-caption uppercase tracking-wider px-3 py-2">
                  Основные
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) =>
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`glass-card-l1 transition-all duration-200 rounded-xl mb-1 ${
                            isActiveUrl(item.url)
                              ? 'bg-white/80 text-slate-900 ring-1 ring-[#007AFF]/25 shadow-md'
                              : 'text-slate-800 hover:bg-white/70 hover:shadow-md'
                          }`}>
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className={`w-5 h-5 ${isActiveUrl(item.url) ? 'text-[#007AFF]' : 'text-slate-700'}`} />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {isAdmin &&
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-caption uppercase tracking-wider px-3 py-2">
                    Администрирование
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminItems.map((item) =>
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`glass-card-l1 hover:shadow-lg transition-all duration-200 rounded-xl mb-1 ${
                              isActiveUrl(item.url) ? 'bg-white/80 text-slate-900 ring-1 ring-[#007AFF]/25 shadow-md' : ''
                            }`}>
                            <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                              <item.icon className={`w-5 h-5 ${isActiveUrl(item.url) ? 'text-[#007AFF]' : 'text-slate-700'}`} />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              }
            </SidebarContent>

            <SidebarFooter className="border-t border-white/20 p-6 pb-24 md:pb-6 z-30 relative">
              {user &&
                <div className="flex items-center justify-between p-2 rounded-xl">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 ${chatIconBg} rounded-full flex items-center justify-center`}>
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {displayName}
                      </p>
                      {/* Tier text pill hidden for platinum via tierPill() */}
                      {tierPill()}
                      <p className="text-xs text-slate-500 truncate">
                        {user.email || 'email не указан'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("AccountProfile")} className="flex items-center gap-2 w-full">
                            <User className="w-4 h-4" />
                            Личные данные
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("AccountLegal")} className="flex items-center gap-2 w-full">
                            <Building className="w-4 h-4" />
                            Юр. лица
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("AccountOrders")} className="flex items-center gap-2 w-full">
                            <History className="w-4 h-4" />
                            История заказов
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              }
              {!user &&
                <div className="text-center text-sm text-slate-500">
                  Загрузка информации о пользователе...
                </div>
              }
            </SidebarFooter>
          </Sidebar>
        }

        <main className={`flex-1 flex flex-col min-h-screen main-content ${
          currentPageName === "Admin" ? "admin-page-override" : ""
        }`}>
          <div className={`flex-1 ${!isHomePage ? "pt-16 md:pt-0" : ""} w-full min-w-0 overflow-x-hidden`}>
            {children}
          </div>
        </main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
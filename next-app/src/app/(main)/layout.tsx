"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/components/context/UserContext";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  BookOpen,
  Calculator,
  Settings,
  LogOut,
  User,
  Menu,
  HelpCircle,
  PlayCircle,
  ShieldAlert,
  Clock,
  Lightbulb,
  Palette,
  Building,
  History,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { createPageUrl } from "@/lib/utils";

const navigationItems = [
  { title: "Главная", url: "/home", icon: Home },
  { title: "Чат", url: "/chat", icon: MessageSquare },
  { title: "База знаний", url: "/knowledgebase", icon: BookOpen },
  { title: "Советы", url: "/tips", icon: Lightbulb },
  { title: "Подобрать артикул", url: "/skupicker", icon: Palette },
  { title: "FAQ", url: "/faq", icon: HelpCircle },
  { title: "Видео", url: "/video", icon: PlayCircle },
  { title: "Калькулятор", url: "/calculator", icon: Calculator },
];

const adminItems = [{ title: "Админ-панель", url: "/admin", icon: Settings }];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    user,
    dealerProfile,
    bonusEnabled,
    loading,
    isBlocked,
    needsApproval,
    isAdmin,
    displayName,
    logout,
    login,
  } = useUser();

  // Tier helpers
  const effectiveTier = (() => {
    if (!bonusEnabled || !dealerProfile) return null;
    const now = new Date();
    const manual =
      dealerProfile.manualTierEnabled &&
      dealerProfile.manualTier &&
      (!dealerProfile.manualTierExpiresAt ||
        new Date(dealerProfile.manualTierExpiresAt) > now);
    return manual ? dealerProfile.manualTier : dealerProfile.currentTier;
  })();

  const tierPill = () => {
    if (!bonusEnabled || !dealerProfile || effectiveTier === "TIER4")
      return null;

    const map: Record<string, { label: string; cls: string }> = {
      TIER1: {
        label: "Базовый",
        cls: "bg-slate-100 text-slate-700 border-slate-200",
      },
      TIER2: {
        label: "Серебряный",
        cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
      },
      TIER3: {
        label: "Золотой",
        cls: "bg-amber-100 text-amber-800 border-amber-200",
      },
    };
    const t = map[effectiveTier || "TIER1"] || map.TIER1;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${t.cls} mt-0.5`}
      >
        {t.label}
      </span>
    );
  };

  const tierStatusTextClass = () => {
    if (!bonusEnabled || !dealerProfile) return "text-slate-500";
    switch (effectiveTier) {
      case "TIER4":
        return "text-indigo-700";
      case "TIER3":
        return "text-amber-700";
      case "TIER2":
        return "text-zinc-700";
      default:
        return "text-slate-500";
    }
  };

  const computeTierIconClass = () => {
    if (!bonusEnabled) {
      return "bg-gradient-to-br from-[#0A84FF] to-[#007AFF] ring-2 ring-blue-300/40 shadow-[0_0_18px_rgba(59,130,246,0.25)]";
    }
    switch (effectiveTier) {
      case "TIER4":
        return "bg-gradient-to-br from-indigo-500 to-blue-500 ring-2 ring-indigo-300/60 shadow-[0_0_22px_rgba(99,102,241,0.35)]";
      case "TIER3":
        return "bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-300 ring-2 ring-amber-300/60 shadow-[0_0_22px_rgba(245,158,11,0.35)]";
      case "TIER2":
        return "bg-gradient-to-br from-zinc-200 via-slate-100 to-white ring-2 ring-zinc-300/60 shadow-[0_0_18px_rgba(148,163,184,0.25)]";
      default:
        return "bg-gradient-to-br from-slate-200 to-slate-300 ring-2 ring-slate-300/60 shadow-[0_0_16px_rgba(100,116,139,0.25)]";
    }
  };

  const chatIconBg = computeTierIconClass();
  const isActiveUrl = (url: string) => pathname === url;

  // Prefetch critical pages for faster navigation
  useEffect(() => {
    if (!user) return;
    
    // Prefetch main navigation pages
    const pagesToPrefetch = ['/chat', '/home', '/knowledgebase', '/calculator'];
    pagesToPrefetch.forEach((page) => {
      if (page !== pathname) {
        router.prefetch(page);
      }
    });
  }, [user, pathname, router]);

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
          <p className="text-secondary mb-8">
            Ваш аккаунт был заблокирован администратором.
          </p>
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
          <p className="text-secondary mb-4">
            Ваш аккаунт находится на модерации.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Проверить статус
            </Button>
            <Button onClick={logout} variant="secondary" className="w-full">
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
          <div className="w-16 h-16 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-h1 mb-4">ИИ-Ассистент</h1>
          <p className="text-secondary mb-8">
            Войдите в систему для доступа к чату и базе знаний
          </p>
          <Button onClick={login} className="w-full">
            Войти в систему
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-navbar border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="glass-card-l1 p-2 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 ${chatIconBg} rounded-lg flex items-center justify-center`}
              >
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold">ИИ-Ассистент</h1>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center hover:from-slate-300 hover:to-slate-400 transition-colors">
                <Settings className="w-4 h-4 text-slate-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/account/profile" className="flex items-center gap-2 w-full">
                  <User className="w-4 h-4" />
                  Личные данные
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/legal" className="flex items-center gap-2 w-full">
                  <Building className="w-4 h-4" />
                  Юр. лица
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/orders" className="flex items-center gap-2 w-full">
                  <History className="w-4 h-4" />
                  История заказов
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white/60 backdrop-blur-xl border-r border-white/20 z-40 transform transition-transform md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 ${chatIconBg} rounded-xl flex items-center justify-center`}
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-slate-900 text-lg font-bold">
                  Floor Service Hub
                </h2>
                <p className={`${tierStatusTextClass()} text-xs`}>
                  {isAdmin
                    ? "Администратор"
                    : user?.userType === "DEALER"
                      ? "Дилер"
                      : user?.userType === "MANAGER"
                        ? "Менеджер"
                        : "Пользователь"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
              Основные
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveUrl(item.url);

              return (
                <Link
                  key={item.title}
                  href={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-white/80 text-slate-900 ring-1 ring-[#007AFF]/25 shadow-md"
                      : "text-slate-800 hover:bg-white/70 hover:shadow-md"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-[#007AFF]" : "text-slate-700"}`}
                  />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mt-4">
                  Администрирование
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveUrl(item.url);

                  return (
                    <Link
                      key={item.title}
                      href={item.url}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-white/80 text-slate-900 ring-1 ring-[#007AFF]/25 shadow-md"
                          : "text-slate-800 hover:bg-white/70 hover:shadow-md"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isActive ? "text-[#007AFF]" : "text-slate-700"}`}
                      />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/20 p-6 pb-24 md:pb-6">
            <div className="flex items-center justify-between p-2 rounded-xl">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-8 h-8 ${chatIconBg} rounded-full flex items-center justify-center`}
                >
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {displayName}
                  </p>
                  {tierPill()}
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email || "email не указан"}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/account/profile"
                        className="flex items-center gap-2 w-full"
                      >
                        <User className="w-4 h-4" />
                        Личные данные
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/account/legal"
                        className="flex items-center gap-2 w-full"
                      >
                        <Building className="w-4 h-4" />
                        Юр. лица
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/account/orders"
                        className="flex items-center gap-2 w-full"
                      >
                        <History className="w-4 h-4" />
                        История заказов
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 min-h-screen pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}

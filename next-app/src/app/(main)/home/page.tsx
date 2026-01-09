"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { api } from "@/lib/api";
import { useUser } from "@/components/context/UserContext";
import {
  MessageSquare,
  BookOpen,
  Lightbulb,
  Calculator,
  Palette,
  HelpCircle,
  PlayCircle,
  UserCog,
} from "lucide-react";

interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string;
  mediaType: string;
  mediaUrl?: string;
  overlayGradient?: string;
  ctaPrimary?: {
    label?: string;
    href?: string;
    isExternal?: boolean;
  };
  ctaSecondary?: {
    label?: string;
    href?: string;
    isExternal?: boolean;
  };
}

function Banner({ data }: { data: HomeBanner }) {
  const {
    title,
    subtitle,
    mediaType,
    mediaUrl,
    overlayGradient,
    ctaPrimary,
    ctaSecondary,
  } = data;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-xl border border-white/20 mb-6 md:mb-8">
      <div className="relative h-[220px] md:h-[320px] w-full">
        {mediaType === "image" && mediaUrl && (
          <Image
            src={mediaUrl}
            alt={title || "Banner"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
            unoptimized
          />
        )}
        {mediaType === "video" && mediaUrl && (
          <video
            src={mediaUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              overlayGradient ||
              "linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.35) 100%)",
          }}
        />

        <div className="relative z-10 h-full w-full p-6 md:p-10 flex flex-col justify-end text-white">
          <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
          {subtitle && (
            <p className="text-sm md:text-base text-white/85 max-w-3xl mt-2">
              {subtitle}
            </p>
          )}
          <div className="flex gap-3 flex-wrap mt-4">
            {ctaPrimary?.label && ctaPrimary?.href && (
              <Button
                className="rounded-xl bg-white text-slate-900 hover:bg-white/90"
                asChild
              >
                {ctaPrimary.isExternal ? (
                  <a
                    href={ctaPrimary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ctaPrimary.label}
                  </a>
                ) : (
                  <Link href={ctaPrimary.href}>{ctaPrimary.label}</Link>
                )}
              </Button>
            )}
            {ctaSecondary?.label && ctaSecondary?.href && (
              <Button
                variant="secondary"
                className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/15"
                asChild
              >
                {ctaSecondary.isExternal ? (
                  <a
                    href={ctaSecondary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ctaSecondary.label}
                  </a>
                ) : (
                  <Link href={ctaSecondary.href}>{ctaSecondary.label}</Link>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const getTierInfo = (tier: string) => {
    switch (tier) {
      case "tier4":
        return {
          name: "Платиновый",
          color: "bg-gradient-to-r from-indigo-500 to-purple-500",
        };
      case "tier3":
        return {
          name: "Золотой",
          color: "bg-gradient-to-r from-amber-400 to-yellow-500",
        };
      case "tier2":
        return {
          name: "Серебряный",
          color: "bg-gradient-to-r from-gray-400 to-slate-500",
        };
      default:
        return {
          name: "Бронзовый",
          color: "bg-gradient-to-r from-orange-400 to-amber-600",
        };
    }
  };

  const tierInfo = getTierInfo(tier);

  return <Badge className={`${tierInfo.color} text-white`}>{tierInfo.name}</Badge>;
}

interface TileProps {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}

function Tile({ title, desc, icon: Icon, to }: TileProps) {
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link href={to} className="block focus:outline-none">
        <Card className="group relative overflow-hidden bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl p-2 bg-white/70 backdrop-blur-sm border border-white/40">
                <Icon className="h-6 w-6 text-[#0A84FF]" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 truncate">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{desc}</p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    className="rounded-lg bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:from-[#0A84FF] hover:to-[#0a6cff] text-white"
                  >
                    Открыть
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function HomeSplashPage() {
  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const { user, dealerProfile, bonusEnabled, effectiveTier } = useUser();

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    try {
      const banners = await api.getHomeBanners();
      const now = new Date();
      const pick =
        (banners || [])
          .filter((b: HomeBanner & { startAt?: string; endAt?: string; isActive?: boolean }) => {
            if (!b.isActive) return false;
            const startOk = !b.startAt || new Date(b.startAt) <= now;
            const endOk = !b.endAt || new Date(b.endAt) >= now;
            return startOk && endOk;
          })
          .sort((a: HomeBanner & { priority?: number }, b: HomeBanner & { priority?: number }) => (b.priority ?? 0) - (a.priority ?? 0))[0] || null;

      setBanner(pick);
    } catch (error) {
      console.error("Error loading banner:", error);
    }
  };

  const tiles: TileProps[] = [
    {
      title: "ИИ‑Чат",
      desc: "Задайте вопрос с учётом базы знаний",
      icon: MessageSquare,
      to: "/chat",
    },
    {
      title: "База знаний",
      desc: "Документы, ссылки и материалы",
      icon: BookOpen,
      to: "/knowledgebase",
    },
    {
      title: "Советы",
      desc: "Статьи и чек‑листы по категориям",
      icon: Lightbulb,
      to: "/tips",
    },
    {
      title: "Калькулятор",
      desc: "Быстрые расчёты по товарам",
      icon: Calculator,
      to: "/calculator",
    },
    {
      title: "Подобрать артикул",
      desc: "Поиск по фото/цвету",
      icon: Palette,
      to: "/skupicker",
    },
    {
      title: "FAQ",
      desc: "Ответы на частые вопросы",
      icon: HelpCircle,
      to: "/faq",
    },
    {
      title: "Видео",
      desc: "Инструкции и обзоры",
      icon: PlayCircle,
      to: "/video",
    },
    {
      title: "Личный кабинет",
      desc: "Данные и настройки",
      icon: UserCog,
      to: "/account/profile",
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 md:px-6 py-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Hero / приветствие */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A84FF] via-[#2a7dff] to-[#6e7dff] text-white p-8 md:p-12 shadow-lg mt-6 md:mt-10 mb-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold">
              {user?.fullName
                ? `Добро пожаловать, ${user.fullName}!`
                : "Добро пожаловать, Floor Service!"}
            </h1>

            {user?.userType === "DEALER" && dealerProfile && bonusEnabled && (
              <div className="mt-3">
                <TierBadge tier={effectiveTier || "tier1"} />
              </div>
            )}

            <p className="mt-2 text-white/90">
              Быстрый доступ к чат‑ассистенту, базе знаний, советам и
              инструментам
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="bg-white text-slate-900 hover:bg-white/90 rounded-xl"
                asChild
              >
                <Link href="/chat">Открыть чат</Link>
              </Button>
              <Button
                variant="secondary"
                className="bg-white/10 border-white/20 text-white rounded-xl"
                asChild
              >
                <Link href="/knowledgebase">Перейти в знания</Link>
              </Button>
            </div>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-30 bg-[radial-gradient(600px_300px_at_100%_0%,white,transparent)]" />
        </div>

        {/* Динамический баннер из админки */}
        {banner && <Banner data={banner} />}

        {/* Сетка карточек */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.06 },
            },
          }}
        >
          {tiles.map((t) => (
            <motion.div
              key={t.title}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Tile {...t} />
            </motion.div>
          ))}
        </motion.div>

        {/* Быстрые действия */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/tips">Новый совет</Link>
          </Button>
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/knowledgebase">Найти документ</Link>
          </Button>
          <Button
            className="rounded-lg bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:from-[#0A84FF] hover:to-[#0a6cff]"
            asChild
          >
            <Link href="/chat">Новый расчёт в чате</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

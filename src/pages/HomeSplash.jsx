
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HomeBanner } from "@/entities/HomeBanner";
import { User } from "@/entities/User";
import { BonusSettings } from "@/entities/BonusSettings";
import { DealerProfile } from "@/entities/DealerProfile";
import TierBadge from "@/components/dealers/TierBadge";
import { preloadImage } from "@/components/utils/imageCache";
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

function Banner({ data }) {
  if (!data) return null;
  const { title, subtitle, mediaType, mediaUrl, overlayGradient, ctaPrimary, ctaSecondary } = data;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-xl border border-white/20 mb-6 md:mb-8">
      {/* Медиа фон */}
      <div className="relative h-[220px] md:h-[320px] w-full">
        {mediaType === "image" && mediaUrl && (
          <img
            src={mediaUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
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
        {/* Оверлей */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              overlayGradient ||
              "linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.35) 100%)",
          }}
        />
        {/* Убрали синюю верхнюю полоску */}

        {/* Контент */}
        <div className="relative z-10 h-full w-full p-6 md:p-10 flex flex-col justify-end text-white">
          <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
          {subtitle && (
            <p className="text-sm md:text-base text-white/85 max-w-3xl mt-2">{subtitle}</p>
          )}
          <div className="flex gap-3 flex-wrap mt-4">
            {ctaPrimary?.label && ctaPrimary?.href && (
              ctaPrimary.isExternal ? (
                <Button className="rounded-xl bg-white text-slate-900 hover:bg-white/90" asChild>
                  <a href={ctaPrimary.href} target="_blank" rel="noopener noreferrer">
                    {ctaPrimary.label}
                  </a>
                </Button>
              ) : (
                <Button className="rounded-xl bg-white text-slate-900 hover:bg-white/90" asChild>
                  <Link to={ctaPrimary.href.startsWith("/") ? ctaPrimary.href : createPageUrl(ctaPrimary.href)}>
                    {ctaPrimary.label}
                  </Link>
                </Button>
              )
            )}
            {ctaSecondary?.label && ctaSecondary?.href && (
              ctaSecondary.isExternal ? (
                <Button
                  variant="secondary"
                  className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/15"
                  asChild
                >
                  <a href={ctaSecondary.href} target="_blank" rel="noopener noreferrer">
                    {ctaSecondary.label}
                  </a>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/15"
                  asChild
                >
                  <Link to={ctaSecondary.href.startsWith("/") ? ctaSecondary.href : createPageUrl(ctaSecondary.href)}>
                    {ctaSecondary.label}
                  </Link>
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ title, desc, icon: Icon, to }) {
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link to={to} className="block focus:outline-none">
        <Card className="group relative overflow-hidden glass-card-l1 rounded-2xl transition-all duration-300">
          {/* Убрали синюю верхнюю полоску */}
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl p-2 bg-white/70 backdrop-blur-sm border border-white/40">
                <Icon className="h-6 w-6 text-[#0A84FF]" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 truncate">{title}</h3>
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

export default function HomeSplash() {
  const [banner, setBanner] = useState(null);
  const [user, setUser] = useState(null);
  const [dealerProfile, setDealerProfile] = useState(null);
  const [bonusEnabled, setBonusEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Пользователь (для приветствия)
      try {
        const me = await User.me();
        setUser(me);

        // Если дилер — подтягиваем профиль и статус
        if (me?.user_type === 'dealer') {
          const prof = await DealerProfile.filter({ user_id: me.id });
          setDealerProfile(prof[0] || null);
        } else {
          setDealerProfile(null);
        }

        // NEW: подтягиваем глобальный переключатель бонусной программы
        const bs = await BonusSettings.list();
        setBonusEnabled(bs[0]?.enabled !== false);
      } catch (_) {
        setUser(null);
        setDealerProfile(null);
        setBonusEnabled(true); // по умолчанию показываем, если не удалось загрузить
      }

      // Баннер: активный по времени и isActive=true, с наибольшим приоритетом
      const all = await HomeBanner.filter({ isActive: true }, "-updated_date", 25);
      const now = new Date();
      const pick = (all || [])
        .filter(b => {
          const startOk = !b.startAt || new Date(b.startAt) <= now;
          const endOk = !b.endAt || new Date(b.endAt) >= now;
          return startOk && endOk;
        })
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] || null;

      setBanner(pick);
    };
    load();
  }, []);

  // Prefetch active banners media to speed up first paint
  useEffect(() => {
    (async () => {
      const active = await HomeBanner.filter({ isActive: true }, "-priority", 5);
      active.forEach(b => {
        if (b.mediaUrl && b.mediaType === "image") preloadImage(b.mediaUrl);
      });
    })();
  }, []);

  const tiles = [
    {
      title: "ИИ‑Чат",
      desc: "Задайте вопрос с учётом базы знаний",
      icon: MessageSquare,
      to: createPageUrl("Chat"),
    },
    {
      title: "База знаний",
      desc: "Документы, ссылки и материалы",
      icon: BookOpen,
      to: createPageUrl("KnowledgeBase"),
    },
    {
      title: "Советы",
      desc: "Статьи и чек‑листы по категориям",
      icon: Lightbulb,
      to: createPageUrl("Tips"),
    },
    {
      title: "Калькулятор",
      desc: "Быстрые расчёты по товарам",
      icon: Calculator,
      to: createPageUrl("Calculator"),
    },
    {
      title: "Подобрать артикул",
      desc: "Поиск по фото/цвету",
      icon: Palette,
      to: createPageUrl("SkuPicker"),
    },
    {
      title: "FAQ",
      desc: "Ответы на частые вопросы",
      icon: HelpCircle,
      to: createPageUrl("FAQ"),
    },
    {
      title: "Видео",
      desc: "Инструкции и обзоры",
      icon: PlayCircle,
      to: createPageUrl("Video"),
    },
    {
      title: "Личный кабинет",
      desc: "Данные и настройки",
      icon: UserCog,
      to: createPageUrl("AccountProfile"),
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 md:px-6 py-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Hero / приветствие */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A84FF] via-[#2a7dff] to-[#6e7dff] text-white p-8 md:p-12 shadow-lg mt-6 md:mt-10 mb-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold">
              {user?.full_name ? `Добро пожаловать, ${user.full_name}!` : "Добро пожаловать, Floor Service!"}
            </h1>

            {/* Бейдж статуса дилера прямо в приветствии */}
            {user?.user_type === 'dealer' && dealerProfile && bonusEnabled && (
              <div className="mt-3">
                <TierBadge tier={(dealerProfile.manual_tier_enabled && (!dealerProfile.manual_tier_expires_at || new Date(dealerProfile.manual_tier_expires_at) > new Date())) ? dealerProfile.manual_tier : (dealerProfile.current_tier || "tier1")} animated />
              </div>
            )}

            <p className="mt-2 text-white/90">
              Быстрый доступ к чат‑ассистенту, базе знаний, советам и инструментам
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="bg-white text-slate-900 hover:bg-white/90 rounded-xl"
                asChild
              >
                <Link to={createPageUrl("Chat")}>Открыть чат</Link>
              </Button>
              <Button
                variant="secondary"
                className="bg-white/10 border-white/20 text-white rounded-xl"
                asChild
              >
                <Link to={createPageUrl("KnowledgeBase")}>Перейти в знания</Link>
              </Button>
            </div>
          </div>
          {/* Лёгкая подсветка справа */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-30 bg-[radial-gradient(600px_300px_at_100%_0%,white,transparent)]" />
        </div>

        {/* Динамический баннер из админки */}
        {banner && <Banner data={banner} />}

        {/* Сетка карточек в едином стиле (стекло + синяя полоска) */}
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
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            >
              <Tile {...t} />
            </motion.div>
          ))}
        </motion.div>

        {/* Быстрые действия */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-lg">
            Новый совет
          </Button>
          <Button variant="outline" className="rounded-lg">
            Найти документ
          </Button>
          <Button className="rounded-lg bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:from-[#0A84FF] hover:to-[#0a6cff]">
            Новый расчёт в чате
          </Button>
        </div>
      </div>
    </section>
  );
}

import { PrismaClient, UserRole, UserType, DealerTier } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@floorservice.ru" },
    update: {},
    create: {
      email: "admin@floorservice.ru",
      password: adminPassword,
      displayName: "Администратор",
      fullName: "Администратор системы",
      role: UserRole.ADMIN,
      userType: UserType.USER,
      isApproved: true,
      isBlocked: false,
    },
  });
  console.log("Created admin user:", admin.email);

  // Create a demo dealer user
  const dealerPassword = await hash("dealer123", 12);
  const dealer = await prisma.user.upsert({
    where: { email: "dealer@example.com" },
    update: {},
    create: {
      email: "dealer@example.com",
      password: dealerPassword,
      displayName: "Демо Дилер",
      fullName: "Иван Иванов",
      phone: "+7 (999) 123-45-67",
      city: "Москва",
      retailPoint: "Магазин напольных покрытий",
      role: UserRole.USER,
      userType: UserType.DEALER,
      isApproved: true,
      isBlocked: false,
    },
  });
  console.log("Created dealer user:", dealer.email);

  // Create dealer profile for the dealer
  await prisma.dealerProfile.upsert({
    where: { userId: dealer.id },
    update: {},
    create: {
      userId: dealer.id,
      companyName: "ООО Напольные покрытия",
      region: "Москва",
      currentTier: DealerTier.TIER2,
      autoTier: DealerTier.TIER2,
      pointsBalance: 5000,
      monthlyTurnover: 750000,
      lastMonthTurnover: 600000,
      ordersCountMonth: 15,
    },
  });
  console.log("Created dealer profile");

  // Create bonus settings
  await prisma.bonusSettings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      enabled: true,
      tier1Threshold: 0,
      tier2Threshold: 500000,
      tier3Threshold: 1000000,
      tier4Threshold: 3000000,
      tier1Name: "Базовый",
      tier2Name: "Серебряный",
      tier3Name: "Золотой",
      tier4Name: "Платиновый",
    },
  });
  console.log("Created bonus settings");

  // Create AI settings
  await prisma.aISettings.upsert({
    where: { id: "default-ai-settings" },
    update: {},
    create: {
      id: "default-ai-settings",
      systemPrompt: `Вы - полезный ИИ-ассистент компании Floor Service. 
Ваша задача - помогать пользователям с вопросами о напольных покрытиях, ценах, наличии товаров и технической информации.
Отвечайте на русском языке, будьте вежливы и профессиональны.
Если не знаете ответа, честно скажите об этом и предложите связаться с менеджером.`,
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 2048,
      welcomeMessage: "Здравствуйте! Я ИИ-ассистент Floor Service. Чем могу помочь?",
    },
  });
  console.log("Created AI settings");

  // Create sample FAQ category
  const faqCategory = await prisma.fAQCategory.upsert({
    where: { id: "general-faq" },
    update: {},
    create: {
      id: "general-faq",
      name: "Общие вопросы",
      description: "Часто задаваемые вопросы о наших услугах",
      order: 0,
    },
  });
  console.log("Created FAQ category");

  // Create sample FAQs
  const faqs = [
    {
      question: "Как рассчитать количество напольного покрытия?",
      answer:
        "Для расчета необходимого количества материала измерьте площадь помещения (длина × ширина) и добавьте запас 5-15% в зависимости от способа укладки. Используйте наш калькулятор для точного расчета.",
    },
    {
      question: "Какие способы оплаты вы принимаете?",
      answer:
        "Мы принимаем оплату банковскими картами, безналичным переводом для юридических лиц, а также наличными при самовывозе.",
    },
    {
      question: "Есть ли у вас доставка?",
      answer:
        "Да, мы осуществляем доставку по всей России. Стоимость и сроки доставки зависят от региона и объема заказа. Свяжитесь с менеджером для уточнения деталей.",
    },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: {
        categoryId: faqCategory.id,
        question: faq.question,
        answer: faq.answer,
        order: faqs.indexOf(faq),
        isActive: true,
      },
    });
  }
  console.log("Created sample FAQs");

  // Create sample knowledge base items
  const kbItems = [
    {
      title: "Каталог продукции 2024",
      description: "Полный каталог напольных покрытий на текущий год",
      type: "YANDEX_DISK" as const,
      url: "https://disk.yandex.ru/d/example",
      isPublic: true,
      isAiSource: true,
      categories: ["Каталоги", "Документация"],
    },
    {
      title: "Инструкция по укладке ламината",
      description:
        "Подробная инструкция по правильной укладке ламината различных видов",
      content: `
# Инструкция по укладке ламината

## Подготовка основания
- Основание должно быть ровным, сухим и чистым
- Максимальный перепад высот - 2 мм на 2 метра
- Влажность стяжки не более 2%

## Укладка подложки
- Раскатайте подложку по всей площади помещения
- Стыки подложки проклейте скотчем
- Подложка должна заходить на стены на 2-3 см

## Укладка ламината
1. Начинайте укладку от окна
2. Оставляйте зазор 8-10 мм от стен
3. Смещение стыков между рядами - не менее 30 см
      `,
      type: "DOCUMENT" as const,
      isPublic: true,
      isAiSource: true,
      categories: ["Инструкции", "Ламинат"],
    },
  ];

  for (const item of kbItems) {
    await prisma.knowledgeBase.create({
      data: item,
    });
  }
  console.log("Created sample knowledge base items");

  // Create home banner
  await prisma.homeBanner.upsert({
    where: { id: "default-banner" },
    update: {},
    create: {
      id: "default-banner",
      isActive: true,
      priority: 1,
      mediaType: "IMAGE",
      mediaUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920",
      title: "Floor Service Hub",
      subtitle: "Ваш умный помощник в мире напольных покрытий",
      ctaPrimary: { text: "Начать чат", url: "/chat" },
      ctaSecondary: { text: "База знаний", url: "/knowledgebase" },
    },
  });
  console.log("Created home banner");

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

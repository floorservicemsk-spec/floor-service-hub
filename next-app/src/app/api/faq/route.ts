import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


// Simple in-memory cache for FAQ
let faqCache: { data: unknown; timestamp: number } | null = null;
const FAQ_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    
    // Check cache
    if (faqCache && now - faqCache.timestamp < FAQ_CACHE_TTL) {
      return NextResponse.json(faqCache.data);
    }

    const faqs = await (await getPrisma()).fAQ.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        question: true,
        answer: true,
        categoryId: true,
        keywords: true,
        order: true,
      },
    });

    const result = faqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      categoryId: faq.categoryId,
      keywords: faq.keywords,
      order: faq.order,
    }));

    // Update cache
    faqCache = { data: result, timestamp: now };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json({ message: "Error fetching FAQs" }, { status: 500 });
  }
}

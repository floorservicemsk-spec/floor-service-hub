import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { aiResponseCache, COMMON_QUESTIONS } from "@/lib/ai-cache";
import { withCache, knowledgeBaseCache, aiSettingsCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


/**
 * Cache warming endpoint
 * Preloads frequently used data into cache
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const results: Record<string, unknown> = {};
    const startTime = Date.now();

    // 1. Warm AI response cache with common questions
    aiResponseCache.preWarm(COMMON_QUESTIONS);
    results.aiCache = {
      preWarmed: COMMON_QUESTIONS.length,
      stats: aiResponseCache.getStats(),
    };

    // 2. Warm knowledge base cache
    const knowledgeItems = await withCache(
      knowledgeBaseCache,
      "ai-sources",
      async () => (await getPrisma()).knowledgeBase.findMany({ where: { isAiSource: true } }),
      10 * 60 * 1000 // 10 minutes
    );
    results.knowledgeBase = { itemsLoaded: knowledgeItems.length };

    // 3. Warm XML feed cache
    const xmlFeeds = await withCache(
      knowledgeBaseCache,
      "xml-feeds",
      async () => (await getPrisma()).knowledgeBase.findMany({ where: { type: "XML_FEED" } }),
      10 * 60 * 1000
    );
    
    // Count total products
    let totalProducts = 0;
    for (const feed of xmlFeeds) {
      const xmlData = feed.xmlData as { products?: unknown[] } | null;
      if (xmlData?.products) {
        totalProducts += xmlData.products.length;
      }
    }
    results.xmlFeeds = { feedsLoaded: xmlFeeds.length, totalProducts };

    // 4. Warm AI settings cache
    const settings = await withCache(
      aiSettingsCache,
      "ai-settings",
      async () => (await getPrisma()).aISettings.findFirst(),
      5 * 60 * 1000
    );
    results.aiSettings = { loaded: !!settings };

    // 5. Warm FAQ cache
    const faqs = await (await getPrisma()).fAQ.findMany({
      where: { isPublished: true },
      take: 50,
    });
    results.faqs = { loaded: faqs.length };

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      warmedAt: new Date().toISOString(),
      duration: `${totalTime}ms`,
      results,
    });
  } catch (error) {
    console.error("Cache warming error:", error);
    return NextResponse.json(
      { message: "Error warming cache" },
      { status: 500 }
    );
  }
}

/**
 * Get cache stats
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      aiResponseCache: aiResponseCache.getStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return NextResponse.json(
      { message: "Error getting stats" },
      { status: 500 }
    );
  }
}

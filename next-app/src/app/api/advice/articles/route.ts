import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


// Simple in-memory cache for articles
let articlesCache: { data: unknown; timestamp: number } | null = null;
const ARTICLES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    
    // Check cache
    if (articlesCache && now - articlesCache.timestamp < ARTICLES_CACHE_TTL) {
      return NextResponse.json(articlesCache.data);
    }

    const articles = await (await getPrisma()).adviceArticle.findMany({
      where: { 
        status: "PUBLISHED",
        isPublic: true,
      },
      orderBy: { publishAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        type: true,
        categoryIds: true,
        allowedUserTypes: true,
        status: true,
        coverMedia: {
          select: {
            url: true,
          },
        },
      },
    });

    const result = articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      type: article.type,
      coverUrl: article.coverMedia?.url,
      categoryIds: article.categoryIds,
      allowedUserTypes: article.allowedUserTypes,
      status: article.status,
    }));

    // Update cache
    articlesCache = { data: result, timestamp: now };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching advice articles:", error);
    return NextResponse.json({ message: "Error fetching articles" }, { status: 500 });
  }
}

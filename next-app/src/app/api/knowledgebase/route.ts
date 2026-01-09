import { NextRequest, NextResponse } from "next/server";
import { KnowledgeType } from "@prisma/client";
import { withCache, knowledgeBaseCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isPublic = searchParams.get("isPublic");
    const isAiSource = searchParams.get("isAiSource");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (type) {
      // Convert string to enum
      where.type = type.toUpperCase() as KnowledgeType;
    }

    if (isPublic !== null) {
      where.isPublic = isPublic === "true";
    }

    if (isAiSource !== null) {
      where.isAiSource = isAiSource === "true";
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { articleCode: { contains: search, mode: "insensitive" } },
      ];
    }

    // Use caching for public knowledge base queries (most common)
    const cacheKey = `kb-${type || 'all'}-${isPublic}-${isAiSource}-${search || ''}-${limit || ''}`;
    
    const items = await withCache(
      knowledgeBaseCache,
      cacheKey,
      async () => (await getPrisma()).knowledgeBase.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit ? parseInt(limit) : undefined,
        // Only select needed fields for listing (excludes heavy content/xmlData)
        select: {
          id: true,
          title: true,
          description: true,
          content: true,
          type: true,
          url: true,
          fileUrl: true,
          imageUrl: true,
          categories: true,
          articleCode: true,
          isPublic: true,
          isAiSource: true,
          xmlData: true,
          lastSync: true,
          updatedAt: true,
        },
      }),
      5 * 60 * 1000 // 5 minutes cache
    );

    return NextResponse.json(
      items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        content: item.content,
        type: item.type,
        url: item.url,
        fileUrl: item.fileUrl,
        imageUrl: item.imageUrl,
        categories: item.categories,
        articleCode: item.articleCode,
        isPublic: item.isPublic,
        isAiSource: item.isAiSource,
        xmlData: item.xmlData,
        lastSync: item.lastSync?.toISOString() || null,
        updatedAt: item.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

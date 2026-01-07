import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { KnowledgeType } from "@prisma/client";

export const dynamic = "force-dynamic";

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

    const items = await prisma.knowledgeBase.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });

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

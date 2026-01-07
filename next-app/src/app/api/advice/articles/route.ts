import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const articles = await prisma.adviceArticle.findMany({
      where: { 
        status: "PUBLISHED",
        isPublic: true,
      },
      orderBy: { publishAt: "desc" },
      include: {
        coverMedia: true,
      },
    });

    return NextResponse.json(
      articles.map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        type: article.type,
        coverUrl: article.coverMedia?.url,
        categoryIds: article.categoryIds,
        allowedUserTypes: article.allowedUserTypes,
        status: article.status,
      }))
    );
  } catch (error) {
    console.error("Error fetching advice articles:", error);
    return NextResponse.json({ message: "Error fetching articles" }, { status: 500 });
  }
}

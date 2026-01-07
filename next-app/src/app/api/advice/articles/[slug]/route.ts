import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const article = await prisma.adviceArticle.findFirst({
      where: { slug: decodeURIComponent(slug) },
      include: {
        coverMedia: true,
      },
    });

    if (!article) {
      return NextResponse.json({ message: "Article not found" }, { status: 404 });
    }

    // Get attachments if any
    let attachments: Array<{ id: string; title: string | null; url: string }> = [];
    if (article.attachmentIds && article.attachmentIds.length > 0) {
      const media = await prisma.adviceMedia.findMany({
        where: { id: { in: article.attachmentIds } },
      });
      attachments = media.map((m) => ({
        id: m.id,
        title: m.title,
        url: m.url,
      }));
    }

    return NextResponse.json({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      html: article.html,
      type: article.type,
      coverUrl: article.coverMedia?.url,
      checklist: article.checklist as Array<{
        title: string;
        description?: string;
        isRequired?: boolean;
        order?: number;
      }> | null,
      attachments,
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json({ message: "Error fetching article" }, { status: 500 });
  }
}

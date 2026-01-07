import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const items = await prisma.knowledgeBase.findMany({
      orderBy: { createdAt: "desc" },
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
        lastSync: item.lastSync?.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return NextResponse.json({ message: "Error fetching data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      content,
      type,
      url,
      fileUrl,
      imageUrl,
      categories,
      articleCode,
      isPublic,
      isAiSource,
    } = body;

    const item = await prisma.knowledgeBase.create({
      data: {
        title,
        description,
        content,
        type: type || "DOCUMENT",
        url,
        fileUrl,
        imageUrl,
        categories: categories || [],
        articleCode,
        isPublic: isPublic ?? true,
        isAiSource: isAiSource ?? false,
      },
    });

    return NextResponse.json({ id: item.id });
  } catch (error) {
    console.error("Error creating knowledge base item:", error);
    return NextResponse.json({ message: "Error creating item" }, { status: 500 });
  }
}

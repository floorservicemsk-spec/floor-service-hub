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

    const [articles, categories] = await Promise.all([
      prisma.adviceArticle.findMany({
        orderBy: { updatedAt: "desc" },
      }),
      prisma.adviceCategory.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        type: a.type,
        status: a.status,
        isPublic: a.isPublic,
        categoryIds: a.categoryIds,
        allowedUserTypes: a.allowedUserTypes,
        html: a.html,
        checklist: a.checklist,
        coverMediaId: a.coverMediaId,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
    });
  } catch (error) {
    console.error("Error fetching advice:", error);
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

    const article = await prisma.adviceArticle.create({
      data: {
        title: body.title,
        slug: body.slug,
        summary: body.summary,
        content: body.html || body.content || "",
        html: body.html,
        type: body.type || "article",
        status: body.status || "draft",
        isPublic: body.isPublic ?? true,
        categoryIds: body.categoryIds || [],
        allowedUserTypes: body.allowedUserTypes || [],
        checklist: body.checklist,
        coverMediaId: body.coverMediaId,
      },
    });

    return NextResponse.json({ id: article.id });
  } catch (error) {
    console.error("Error creating advice article:", error);
    return NextResponse.json({ message: "Error creating article" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    await prisma.adviceArticle.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        content: data.html || data.content,
        html: data.html,
        type: data.type,
        status: data.status,
        isPublic: data.isPublic,
        categoryIds: data.categoryIds,
        allowedUserTypes: data.allowedUserTypes,
        checklist: data.checklist,
        coverMediaId: data.coverMediaId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating advice article:", error);
    return NextResponse.json({ message: "Error updating article" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID required" }, { status: 400 });
    }

    await prisma.adviceArticle.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting advice article:", error);
    return NextResponse.json({ message: "Error deleting article" }, { status: 500 });
  }
}

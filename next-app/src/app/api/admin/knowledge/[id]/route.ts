import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await prisma.knowledgeBase.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        content: body.content,
        type: body.type,
        url: body.url,
        fileUrl: body.fileUrl,
        imageUrl: body.imageUrl,
        categories: body.categories,
        articleCode: body.articleCode,
        isPublic: body.isPublic,
        isAiSource: body.isAiSource,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating knowledge base item:", error);
    return NextResponse.json({ message: "Error updating item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.knowledgeBase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge base item:", error);
    return NextResponse.json({ message: "Error deleting item" }, { status: 500 });
  }
}

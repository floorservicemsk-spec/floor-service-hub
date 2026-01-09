import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


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

    await (await getPrisma()).knowledgeBase.update({
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

    await (await getPrisma()).knowledgeBase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge base item:", error);
    return NextResponse.json({ message: "Error deleting item" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const [videos, categories] = await Promise.all([
      (await getPrisma()).video.findMany({ orderBy: { order: "asc" } }),
      (await getPrisma()).videoCategory.findMany({ orderBy: { order: "asc" } }),
    ]);

    return NextResponse.json({
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        url: v.url,
        embedUrl: v.embedUrl,
        platform: v.platform,
        thumbnailUrl: v.thumbnailUrl,
        categoryId: v.categoryId,
        order: v.order,
        isActive: v.isActive,
        isPublished: v.isPublished,
        allowedUserTypes: v.allowedUserTypes,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        order: c.order,
        isActive: c.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
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

    const video = await (await getPrisma()).video.create({
      data: {
        title: body.title,
        description: body.description,
        url: body.url,
        embedUrl: body.embedUrl,
        platform: body.platform,
        thumbnailUrl: body.thumbnailUrl,
        categoryId: body.categoryId,
        order: body.order || 0,
        isPublished: body.isPublished ?? true,
        allowedUserTypes: body.allowedUserTypes || [],
      },
    });

    return NextResponse.json({ id: video.id });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json({ message: "Error creating video" }, { status: 500 });
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

    await (await getPrisma()).video.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json({ message: "Error updating video" }, { status: 500 });
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

    await (await getPrisma()).video.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json({ message: "Error deleting video" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(
      videos.map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        embedUrl: video.embedUrl,
        platform: video.platform,
        categoryId: video.categoryId,
        allowedUserTypes: video.allowedUserTypes,
        order: video.order,
      }))
    );
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json({ message: "Error fetching videos" }, { status: 500 });
  }
}

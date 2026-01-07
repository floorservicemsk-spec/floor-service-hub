import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const banners = await prisma.homeBanner.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    });

    return NextResponse.json(
      banners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        mediaType: banner.mediaType,
        mediaUrl: banner.mediaUrl,
        overlayGradient: banner.overlayGradient,
        isActive: banner.isActive,
        startAt: banner.startAt?.toISOString(),
        endAt: banner.endAt?.toISOString(),
        priority: banner.priority,
        ctaPrimary: banner.ctaPrimary as {
          label?: string;
          href?: string;
          isExternal?: boolean;
        } | null,
        ctaSecondary: banner.ctaSecondary as {
          label?: string;
          href?: string;
          isExternal?: boolean;
        } | null,
      }))
    );
  } catch (error) {
    console.error("Error fetching home banners:", error);
    return NextResponse.json({ message: "Error fetching banners" }, { status: 500 });
  }
}

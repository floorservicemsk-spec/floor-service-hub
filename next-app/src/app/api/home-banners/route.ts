import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Simple in-memory cache for banners
let bannerCache: { data: unknown; timestamp: number } | null = null;
const BANNER_CACHE_TTL = 60 * 1000; // 1 minute

export async function GET() {
  try {
    const now = Date.now();
    
    // Check cache
    if (bannerCache && now - bannerCache.timestamp < BANNER_CACHE_TTL) {
      return NextResponse.json(bannerCache.data);
    }

    const banners = await prisma.homeBanner.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    });

    const result = banners.map((banner) => ({
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
    }));

    // Update cache
    bannerCache = { data: result, timestamp: now };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching home banners:", error);
    return NextResponse.json({ message: "Error fetching banners" }, { status: 500 });
  }
}

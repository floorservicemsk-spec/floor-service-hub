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

    const banners = await (await getPrisma()).homeBanner.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      banners.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        mediaType: b.mediaType,
        mediaUrl: b.mediaUrl,
        overlayGradient: b.overlayGradient,
        ctaPrimary: b.ctaPrimary,
        ctaSecondary: b.ctaSecondary,
        isActive: b.isActive,
        startAt: b.startAt?.toISOString(),
        endAt: b.endAt?.toISOString(),
        priority: b.priority,
      }))
    );
  } catch (error) {
    console.error("Error fetching banners:", error);
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

    const banner = await (await getPrisma()).homeBanner.create({
      data: {
        title: body.title,
        subtitle: body.subtitle,
        mediaType: body.mediaType || "none",
        mediaUrl: body.mediaUrl,
        overlayGradient: body.overlayGradient,
        ctaPrimary: body.ctaPrimary || {},
        ctaSecondary: body.ctaSecondary || {},
        isActive: body.isActive ?? true,
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
        priority: body.priority || 0,
      },
    });

    return NextResponse.json({ id: banner.id });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json({ message: "Error creating banner" }, { status: 500 });
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

    await (await getPrisma()).homeBanner.update({
      where: { id },
      data: {
        ...data,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json({ message: "Error updating banner" }, { status: 500 });
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

    await (await getPrisma()).homeBanner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json({ message: "Error deleting banner" }, { status: 500 });
  }
}

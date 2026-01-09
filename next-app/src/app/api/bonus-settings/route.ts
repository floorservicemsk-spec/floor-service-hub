import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function GET() {
  try {
    const settings = await (await getPrisma()).bonusSettings.findMany({
      take: 1,
    });

    return NextResponse.json(
      settings.map((s) => ({
        id: s.id,
        enabled: s.enabled,
      }))
    );
  } catch (error) {
    console.error("Error fetching bonus settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

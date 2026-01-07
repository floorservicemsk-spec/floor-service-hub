import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.bonusSettings.findMany({
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

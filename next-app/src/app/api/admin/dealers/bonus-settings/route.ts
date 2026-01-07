import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { enabled } = body;

    let settings = await prisma.bonusSettings.findFirst();

    if (settings) {
      await prisma.bonusSettings.update({
        where: { id: settings.id },
        data: { enabled },
      });
    } else {
      settings = await prisma.bonusSettings.create({
        data: { enabled },
      });
    }

    return NextResponse.json({ success: true, id: settings.id });
  } catch (error) {
    console.error("Error updating bonus settings:", error);
    return NextResponse.json({ message: "Error updating settings" }, { status: 500 });
  }
}

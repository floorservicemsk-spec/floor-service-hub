import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const sessions = await prisma.chatSession.findMany({
      orderBy: { lastActivity: "desc" },
      take: 100,
    });

    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        userEmail: s.userEmail,
        messages: s.messages,
        lastActivity: s.lastActivity.toISOString(),
        isActive: s.isActive,
      }))
    );
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json({ message: "Error fetching data" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
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

    const sessions = await (await getPrisma()).chatSession.findMany({
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

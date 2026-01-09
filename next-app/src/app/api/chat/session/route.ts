import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { message: "sessionId is required" },
        { status: 400 }
      );
    }

    const chatSession = await (await getPrisma()).chatSession.findUnique({
      where: { sessionId },
    });

    if (!chatSession) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: chatSession.id,
      sessionId: chatSession.sessionId,
      messages: chatSession.messages,
      isActive: chatSession.isActive,
      lastActivity: chatSession.lastActivity.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching chat session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { sessionId, messages, userEmail } = body;

    if (!sessionId) {
      return NextResponse.json(
        { message: "sessionId is required" },
        { status: 400 }
      );
    }

    // Check if session exists
    const existingSession = await (await getPrisma()).chatSession.findUnique({
      where: { sessionId },
    });

    let chatSession;

    if (existingSession) {
      // Update existing session
      chatSession = await (await getPrisma()).chatSession.update({
        where: { sessionId },
        data: {
          messages,
          lastActivity: new Date(),
          isActive: true,
        },
      });
    } else {
      // Create new session
      chatSession = await (await getPrisma()).chatSession.create({
        data: {
          sessionId,
          userId: session?.user?.id || null,
          userEmail: userEmail || session?.user?.email || null,
          messages,
          lastActivity: new Date(),
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      id: chatSession.id,
      sessionId: chatSession.sessionId,
      messages: chatSession.messages,
      isActive: chatSession.isActive,
      lastActivity: chatSession.lastActivity.toISOString(),
    });
  } catch (error) {
    console.error("Error saving chat session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

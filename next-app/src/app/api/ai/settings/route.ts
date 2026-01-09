import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function GET() {
  try {
    const settings = await (await getPrisma()).aISettings.findMany({
      take: 1,
    });

    return NextResponse.json(
      settings.map((s) => ({
        id: s.id,
        systemPrompt: s.systemPrompt,
        model: s.model,
        temperature: s.temperature,
        maxTokens: s.maxTokens,
        welcomeMessage: s.welcomeMessage,
      }))
    );
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

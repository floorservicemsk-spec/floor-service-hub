import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.aISettings.findMany({
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

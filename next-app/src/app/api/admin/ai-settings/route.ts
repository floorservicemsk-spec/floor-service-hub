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

    let settings = await (await getPrisma()).aISettings.findFirst();

    // Create default settings if none exist
    if (!settings) {
      settings = await (await getPrisma()).aISettings.create({
        data: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt:
            "Вы - ИИ-ассистент, который помогает пользователям найти информацию в базе знаний компании. Отвечайте дружелюбно и профессионально на русском языке.",
          useOnlyKnowledgeBase: false,
          enableExternalSearch: true,
        },
      });
    }

    // Mask API key for display (show only last 4 chars)
    const maskedApiKey = settings.apiKey
      ? `${"•".repeat(Math.max(0, settings.apiKey.length - 4))}${settings.apiKey.slice(-4)}`
      : null;

    return NextResponse.json({
      id: settings.id,
      provider: settings.provider,
      apiKey: maskedApiKey, // Return masked key
      hasApiKey: !!settings.apiKey, // Flag to show if key exists
      baseUrl: settings.baseUrl,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      systemPrompt: settings.systemPrompt,
      welcomeMessage: settings.welcomeMessage,
      yandexDiskPath: settings.yandexDiskPath,
      useOnlyKnowledgeBase: settings.useOnlyKnowledgeBase,
      enableExternalSearch: settings.enableExternalSearch,
    });
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json({ message: "Error fetching settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, apiKey, ...data } = body;

    // Build update data
    const updateData: Record<string, unknown> = {
      provider: data.provider,
      baseUrl: data.baseUrl,
      model: data.model,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      systemPrompt: data.systemPrompt,
      welcomeMessage: data.welcomeMessage,
      yandexDiskPath: data.yandexDiskPath,
      useOnlyKnowledgeBase: data.useOnlyKnowledgeBase,
      enableExternalSearch: data.enableExternalSearch,
    };

    // Only update API key if a new one is provided (not masked)
    if (apiKey && !apiKey.includes("•")) {
      updateData.apiKey = apiKey;
    }

    await (await getPrisma()).aISettings.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating AI settings:", error);
    return NextResponse.json({ message: "Error updating settings" }, { status: 500 });
  }
}

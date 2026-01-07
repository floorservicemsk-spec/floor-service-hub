import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    let settings = await prisma.aISettings.findFirst();

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.aISettings.create({
        data: {
          model: "gpt-4o-mini",
          temperature: 0.7,
          systemPrompt:
            "Вы - ИИ-ассистент, который помогает пользователям найти информацию в базе знаний компании. Отвечайте дружелюбно и профессионально на русском языке.",
          useOnlyKnowledgeBase: false,
          enableExternalSearch: true,
        },
      });
    }

    return NextResponse.json({
      id: settings.id,
      model: settings.model,
      temperature: settings.temperature,
      systemPrompt: settings.systemPrompt,
      yandexDiskPath: settings.yandexDiskPath,
      welcomeMessage: settings.welcomeMessage,
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
    const { id, ...data } = body;

    await prisma.aISettings.update({
      where: { id },
      data: {
        model: data.model,
        temperature: data.temperature,
        systemPrompt: data.systemPrompt,
        yandexDiskPath: data.yandexDiskPath,
        welcomeMessage: data.welcomeMessage,
        useOnlyKnowledgeBase: data.useOnlyKnowledgeBase,
        enableExternalSearch: data.enableExternalSearch,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating AI settings:", error);
    return NextResponse.json({ message: "Error updating settings" }, { status: 500 });
  }
}

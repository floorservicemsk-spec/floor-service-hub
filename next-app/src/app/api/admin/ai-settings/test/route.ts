import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { testLLMConnection } from "@/lib/llm";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { provider, apiKey, baseUrl, model } = body;

    // If no apiKey provided in request, try to get from DB
    let effectiveApiKey = apiKey;
    if (!effectiveApiKey || effectiveApiKey.includes("•")) {
      const settings = await (await getPrisma()).aISettings.findFirst();
      effectiveApiKey = settings?.apiKey || null;
    }

    if (!effectiveApiKey) {
      return NextResponse.json({
        success: false,
        message: "API ключ не указан",
      });
    }

    const result = await testLLMConnection({
      provider,
      apiKey: effectiveApiKey,
      baseUrl,
      model,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing AI connection:", error);
    return NextResponse.json({
      success: false,
      message: "Ошибка при тестировании подключения",
    });
  }
}

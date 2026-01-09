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

    const [faqs, categories] = await Promise.all([
      (await getPrisma()).fAQ.findMany({ orderBy: { order: "asc" } }),
      (await getPrisma()).fAQCategory.findMany({ orderBy: { order: "asc" } }),
    ]);

    return NextResponse.json({
      faqs: faqs.map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
        categoryId: f.categoryId,
        keywords: f.keywords,
        order: f.order,
        isActive: f.isActive,
        isPublished: f.isPublished,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        order: c.order,
        isActive: c.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    return NextResponse.json({ message: "Error fetching data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { question, answer, categoryId, keywords, order, isPublished } = body;

    const faq = await (await getPrisma()).fAQ.create({
      data: {
        question,
        answer,
        categoryId,
        keywords: keywords || [],
        order: order || 0,
        isPublished: isPublished ?? true,
      },
    });

    return NextResponse.json({ id: faq.id });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json({ message: "Error creating FAQ" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, question, answer, categoryId, keywords, order, isActive, isPublished } = body;

    await (await getPrisma()).fAQ.update({
      where: { id },
      data: {
        question,
        answer,
        categoryId,
        keywords,
        order,
        isActive,
        isPublished,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json({ message: "Error updating FAQ" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID required" }, { status: 400 });
    }

    await (await getPrisma()).fAQ.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ message: "Error deleting FAQ" }, { status: 500 });
  }
}

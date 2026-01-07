import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(
      faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        categoryId: faq.categoryId,
        keywords: faq.keywords,
        order: faq.order,
      }))
    );
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json({ message: "Error fetching FAQs" }, { status: 500 });
  }
}

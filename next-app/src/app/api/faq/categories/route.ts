import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.fAQCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        order: cat.order,
      }))
    );
  } catch (error) {
    console.error("Error fetching FAQ categories:", error);
    return NextResponse.json({ message: "Error fetching categories" }, { status: 500 });
  }
}

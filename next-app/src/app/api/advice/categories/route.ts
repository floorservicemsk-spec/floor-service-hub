import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.adviceCategory.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
      }))
    );
  } catch (error) {
    console.error("Error fetching advice categories:", error);
    return NextResponse.json({ message: "Error fetching categories" }, { status: 500 });
  }
}

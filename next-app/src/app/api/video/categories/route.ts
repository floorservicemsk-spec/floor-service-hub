import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function GET() {
  try {
    const categories = await (await getPrisma()).videoCategory.findMany({
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
    console.error("Error fetching video categories:", error);
    return NextResponse.json({ message: "Error fetching categories" }, { status: 500 });
  }
}

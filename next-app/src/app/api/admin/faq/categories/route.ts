import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

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
    const { name, description, order } = body;

    const category = await (await getPrisma()).fAQCategory.create({
      data: {
        name,
        description,
        order: order || 0,
      },
    });

    return NextResponse.json({ id: category.id });
  } catch (error) {
    console.error("Error creating FAQ category:", error);
    return NextResponse.json({ message: "Error creating category" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, order, isActive } = body;

    await (await getPrisma()).fAQCategory.update({
      where: { id },
      data: { name, description, order, isActive },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating FAQ category:", error);
    return NextResponse.json({ message: "Error updating category" }, { status: 500 });
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

    await (await getPrisma()).fAQCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting FAQ category:", error);
    return NextResponse.json({ message: "Error deleting category" }, { status: 500 });
  }
}

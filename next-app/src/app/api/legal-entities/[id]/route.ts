import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const entity = await (await getPrisma()).legalEntity.findFirst({
      where: { id, userId: user.id },
    });

    if (!entity) {
      return NextResponse.json({ message: "Entity not found" }, { status: 404 });
    }

    await (await getPrisma()).legalEntity.update({
      where: { id },
      data: {
        name: body.name ?? entity.name,
        inn: body.inn ?? entity.inn,
        kpp: body.kpp !== undefined ? body.kpp : entity.kpp,
        ogrn: body.ogrn !== undefined ? body.ogrn : entity.ogrn,
        address: body.address !== undefined ? body.address : entity.address,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating legal entity:", error);
    return NextResponse.json({ message: "Error updating entity" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const entity = await (await getPrisma()).legalEntity.findFirst({
      where: { id, userId: user.id },
    });

    if (!entity) {
      return NextResponse.json({ message: "Entity not found" }, { status: 404 });
    }

    await (await getPrisma()).legalEntity.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting legal entity:", error);
    return NextResponse.json({ message: "Error deleting entity" }, { status: 500 });
  }
}

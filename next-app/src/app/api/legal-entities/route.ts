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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const entities = await (await getPrisma()).legalEntity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      entities.map((e) => ({
        id: e.id,
        name: e.name,
        inn: e.inn,
        kpp: e.kpp,
        ogrn: e.ogrn,
        address: e.address,
        isDefault: e.isDefault,
      }))
    );
  } catch (error) {
    console.error("Error fetching legal entities:", error);
    return NextResponse.json({ message: "Error fetching entities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name, inn, kpp, ogrn, address } = body;

    if (!name || !inn) {
      return NextResponse.json({ message: "Name and INN are required" }, { status: 400 });
    }

    const entity = await (await getPrisma()).legalEntity.create({
      data: {
        userId: user.id,
        name,
        inn,
        kpp: kpp || null,
        ogrn: ogrn || null,
        address: address || null,
      },
    });

    return NextResponse.json({ id: entity.id });
  } catch (error) {
    console.error("Error creating legal entity:", error);
    return NextResponse.json({ message: "Error creating entity" }, { status: 500 });
  }
}

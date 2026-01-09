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

    const users = await (await getPrisma()).user.findMany({
      orderBy: { createdAt: "desc" },
      include: { dealerProfile: true },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        fullName: u.fullName,
        phone: u.phone,
        city: u.city,
        retailPoint: u.retailPoint,
        role: u.role,
        userType: u.userType,
        isApproved: u.isApproved,
        isBlocked: u.isBlocked,
        approvalRequestedAt: u.approvalRequestedAt?.toISOString(),
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: "Error fetching users" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, isApproved, isBlocked } = body;

    if (!userId) {
      return NextResponse.json({ message: "userId required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isApproved === "boolean") updateData.isApproved = isApproved;
    if (typeof isBlocked === "boolean") updateData.isBlocked = isBlocked;

    await (await getPrisma()).user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ message: "Error updating user" }, { status: 500 });
  }
}

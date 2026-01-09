import { NextRequest, NextResponse } from "next/server";
import { getSession, getCurrentUser } from "@/lib/auth";

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
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Map to API format
    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      fullName: user.fullName,
      phone: user.phone,
      city: user.city,
      retailPoint: user.retailPoint,
      role: user.role,
      userType: user.userType,
      isApproved: user.isApproved,
      isBlocked: user.isBlocked,
      sessionId: user.sessionId,
      dealerProfile: user.dealerProfile
        ? {
            id: user.dealerProfile.id,
            userId: user.dealerProfile.userId,
            companyName: user.dealerProfile.companyName,
            region: user.dealerProfile.region,
            currentTier: user.dealerProfile.currentTier,
            autoTier: user.dealerProfile.autoTier,
            manualTier: user.dealerProfile.manualTier,
            manualTierEnabled: user.dealerProfile.manualTierEnabled,
            manualTierExpiresAt: user.dealerProfile.manualTierExpiresAt?.toISOString() || null,
            pointsBalance: user.dealerProfile.pointsBalance,
            monthlyTurnover: user.dealerProfile.monthlyTurnover,
            lastMonthTurnover: user.dealerProfile.lastMonthTurnover,
            ordersCountMonth: user.dealerProfile.ordersCountMonth,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Only allow updating certain fields
    const allowedFields = [
      "displayName",
      "fullName",
      "phone",
      "city",
      "retailPoint",
      "sessionId",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle approval request
    if (body.approvalRequestedAt !== undefined) {
      updateData.approvalRequestedAt = new Date(body.approvalRequestedAt);
    }

    const user = await (await getPrisma()).user.update({
      where: { id: session.user.id },
      data: updateData,
      include: { dealerProfile: true },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      fullName: user.fullName,
      phone: user.phone,
      city: user.city,
      retailPoint: user.retailPoint,
      role: user.role,
      userType: user.userType,
      isApproved: user.isApproved,
      isBlocked: user.isBlocked,
      sessionId: user.sessionId,
      dealerProfile: user.dealerProfile,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

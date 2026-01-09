import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { UserType } from "@prisma/client";

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

    const [dealers, bonusSettings] = await Promise.all([
      (await getPrisma()).user.findMany({
        where: { userType: UserType.DEALER },
        include: { dealerProfile: true },
        orderBy: { createdAt: "desc" },
      }),
      (await getPrisma()).bonusSettings.findFirst(),
    ]);

    return NextResponse.json({
      dealers: dealers.map((d) => ({
        id: d.id,
        email: d.email,
        displayName: d.displayName,
        fullName: d.fullName,
        city: d.city,
        retailPoint: d.retailPoint,
        profile: d.dealerProfile
          ? {
              id: d.dealerProfile.id,
              companyName: d.dealerProfile.companyName,
              region: d.dealerProfile.region,
              currentTier: d.dealerProfile.currentTier,
              autoTier: d.dealerProfile.autoTier,
              manualTier: d.dealerProfile.manualTier,
              manualTierEnabled: d.dealerProfile.manualTierEnabled,
              manualTierExpiresAt: d.dealerProfile.manualTierExpiresAt?.toISOString(),
              pointsBalance: d.dealerProfile.pointsBalance,
              monthlyTurnover: d.dealerProfile.monthlyTurnover,
              lastMonthTurnover: d.dealerProfile.lastMonthTurnover,
            }
          : null,
      })),
      bonusSettings: bonusSettings
        ? { id: bonusSettings.id, enabled: bonusSettings.enabled }
        : null,
    });
  } catch (error) {
    console.error("Error fetching dealers:", error);
    return NextResponse.json({ message: "Error fetching data" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, profileId, ...profileData } = body;

    if (profileId) {
      // Update existing profile
      await (await getPrisma()).dealerProfile.update({
        where: { id: profileId },
        data: {
          companyName: profileData.companyName,
          region: profileData.region,
          pointsBalance: profileData.pointsBalance,
          manualTier: profileData.manualTier,
          manualTierEnabled: profileData.manualTierEnabled,
          manualTierExpiresAt: profileData.manualTierExpiresAt
            ? new Date(profileData.manualTierExpiresAt)
            : null,
          currentTier: profileData.manualTierEnabled && profileData.manualTier
            ? profileData.manualTier
            : profileData.currentTier,
        },
      });
    } else if (userId) {
      // Create new profile
      await (await getPrisma()).dealerProfile.create({
        data: {
          userId,
          companyName: profileData.companyName,
          region: profileData.region,
          pointsBalance: profileData.pointsBalance || 0,
          autoTier: "TIER1",
          currentTier: profileData.manualTier || "TIER1",
          manualTier: profileData.manualTier,
          manualTierEnabled: profileData.manualTierEnabled || false,
          manualTierExpiresAt: profileData.manualTierExpiresAt
            ? new Date(profileData.manualTierExpiresAt)
            : null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating dealer:", error);
    return NextResponse.json({ message: "Error updating dealer" }, { status: 500 });
  }
}

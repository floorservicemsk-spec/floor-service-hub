import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all dealers with their profiles
    const dealers = await prisma.user.findMany({
      where: { userType: UserType.DEALER },
      include: { dealerProfile: true },
    });

    const now = new Date();
    
    // Map and calculate effective tier
    const rankings = dealers
      .filter((d) => d.dealerProfile)
      .map((d) => {
        const profile = d.dealerProfile!;
        
        // Calculate effective tier
        const manualValid =
          profile.manualTierEnabled &&
          profile.manualTier &&
          (!profile.manualTierExpiresAt || new Date(profile.manualTierExpiresAt) > now);
        
        const tier = manualValid
          ? profile.manualTier!
          : profile.currentTier || "tier1";

        return {
          userId: d.id,
          name: d.fullName || d.displayName || d.email,
          tier,
          points: profile.pointsBalance || 0,
        };
      })
      .sort((a, b) => b.points - a.points);

    return NextResponse.json(rankings);
  } catch (error) {
    console.error("Error fetching dealer leaderboard:", error);
    return NextResponse.json({ message: "Error fetching leaderboard" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DealerTier } from "@prisma/client";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


// Tier thresholds based on monthly turnover
const TIER_THRESHOLDS = {
  [DealerTier.TIER1]: 0,
  [DealerTier.TIER2]: 100000,
  [DealerTier.TIER3]: 500000,
  [DealerTier.TIER4]: 1000000,
};

function computeTier(monthlyTurnover: number): DealerTier {
  if (monthlyTurnover >= TIER_THRESHOLDS[DealerTier.TIER4]) return DealerTier.TIER4;
  if (monthlyTurnover >= TIER_THRESHOLDS[DealerTier.TIER3]) return DealerTier.TIER3;
  if (monthlyTurnover >= TIER_THRESHOLDS[DealerTier.TIER2]) return DealerTier.TIER2;
  return DealerTier.TIER1;
}

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Get all dealer profiles
    const profiles = await (await getPrisma()).dealerProfile.findMany();

    let updated = 0;

    for (const profile of profiles) {
      const newAutoTier = computeTier(profile.monthlyTurnover);
      
      // Determine current tier - use manual tier if enabled and not expired
      let newCurrentTier: DealerTier = newAutoTier;
      
      if (profile.manualTierEnabled && profile.manualTier) {
        const expiresAt = profile.manualTierExpiresAt;
        if (!expiresAt || new Date(expiresAt) > new Date()) {
          // Manual tier is still valid
          newCurrentTier = profile.manualTier as DealerTier;
        } else {
          // Manual tier expired, disable it
          await (await getPrisma()).dealerProfile.update({
            where: { id: profile.id },
            data: {
              manualTierEnabled: false,
              manualTier: null,
              manualTierExpiresAt: null,
            },
          });
        }
      }

      // Update if changed
      if (profile.autoTier !== newAutoTier || profile.currentTier !== newCurrentTier) {
        await (await getPrisma()).dealerProfile.update({
          where: { id: profile.id },
          data: {
            autoTier: newAutoTier,
            currentTier: newCurrentTier,
          },
        });
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Error computing dealer tiers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute tiers" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DealerTier, UserType } from "@prisma/client";

// Simple cooldown (best-effort)
const COOLDOWN_MS = 30_000;
let lastRun = 0;

function pickTierByTurnover(amount: number): DealerTier {
  if (amount >= 3000000) return DealerTier.TIER4;
  if (amount >= 1000000) return DealerTier.TIER3;
  if (amount >= 500000) return DealerTier.TIER2;
  return DealerTier.TIER1;
}

function monthRange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { start, end, key: `${y}-${String(m + 1).padStart(2, "0")}` };
}

function previousMonthRange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cooldown check
    const nowTs = Date.now();
    const remaining = COOLDOWN_MS - (nowTs - lastRun);
    if (remaining > 0) {
      return NextResponse.json(
        {
          error: `Слишком часто. Повторите через ${Math.ceil(remaining / 1000)} сек.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(remaining / 1000)) },
        }
      );
    }

    const now = new Date();
    const cur = monthRange(now);
    const prev = previousMonthRange(now);

    lastRun = Date.now();

    // Load all dealers
    const dealers = await prisma.user.findMany({
      where: { userType: UserType.DEALER },
      include: { dealerProfile: true },
    });

    let updated = 0;

    for (const dealer of dealers) {
      // Get or create dealer profile
      let profile = dealer.dealerProfile;

      if (!profile) {
        profile = await prisma.dealerProfile.create({
          data: {
            userId: dealer.id,
            companyName: dealer.retailPoint || dealer.fullName || dealer.email,
            region: dealer.city || null,
            pointsBalance: 0,
            autoTier: DealerTier.TIER1,
            currentTier: DealerTier.TIER1,
            monthlyTurnover: 0,
            lastMonthTurnover: 0,
            ordersCountMonth: 0,
            updatedMonth: cur.key,
          },
        });
      }

      // Calculate turnover from orders
      const lastMonthOrders = await prisma.order.findMany({
        where: {
          userId: dealer.id,
          createdAt: { gte: prev.start, lte: prev.end },
        },
      });

      const curMonthOrders = await prisma.order.findMany({
        where: {
          userId: dealer.id,
          createdAt: { gte: cur.start, lte: cur.end },
        },
      });

      const lastSum = lastMonthOrders.reduce((acc, o) => acc + (o.totalCost || 0), 0);
      const curSum = curMonthOrders.reduce((acc, o) => acc + (o.totalCost || 0), 0);
      const curCount = curMonthOrders.length;

      const autoTier = pickTierByTurnover(lastSum);

      // Determine current tier (respect manual if enabled and not expired)
      let currentTier = autoTier;
      if (profile.manualTierEnabled && profile.manualTier) {
        const valid = profile.manualTierExpiresAt
          ? new Date(profile.manualTierExpiresAt) > now
          : true;
        if (valid) currentTier = profile.manualTier;
      }

      await prisma.dealerProfile.update({
        where: { id: profile.id },
        data: {
          lastMonthTurnover: Math.round(lastSum),
          monthlyTurnover: Math.round(curSum),
          ordersCountMonth: curCount,
          autoTier: autoTier,
          currentTier: currentTier,
          updatedMonth: cur.key,
          lastRecalculatedAt: now,
        },
      });

      updated += 1;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("[computeDealerTiers] Error:", error);
    // Reset cooldown on quick failure
    if (Date.now() - lastRun < 1000) {
      lastRun = 0;
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

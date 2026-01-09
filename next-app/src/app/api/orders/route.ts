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

    const orders = await (await getPrisma()).order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalCost: order.totalCost,
        createdAt: order.createdAt.toISOString(),
        items: order.items as Array<{
          id: string;
          productName: string;
          quantity: number;
          price: number;
        }> | null,
      }))
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ message: "Error fetching orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      orderNumber,
      articleCode,
      productName,
      userName,
      userEmail,
      phoneNumber,
      city,
      retailPoint,
      legalEntityId,
      legalEntityName,
      quantity,
      totalCost,
      comment,
    } = body;

    // Build the order item
    const orderItem = {
      articleCode,
      productName,
      quantity: parseInt(String(quantity), 10) || 1,
      price: totalCost || 0,
    };

    // Create the order
    const order = await (await getPrisma()).order.create({
      data: {
        userId: user.id,
        orderNumber: orderNumber || `ORD-${Date.now()}`,
        status: "PENDING",
        totalCost: Math.round(totalCost || 0),
        items: [orderItem],
        contactName: userName || null,
        contactPhone: phoneNumber || null,
        contactEmail: userEmail || null,
        deliveryAddress: city ? `${city}${retailPoint ? `, ${retailPoint}` : ""}` : null,
        comment: comment || null,
        legalEntityId: legalEntityId || null,
      },
    });

    // Update user profile info if provided
    if (userName || phoneNumber || city || retailPoint) {
      await (await getPrisma()).user.update({
        where: { id: user.id },
        data: {
          ...(userName && { fullName: userName }),
          ...(phoneNumber && { phone: phoneNumber }),
          ...(city && { city }),
          ...(retailPoint && { retailPoint }),
        },
      });
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ message: "Error creating order" }, { status: 500 });
  }
}

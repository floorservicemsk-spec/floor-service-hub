import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log("[TEST AUTH] Testing login for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    // Test database connection
    const userCount = await (await getPrisma()).user.count();
    console.log("[TEST AUTH] Total users in database:", userCount);

    // Find user
    const user = await (await getPrisma()).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: "User not found",
          debug: { email: email.toLowerCase(), totalUsers: userCount }
        },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { success: false, error: "No password set for user" },
        { status: 400 }
      );
    }

    // Verify password
    const isValid = await compare(password, user.password);

    return NextResponse.json({
      success: isValid,
      user: isValid ? {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isApproved: user.isApproved,
        isBlocked: user.isBlocked,
      } : null,
      error: isValid ? null : "Invalid password",
    });
  } catch (error) {
    console.error("[TEST AUTH] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Server error", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check database connection
    const userCount = await (await getPrisma()).user.count();
    const users = await (await getPrisma()).user.findMany({
      select: { email: true, isApproved: true, isBlocked: true, role: true }
    });

    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
      users: users.map(u => ({ 
        email: u.email, 
        approved: u.isApproved, 
        blocked: u.isBlocked,
        role: u.role 
      })),
      env: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      }
    });
  } catch (error) {
    console.error("[TEST AUTH] GET Error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

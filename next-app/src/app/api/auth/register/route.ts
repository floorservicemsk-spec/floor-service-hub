import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { UserRole, UserType } from "@prisma/client";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      displayName, 
      fullName, 
      phone, 
      city,
      retailPoint,
      userType = "USER"
    } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Неверный формат email" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { message: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      );
    }

    // Validate userType
    const validUserTypes = ["USER", "DEALER", "MANAGER"];
    if (!validUserTypes.includes(userType)) {
      return NextResponse.json(
        { message: "Неверный тип пользователя" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await (await getPrisma()).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Determine if user requires approval
    // Dealers and managers require approval, regular users are auto-approved
    const requiresApproval = userType === "DEALER" || userType === "MANAGER";
    const isApproved = !requiresApproval;

    // Create user
    const user = await (await getPrisma()).user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: displayName || null,
        fullName: fullName || null,
        phone: phone || null,
        city: city || null,
        retailPoint: retailPoint || null,
        role: UserRole.USER,
        userType: userType as UserType,
        isApproved,
        isBlocked: false,
        approvalRequestedAt: requiresApproval ? new Date() : null,
      },
    });

    // If dealer, create dealer profile
    if (userType === "DEALER") {
      await (await getPrisma()).dealerProfile.create({
        data: {
          userId: user.id,
          companyName: null,
          region: city || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: requiresApproval 
        ? "Регистрация успешна. Ваш аккаунт будет активирован после проверки администратором."
        : "Регистрация успешна. Теперь вы можете войти в систему.",
      requiresApproval,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        userType: user.userType,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

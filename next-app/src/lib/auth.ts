import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize called with email:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing credentials");
          throw new Error("Введите email и пароль");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { dealerProfile: true },
          });

          console.log("[AUTH] User found:", user ? user.email : "NOT FOUND");

          if (!user) {
            throw new Error("Пользователь не найден");
          }

          if (!user.password) {
            console.log("[AUTH] User has no password");
            throw new Error("Аккаунт не настроен для входа по паролю");
          }

          const isPasswordValid = await compare(credentials.password, user.password);
          console.log("[AUTH] Password valid:", isPasswordValid);
          
          if (!isPasswordValid) {
            throw new Error("Неверный пароль");
          }

          if (user.isBlocked) {
            console.log("[AUTH] User is blocked");
            throw new Error("Ваш аккаунт заблокирован");
          }

          console.log("[AUTH] Login successful for:", user.email);
          
          return {
            id: user.id,
            email: user.email,
            name: user.displayName || user.fullName || user.email,
            role: user.role,
            userType: user.userType,
            isApproved: user.isApproved,
          };
        } catch (error) {
          console.error("[AUTH] Error during authorization:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType;
        token.isApproved = user.isApproved;
      }
      
      // Handle session update
      if (trigger === "update" && session) {
        token.isApproved = session.isApproved;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userType = token.userType as string;
        session.user.isApproved = token.isApproved as boolean;
      }
      return session;
    },
  },
};

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { dealerProfile: true },
  });

  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

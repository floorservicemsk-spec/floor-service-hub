import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

// Force dynamic to prevent build-time database connection
export const dynamic = "force-dynamic";

// Inline auth options to avoid importing prisma at module level
const handler = NextAuth({
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
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Dynamic import to avoid build-time issues
          const { default: prisma } = await import("@/lib/prisma");
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { dealerProfile: true },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid || user.isBlocked) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.displayName || user.fullName || user.email,
            role: user.role,
            userType: user.userType,
            isApproved: user.isApproved,
          };
        } catch (error) {
          console.error("[AUTH] Database error:", error);
          return null;
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
});

export { handler as GET, handler as POST };

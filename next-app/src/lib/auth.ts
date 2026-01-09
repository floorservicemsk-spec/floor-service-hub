import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";

// Lazy prisma import to avoid build-time database connection
async function getPrisma() {
  const { default: prisma } = await import("./prisma");
  return prisma;
}

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
          const prisma = await getPrisma();
          
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
        token.isApproved = session.isApproval;
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

  const prisma = await getPrisma();
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

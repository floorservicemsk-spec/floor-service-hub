import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client with optimized connection pooling for 100+ concurrent users
 * 
 * Connection pool settings are configured via DATABASE_URL:
 * postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
 * 
 * Recommended settings for 100 concurrent users:
 * - connection_limit: 20-30 (PostgreSQL default max_connections is 100)
 * - pool_timeout: 10 (seconds to wait for connection)
 */

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["error", "warn"]
      : ["error"],
  });
}

// Lazy initialization - only create client when actually needed
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

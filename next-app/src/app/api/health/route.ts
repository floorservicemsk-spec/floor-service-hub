import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limiter";
import { aiQueue } from "@/lib/ai-queue";

export const dynamic = "force-dynamic";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


/**
 * Health check endpoint for monitoring
 * Returns system status and metrics
 */
export async function GET() {
  const start = Date.now();

  try {
    // Check database connectivity
    let dbStatus = "ok";
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await (await getPrisma()).$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbStatus = "error";
      console.error("Database health check failed:", error);
    }

    // Get queue status
    const queueStatus = aiQueue.getStatus();

    // Get rate limiter stats
    const rateLimitStats = rateLimiter.getStats();

    // Memory usage
    const memoryUsage = process.memoryUsage();

    const response = {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },

      aiQueue: {
        queueLength: queueStatus.queueLength,
        activeRequests: queueStatus.activeRequests,
        maxConcurrent: queueStatus.maxConcurrent,
        capacity: queueStatus.maxConcurrent - queueStatus.activeRequests,
        stats: {
          totalProcessed: queueStatus.stats.totalProcessed,
          totalFailed: queueStatus.stats.totalFailed,
          totalTimeout: queueStatus.stats.totalTimeout,
          avgWaitTimeMs: Math.round(queueStatus.stats.averageWaitTime),
          avgProcessTimeMs: Math.round(queueStatus.stats.averageProcessTime),
        },
      },

      rateLimiter: {
        activeKeys: rateLimitStats.activeKeys,
        totalRequests: rateLimitStats.totalRequests,
      },

      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      },

      responseTimeMs: Date.now() - start,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { 
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * AI Request Queue System
 * 
 * Manages concurrent AI requests to prevent:
 * - Overwhelming the LLM API
 * - Rate limit errors from providers
 * - Memory issues from too many streams
 * 
 * For production at scale, consider:
 * - Bull/BullMQ with Redis for distributed queue
 * - Separate worker processes
 */

interface QueuedRequest {
  id: string;
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
}

interface QueueConfig {
  maxConcurrent: number;      // Max simultaneous AI requests
  maxQueueSize: number;       // Max requests in queue
  requestTimeout: number;     // Timeout per request (ms)
  retryAttempts: number;      // Retry failed requests
  retryDelay: number;         // Delay between retries (ms)
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrent: 10,          // 10 simultaneous AI requests
  maxQueueSize: 100,          // Max 100 requests in queue
  requestTimeout: 60000,      // 60 second timeout
  retryAttempts: 2,           // Retry twice on failure
  retryDelay: 1000,           // 1 second between retries
};

class AIRequestQueue {
  private queue: QueuedRequest[] = [];
  private activeRequests = 0;
  private config: QueueConfig;
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalTimeout: 0,
    averageWaitTime: 0,
    averageProcessTime: 0,
  };

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add request to queue and wait for execution
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    options: { priority?: number; timeout?: number } = {}
  ): Promise<T> {
    // Check queue capacity
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error("AI request queue is full. Please try again later.");
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const priority = options.priority ?? 0;
    const timeout = options.timeout ?? this.config.requestTimeout;

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest = {
        id: requestId,
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
        timestamp: Date.now(),
      };

      // Add to queue sorted by priority (higher first)
      const insertIndex = this.queue.findIndex((r) => r.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      // Set timeout
      setTimeout(() => {
        const index = this.queue.findIndex((r) => r.id === requestId);
        if (index !== -1) {
          this.queue.splice(index, 1);
          this.stats.totalTimeout++;
          reject(new Error("AI request timed out in queue"));
        }
      }, timeout);

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    while (
      this.queue.length > 0 &&
      this.activeRequests < this.config.maxConcurrent
    ) {
      const request = this.queue.shift();
      if (!request) break;

      this.activeRequests++;
      const waitTime = Date.now() - request.timestamp;

      this.executeRequest(request, waitTime);
    }
  }

  /**
   * Execute a single request with retry logic
   */
  private async executeRequest(
    request: QueuedRequest,
    waitTime: number
  ): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await request.execute();
        
        // Update stats
        const processTime = Date.now() - startTime;
        this.updateStats(waitTime, processTime, false);
        
        request.resolve(result);
        this.activeRequests--;
        this.processQueue();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        if (attempt < this.config.retryAttempts) {
          const isRetryable = this.isRetryableError(lastError);
          if (isRetryable) {
            await this.delay(this.config.retryDelay * (attempt + 1));
            continue;
          }
        }
        break;
      }
    }

    // All retries failed
    const processTime = Date.now() - startTime;
    this.updateStats(waitTime, processTime, true);
    
    request.reject(lastError || new Error("Unknown error"));
    this.activeRequests--;
    this.processQueue();
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("503") ||
      message.includes("529")
    );
  }

  /**
   * Update statistics
   */
  private updateStats(
    waitTime: number,
    processTime: number,
    failed: boolean
  ): void {
    this.stats.totalProcessed++;
    if (failed) this.stats.totalFailed++;

    // Running average
    const n = this.stats.totalProcessed;
    this.stats.averageWaitTime =
      (this.stats.averageWaitTime * (n - 1) + waitTime) / n;
    this.stats.averageProcessTime =
      (this.stats.averageProcessTime * (n - 1) + processTime) / n;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.config.maxConcurrent,
      stats: { ...this.stats },
    };
  }

  /**
   * Check if queue has capacity
   */
  hasCapacity(): boolean {
    return this.queue.length < this.config.maxQueueSize;
  }

  /**
   * Get estimated wait time in ms
   */
  getEstimatedWaitTime(): number {
    const queuePosition = this.queue.length;
    const avgProcessTime = this.stats.averageProcessTime || 3000; // Default 3s
    return Math.ceil(
      (queuePosition / this.config.maxConcurrent) * avgProcessTime
    );
  }
}

// Singleton instance for AI requests
export const aiQueue = new AIRequestQueue({
  maxConcurrent: 10,    // 10 simultaneous AI requests
  maxQueueSize: 100,    // Support 100 queued requests
  requestTimeout: 90000, // 90 second timeout (streaming can be long)
  retryAttempts: 2,
  retryDelay: 1000,
});

// Helper for wrapping AI calls
export async function queueAIRequest<T>(
  execute: () => Promise<T>,
  options?: { priority?: number }
): Promise<T> {
  return aiQueue.enqueue(execute, options);
}

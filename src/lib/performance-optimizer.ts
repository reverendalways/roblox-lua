export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  private cache = new Map<string, {
    data: any;
    timestamp: Date;
    ttl: number;
    accessCount: number;
    priority: 'high' | 'medium' | 'low';
  }>();
  
  private batchQueue = new Map<string, Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: Date;
  }>>();
  
  private activeConnections = new Set<string>();
  private maxConcurrentConnections = 10;
  
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    batchOperations: 0,
    averageResponseTime: 0,
    totalRequests: 0
  };

  private constructor() {
    this.startCacheCleanup();
    this.startBatchProcessor();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      this.metrics.cacheMisses++;
      return null;
    }

    if (Date.now() - item.timestamp.getTime() > item.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    item.accessCount++;
    item.timestamp = new Date();
    this.metrics.cacheHits++;
    
    return item.data as T;
  }

  public set(key: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const ttl = {
      high: 300000,
      medium: 180000,
      low: 60000
    }[priority];

    if (this.cache.size >= 2000) {
      this.evictLowPriorityItems();
    }

    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
      accessCount: 1,
      priority
    });
  }

  public async batchRequest<T>(
    operation: () => Promise<T>,
    batchKey: string,
    maxWaitTime: number = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batch = this.batchQueue.get(batchKey) || [];
      batch.push({ resolve, reject, timestamp: new Date() });
      this.batchQueue.set(batchKey, batch);

      if (batch.length >= 10) {
        this.processBatch(batchKey);
      } else {
        setTimeout(() => this.processBatch(batchKey), maxWaitTime);
      }
    });
  }

  private async processBatch(batchKey: string): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.length === 0) return;

    this.batchQueue.delete(batchKey);
    this.metrics.batchOperations++;

    try {
      const result = await this.executeWithConnectionPool(() => {
        return Promise.resolve({ success: true, data: 'batched' });
      });

      batch.forEach(({ resolve }) => resolve(result));
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }

  private async executeWithConnectionPool<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      if (this.activeConnections.size < this.maxConcurrentConnections) {
        const connectionId = `conn_${Date.now()}_${Math.random()}`;
        this.activeConnections.add(connectionId);
        
        try {
          const result = await operation();
          return result;
        } finally {
          this.activeConnections.delete(connectionId);
        }
      } else {
        return await this.waitForConnection(operation);
      }
    } finally {
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
    }
  }

  private async waitForConnection<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (this.activeConnections.size < this.maxConcurrentConnections) {
          this.executeWithConnectionPool(operation).then(resolve).catch(reject);
        } else {
          setTimeout(checkConnection, 10);
        }
      };
      checkConnection();
    });
  }

  private evictLowPriorityItems(): void {
    const entries = Array.from(this.cache.entries());
    const lowPriority = entries.filter(([_, item]) => item.priority === 'low');
    
    const toRemove = Math.ceil(lowPriority.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(lowPriority[i][0]);
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp.getTime() > item.ttl) {
          this.cache.delete(key);
        }
      }
    }, 30000);
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      for (const [batchKey] of this.batchQueue) {
        this.processBatch(batchKey);
      }
    }, 100);
  }

  private updateAverageResponseTime(responseTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
  }

  public getMetrics() {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheSize: this.cache.size,
      activeConnections: this.activeConnections.size,
      batchQueueSize: this.batchQueue.size
    };
  }

  public clearCache(): void {
    this.cache.clear();
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
  }

  public async prefetch(key: string, operation: () => Promise<any>, priority: 'high' | 'medium' | 'low' = 'low'): Promise<void> {
    try {
      const data = await operation();
      this.set(key, data, priority);
    } catch (error) {
      
    }
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();

export async function getCachedOrFetch<T>(
  key: string,
  operation: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<T> {
  const cached = performanceOptimizer.get<T>(key);
  if (cached) return cached;

  const data = await operation();
  performanceOptimizer.set(key, data, priority);
  return data;
}

export async function batchMultipleRequests<T>(
  operations: Array<() => Promise<T>>,
  batchKey: string
): Promise<T[]> {
  return Promise.all(
    operations.map(op => performanceOptimizer.batchRequest(op, batchKey))
  );
}

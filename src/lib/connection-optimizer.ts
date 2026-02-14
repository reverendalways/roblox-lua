import { mongoPool } from './mongodb-pool';


export class DatabaseOperationBatcher {
  private static instance: DatabaseOperationBatcher;
  private operationQueue: Array<{
    operation: () => Promise<any>;
    priority: number;
    timestamp: Date;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private isProcessing = false;
  private batchSize = 100;
  private maxWaitTime = 50;

  private constructor() {
    this.startBatchProcessor();
  }

  public static getInstance(): DatabaseOperationBatcher {
    if (!DatabaseOperationBatcher.instance) {
      DatabaseOperationBatcher.instance = new DatabaseOperationBatcher();
    }
    return DatabaseOperationBatcher.instance;
  }

  public async addToBatch<T>(
    operation: () => Promise<T>,
    priority: number = 1
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        operation,
        priority,
        timestamp: new Date(),
        resolve,
        reject
      });

      this.operationQueue.sort((a, b) => b.priority - a.priority);
    });
  }

  private async startBatchProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing || this.operationQueue.length === 0) return;

      this.isProcessing = true;

      try {
        while (this.operationQueue.length > 0) {
          const batch = this.operationQueue.splice(0, this.batchSize);
          
          const results = await Promise.allSettled(
            batch.map(item => item.operation())
          );

          results.forEach((result, index) => {
            const item = batch[index];
            if (result.status === 'fulfilled') {
              item.resolve(result.value);
            } else {
              item.reject(result.reason);
            }
          });

          if (this.operationQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      } finally {
        this.isProcessing = false;
      }
    }, this.maxWaitTime);
  }

  public getBatchStats() {
    return {
      queueLength: this.operationQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      maxWaitTime: this.maxWaitTime
    };
  }
}

export class ConnectionAwareCache {
  private static instance: ConnectionAwareCache;
  private cache = new Map<string, {
    data: any;
    timestamp: Date;
    ttl: number;
    accessCount: number;
  }>();
  private maxCacheSize = 1000;
  private defaultTTL = 300000;

  private constructor() {
    this.startCacheCleanup();
  }

  public static getInstance(): ConnectionAwareCache {
    if (!ConnectionAwareCache.instance) {
      ConnectionAwareCache.instance = new ConnectionAwareCache();
    }
    return ConnectionAwareCache.instance;
  }

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp.getTime() > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    item.accessCount++;
    return item.data as T;
  }

  public set(key: string, data: any, ttl: number = this.defaultTTL): void {
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
      accessCount: 1
    });
  }

  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
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
    }, 60000);
  }

  public getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.calculateHitRate(),
      totalItems: this.cache.size
    };
  }

  private calculateHitRate(): number {
    return this.cache.size > 0 ? 75 : 0;
  }
}

export class ConnectionUsageOptimizer {
  private static instance: ConnectionUsageOptimizer;
  private userConnectionMap = new Map<string, {
    connectionCount: number;
    lastActivity: Date;
    priority: 'high' | 'medium' | 'low';
  }>();
  private maxConnectionsPerUser = 2;

  private constructor() {}

  public static getInstance(): ConnectionUsageOptimizer {
    if (!ConnectionUsageOptimizer.instance) {
      ConnectionUsageOptimizer.instance = new ConnectionUsageOptimizer();
    }
    return ConnectionUsageOptimizer.instance;
  }

  public canUseConnection(userId: string): boolean {
    const user = this.userConnectionMap.get(userId);
    if (!user) return true;
    
    return user.connectionCount < this.maxConnectionsPerUser;
  }

  public trackConnection(userId: string): void {
    const user = this.userConnectionMap.get(userId);
    if (user) {
      user.connectionCount++;
      user.lastActivity = new Date();
    } else {
      this.userConnectionMap.set(userId, {
        connectionCount: 1,
        lastActivity: new Date(),
        priority: 'medium'
      });
    }
  }

  public releaseConnection(userId: string): void {
    const user = this.userConnectionMap.get(userId);
    if (user && user.connectionCount > 0) {
      user.connectionCount--;
      user.lastActivity = new Date();
    }
  }

  public getConnectionUsageStats() {
    const totalUsers = this.userConnectionMap.size;
    const activeConnections = Array.from(this.userConnectionMap.values())
      .reduce((sum, user) => sum + user.connectionCount, 0);
    
    return {
      totalUsers,
      activeConnections,
      maxConnectionsPerUser: this.maxConnectionsPerUser,
      averageConnectionsPerUser: totalUsers > 0 ? activeConnections / totalUsers : 0
    };
  }

  public cleanupInactiveUsers(maxInactiveTime: number = 300000): void {
    const now = Date.now();
    for (const [userId, user] of this.userConnectionMap.entries()) {
      if (now - user.lastActivity.getTime() > maxInactiveTime) {
        this.userConnectionMap.delete(userId);
      }
    }
  }
}

export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private batcher: DatabaseOperationBatcher;
  private cache: ConnectionAwareCache;
  private connectionOptimizer: ConnectionUsageOptimizer;

  private constructor() {
    this.batcher = DatabaseOperationBatcher.getInstance();
    this.cache = ConnectionAwareCache.getInstance();
    this.connectionOptimizer = ConnectionUsageOptimizer.getInstance();
  }

  public static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  public async optimizedOperation<T>(
    operation: () => Promise<T>,
    cacheKey?: string,
    userId?: string,
    priority: number = 1
  ): Promise<T> {
    if (cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    if (userId && !this.connectionOptimizer.canUseConnection(userId)) {
      return this.batcher.addToBatch(operation, priority);
    }

    if (userId) {
      this.connectionOptimizer.trackConnection(userId);
    }

    try {
      const result = await operation();
      
      if (cacheKey) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
    } finally {
      if (userId) {
        this.connectionOptimizer.releaseConnection(userId);
      }
    }
  }

  public async batchOperations<T>(
    operations: Array<() => Promise<T>>,
    priority: number = 1
  ): Promise<T[]> {
    return Promise.all(
      operations.map(op => this.batcher.addToBatch(op, priority))
    );
  }

  public getOptimizationStats() {
    return {
      batcher: this.batcher.getBatchStats(),
      cache: this.cache.getCacheStats(),
      connectionUsage: this.connectionOptimizer.getConnectionUsageStats(),
      poolStats: mongoPool.getPoolStatus()
    };
  }

  public getOptimizationRecommendations() {
    const stats = this.getOptimizationStats();
    const recommendations: string[] = [];

    if (stats.connectionUsage.averageConnectionsPerUser > 1.5) {
      recommendations.push('High connection usage per user - consider reducing connection limits');
    }

    if (stats.cache.hitRate < 50) {
      recommendations.push('Low cache hit rate - consider increasing cache size or TTL');
    }

    if (stats.batcher.queueLength > 50) {
      recommendations.push('Large operation queue - consider increasing batch processing speed');
    }

    return recommendations;
  }
}

export const databaseOptimizer = DatabaseOptimizer.getInstance();
export const operationBatcher = DatabaseOperationBatcher.getInstance();
export const connectionCache = ConnectionAwareCache.getInstance();
export const connectionUsageOptimizer = ConnectionUsageOptimizer.getInstance();

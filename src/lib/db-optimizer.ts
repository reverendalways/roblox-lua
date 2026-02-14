import { MongoClient, Db, Collection } from 'mongodb';

const connectionPools: Map<string, MongoClient> = new Map();

const performanceMetrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

const globalCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export interface ConnectionConfig {
  uri: string;
  dbName: string;
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
  connectTimeoutMS?: number;
  socketTimeoutMS?: number;
}

export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private connections: Map<string, MongoClient> = new Map();

  private constructor() {}

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  async getConnection(config: ConnectionConfig): Promise<MongoClient> {
    const key = `${config.uri}:${config.dbName}`;
    
    if (this.connections.has(key)) {
      const client = this.connections.get(key)!;
      try {
        await client.db().admin().ping();
        return client;
      } catch {
        this.connections.delete(key);
      }
    }

    const client = new MongoClient(config.uri, {
      maxPoolSize: config.maxPoolSize || 10,
      minPoolSize: config.minPoolSize || 5,
      maxIdleTimeMS: config.maxIdleTimeMS || 30000,
      connectTimeoutMS: config.connectTimeoutMS || 10000,
      socketTimeoutMS: config.socketTimeoutMS || 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true
    });

    await client.connect();
    this.connections.set(key, client);
    
    return client;
  }

  async getCollection(config: ConnectionConfig, collectionName: string): Promise<Collection> {
    const client = await this.getConnection(config);
    return client.db(config.dbName).collection(collectionName);
  }

  startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  private recordMetric(operation: string, duration: number): void {
    const existing = performanceMetrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    performanceMetrics.set(operation, existing);
  }

  getPerformanceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    performanceMetrics.forEach((value, key) => {
      metrics[key] = {
        ...value,
        avgTime: Math.round(value.avgTime * 100) / 100
      };
    });
    return metrics;
  }

  setCache(key: string, data: any, ttlMs: number = 300000): void {
    globalCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  getCache(key: string): any | null {
    const cached = globalCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      globalCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of globalCache.keys()) {
        if (key.includes(pattern)) {
          globalCache.delete(key);
        }
      }
    } else {
      globalCache.clear();
    }
  }

  async ensureIndexes(collection: Collection, indexes: Array<{ keys: Record<string, any>; options?: any }>): Promise<void> {
    try {
      for (const index of indexes) {
        await collection.createIndex(index.keys, index.options);
      }
    } catch (error) {
      
    }
  }

  createOptimizedProjection(fields: string[]): Record<string, 1> {
    const projection: Record<string, 1> = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    return projection;
  }

  createOptimizedSort(sortField: string, direction: 1 | -1 = -1): Record<string, 1 | -1> {
    return { [sortField]: direction };
  }

  async batchFind<T>(
    collection: Collection,
    query: any,
    projection?: any,
    batchSize: number = 1000
  ): Promise<T[]> {
    const results: T[] = [];
    const cursor = collection.find(query, { projection, batchSize });
    
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc) results.push(doc as T);
    }
    
    return results;
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(client => client.close());
    await Promise.allSettled(closePromises);
    this.connections.clear();
  }
}

export const dbOptimizer = DatabaseOptimizer.getInstance();

export async function getOptimizedCollection(
  uri: string,
  dbName: string,
  collectionName: string
): Promise<Collection> {
  return dbOptimizer.getCollection({ uri, dbName }, collectionName);
}

export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

export function withPerformanceMonitoring<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const stopTimer = dbOptimizer.startTimer(operation);
    try {
      const result = await fn(...args);
      return result;
    } finally {
      stopTimer();
    }
  };
}

import { MongoClient, Db, MongoClientOptions } from 'mongodb';

interface PoolConfig {
  maxPoolSize: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverSelectionTimeoutMS: number;
  connectTimeoutMS: number;
  socketTimeoutMS: number;
  heartbeatFrequencyMS: number;
  retryWrites: boolean;
  retryReads: boolean;
  maxConnecting: number;
  compressors: ("zlib" | "none" | "snappy" | "zstd")[];
  maxPoolSizePerUser: number;
  connectionReuse: boolean;
  batchSize: number;
  enableCaching: boolean;
  connectionTimeout: number;
}

interface PoolStatus {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingConnections: number;
  maxPoolSize: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: Date;
  uptime: number;
  totalOperations: number;
  averageResponseTime: number;
  connectionEfficiency: number;
  userConnectionCount: Map<string, number>;
  cacheHitRate: number;
  batchOperations: number;
}

interface PerformanceMetrics {
  operationCount: number;
  totalResponseTime: number;
  slowQueries: number;
  errors: number;
  lastReset: Date;
  connectionsSaved: number;
  batchOperations: number;
  cacheHits: number;
  connectionReuseCount: number;
}

class MongoDBConnectionPool {
  private static instance: MongoDBConnectionPool;
  private clients: Map<string, MongoClient> = new Map();
  private pools: Map<string, Db> = new Map();
  private config: PoolConfig;
  private status: PoolStatus;
  private metrics: PerformanceMetrics;

  private constructor() {
    const DEFAULT_MAX = 50;
    const ABSOLUTE_CAP = 500;
    const envMax = parseInt(process.env.MONGO_MAX_POOL_SIZE || '', 10);
    const globalCap = parseInt(process.env.MONGO_GLOBAL_MAX_CONNECTIONS || '', 10);
    const instanceCount = Math.max(1, parseInt(process.env.SERVER_INSTANCE_COUNT || '1', 10));
    const dbsPerInstance = Math.max(1, parseInt(process.env.MONGO_DBS_PER_INSTANCE || '2', 10));

    let maxPoolSize = Number.isFinite(envMax) && envMax > 0 ? envMax : DEFAULT_MAX;
    maxPoolSize = Math.min(maxPoolSize, ABSOLUTE_CAP);
    if (Number.isFinite(globalCap) && globalCap > 0) {
      const perPoolBudget = Math.max(1, Math.floor(globalCap / (instanceCount * dbsPerInstance)));
      maxPoolSize = Math.min(maxPoolSize, perPoolBudget, ABSOLUTE_CAP);
    }

    this.config = {
      maxPoolSize,
      minPoolSize: 5,
      maxIdleTimeMS: 300000,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      heartbeatFrequencyMS: 2000,
      retryWrites: true,
      retryReads: true,
      maxConnecting: 10,
      compressors: ['zlib' as const],
      maxPoolSizePerUser: 2,
      connectionReuse: true,
      batchSize: 5000,
      enableCaching: true,
      connectionTimeout: 10000
    };

    this.status = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingConnections: 0,
      maxPoolSize: this.config.maxPoolSize,
      health: 'healthy',
      lastHealthCheck: new Date(),
      uptime: Date.now(),
      totalOperations: 0,
      averageResponseTime: 0,
      connectionEfficiency: 0,
      userConnectionCount: new Map(),
      cacheHitRate: 0,
      batchOperations: 0
    };

    this.metrics = {
      operationCount: 0,
      totalResponseTime: 0,
      slowQueries: 0,
      errors: 0,
      lastReset: new Date(),
      connectionsSaved: 0,
      batchOperations: 0,
      cacheHits: 0,
      connectionReuseCount: 0
    };
  }

  public static getInstance(): MongoDBConnectionPool {
    if (!MongoDBConnectionPool.instance) {
      MongoDBConnectionPool.instance = new MongoDBConnectionPool();
    }
    return MongoDBConnectionPool.instance;
  }

  public async getConnection(uri: string, dbName: string, userId?: string): Promise<Db> {
    const poolKey = `${uri}_${dbName}`;
    
    try {
      if (this.pools.has(poolKey)) {
        const pool = this.pools.get(poolKey)!;
        return pool;
      }

      const client = new MongoClient(uri, {
        maxPoolSize: this.config.maxPoolSize,
        minPoolSize: this.config.minPoolSize,
        maxIdleTimeMS: this.config.maxIdleTimeMS,
        serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMS,
        connectTimeoutMS: this.config.connectTimeoutMS,
        socketTimeoutMS: this.config.socketTimeoutMS,
        heartbeatFrequencyMS: this.config.heartbeatFrequencyMS,
        retryWrites: this.config.retryWrites,
        retryReads: this.config.retryReads,
        maxConnecting: this.config.maxConnecting,
        compressors: this.config.compressors
      } as MongoClientOptions);

      await client.connect();
      const db = client.db(dbName);

      this.clients.set(poolKey, client);
      this.pools.set(poolKey, db);

      return db;
    } catch (error) {
      console.error(`Failed to get connection for ${dbName}:`, error);
      throw error;
    }
  }

  public async getClient(): Promise<MongoClient> {
    const uri = process.env.MONGODB_URI || process.env.USERS_MONGODB_URI;
    if (!uri) {
      throw new Error('MongoDB URI not found');
    }
    
    const poolKey = `${uri}_client`;
    
    if (this.clients.has(poolKey)) {
      return this.clients.get(poolKey)!;
    }

    const client = new MongoClient(uri, {
      maxPoolSize: this.config.maxPoolSize,
      minPoolSize: this.config.minPoolSize,
      maxIdleTimeMS: this.config.maxIdleTimeMS,
      serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMS,
      connectTimeoutMS: this.config.connectTimeoutMS,
      socketTimeoutMS: this.config.socketTimeoutMS,
      heartbeatFrequencyMS: this.config.heartbeatFrequencyMS,
      retryWrites: this.config.retryWrites,
      retryReads: this.config.retryReads,
      maxConnecting: this.config.maxConnecting,
      compressors: this.config.compressors
    } as MongoClientOptions);

    await client.connect();
    this.clients.set(poolKey, client);
    return client;
  }

  public getPoolStatus(): PoolStatus {
    return { ...this.status };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getPoolConfig(): PoolConfig {
    return { ...this.config };
  }

  public async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.clients.values()).map(client => client.close());
    await Promise.allSettled(closePromises);
    this.clients.clear();
    this.pools.clear();
  }
}

export const mongoPool = MongoDBConnectionPool.getInstance();

export type { PoolConfig, PoolStatus, PerformanceMetrics };

export async function getDatabaseConnection(uri: string, dbName: string, userId?: string): Promise<Db> {
  return mongoPool.getConnection(uri, dbName, userId);
}
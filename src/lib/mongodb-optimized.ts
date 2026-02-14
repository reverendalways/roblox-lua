import { Db } from 'mongodb';
import { mongoPool, getDatabaseConnection } from './mongodb-pool';

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_MONGODB_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI!;

const SCRIPTS_DB = 'mydatabase';
const USERS_DB = 'users';

const CONNECTION_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = CONNECTION_RETRY_CONFIG.maxRetries,
  baseDelay: number = CONNECTION_RETRY_CONFIG.baseDelay
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = Math.min(
        baseDelay * Math.pow(CONNECTION_RETRY_CONFIG.backoffMultiplier, attempt),
        CONNECTION_RETRY_CONFIG.maxDelay
      );
      
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const finalDelay = delay + jitter;
      
      
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError!;
}

function isRetryableError(error: any): boolean {
  const retryableErrors = [
    'MongoNetworkError',
    'MongoTimeoutError',
    'MongoServerSelectionError',
    'MongoWriteConcernError'
  ];
  
  if (retryableErrors.includes(error.name)) {
    return true;
  }
  
  if (error.message && error.message.includes('SSL')) {
    return true;
  }
  
  if (error.message && error.message.includes('timeout')) {
    return true;
  }
  
  return false;
}

export async function getScriptsDatabase(): Promise<Db> {
  return retryWithBackoff(async () => {
    try {
      console.log('Getting scripts database connection...');
      console.log('Connection pool config:', mongoPool.getPoolConfig());
      const db = await getDatabaseConnection(MONGODB_URI, SCRIPTS_DB);
      console.log('Scripts database connected successfully:', db.databaseName);
      return db;
    } catch (error) {
      console.error('Failed to get scripts database connection:', error);
      console.error('Error details:', error);
      
      if (isRetryableError(error)) {
        throw error;
      }
      
      throw new Error(`Scripts database connection failed: ${error.message}`);
    }
  });
}

export async function getUsersDatabase(): Promise<Db> {
  return retryWithBackoff(async () => {
    try {
      console.log('Getting users database connection...');
      console.log('Connection pool config:', mongoPool.getPoolConfig());
      const db = await getDatabaseConnection(USERS_MONGODB_URI, USERS_DB);
      console.log('Users database connected successfully:', db.databaseName);
      return db;
    } catch (error) {
      console.error('Failed to get users database connection:', error);
      console.error('Error details:', error);
      
      if (isRetryableError(error)) {
        throw error;
      }
      
      throw new Error(`Users database connection failed: ${error.message}`);
    }
  });
}

export async function getBothDatabases(): Promise<{ scriptsDb: Db; usersDb: Db }> {
  return retryWithBackoff(async () => {
    try {
      const [scriptsDb, usersDb] = await Promise.all([
        getScriptsDatabase(),
        getUsersDatabase()
      ]);
      
      return { scriptsDb, usersDb };
    } catch (error) {
      console.error('Failed to get both database connections:', error);
      
      if (isRetryableError(error)) {
        throw error;
      }
      
      throw new Error(`Database connection failed: ${error.message}`);
    }
  });
}

export async function connectToDatabase(): Promise<{ db: Db; client: any }> {
  
  
  try {
    const db = await getScriptsDatabase();
    return { 
      db, 
      client: { 
        close: () => {
          
        }
      }
    };
  } catch (error) {
    console.error('Legacy connectToDatabase failed:', error);
    throw error;
  }
}

export function getConnectionPoolStatus() {
  return mongoPool.getPoolStatus();
}

export function getConnectionPoolMetrics() {
  return mongoPool.getPerformanceMetrics();
}

export function getConnectionPoolConfig() {
  return mongoPool.getPoolConfig();
}

export function updateConnectionPoolConfig(newConfig: any) {
  console.warn('Pool configuration updates are not supported at runtime');
}

export function getConnectionPoolStats() {
  return mongoPool.getPoolStatus();
}

export async function closeAllConnections() {
  await mongoPool.closeAllConnections();
}

export { mongoPool };

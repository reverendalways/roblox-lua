import { MongoClient } from 'mongodb';

export interface BatchProcessingConfig {
  batchSize: number;
  maxExecutionTime: number;
  maxBatches: number;
  delayBetweenBatches: number;
}

export interface BatchProcessingResult {
  success: boolean;
  processed: number;
  total: number;
  batches: number;
  errors: string[];
  nextBatch?: number;
  isComplete: boolean;
  executionTime: number;
}

export interface BatchProcessorOptions {
  collection: string;
  database: string;
  filter?: any;
  updateOperation: (docs: any[]) => Promise<any[]>;
  progressCallback?: (progress: { current: number; total: number; batch: number }) => void;
  config?: Partial<BatchProcessingConfig>;
}

export class BatchProcessor {
  private static readonly DEFAULT_CONFIG: BatchProcessingConfig = {
    batchSize: 1000,
    maxExecutionTime: 8000,
    maxBatches: 5,
    delayBetweenBatches: 0
  };

  static async processBatch(
    mongoUri: string,
    options: BatchProcessorOptions
  ): Promise<BatchProcessingResult> {
    const config = { ...this.DEFAULT_CONFIG, ...options.config };
    const startTime = Date.now();
    let client: MongoClient | null = null;

    try {
      client = new MongoClient(mongoUri);
      await client.connect();
      
      const db = client.db(options.database);
      const collection = db.collection(options.collection);
      
      const total = await collection.countDocuments(options.filter || {});
      if (total === 0) {
        return {
          success: true,
          processed: 0,
          total: 0,
          batches: 0,
          errors: [],
          isComplete: true,
          executionTime: Date.now() - startTime
        };
      }

      const totalBatches = Math.ceil(total / config.batchSize);
      let processed = 0;
      let currentBatch = 0;
      const errors: string[] = [];

      while (currentBatch < Math.min(config.maxBatches, totalBatches)) {
        const batchStartTime = Date.now();
        
        if (Date.now() - startTime > config.maxExecutionTime) {
          break;
        }

        try {
          const skip = currentBatch * config.batchSize;
          const docs = await collection
            .find(options.filter || {})
            .skip(skip)
            .limit(config.batchSize)
            .toArray();

          if (docs.length === 0) break;

          const results = await options.updateOperation(docs);
          processed += results.length;

          if (options.progressCallback) {
            options.progressCallback({
              current: processed,
              total,
              batch: currentBatch + 1
            });
          }

          currentBatch++;

          if (currentBatch < Math.min(config.maxBatches, totalBatches) && 
              Date.now() - startTime < config.maxExecutionTime) {
            await this.delay(config.delayBetweenBatches);
          }

        } catch (error) {
          errors.push(`Batch ${currentBatch + 1}: ${error instanceof Error ? error.message : String(error)}`);
          currentBatch++;
        }
      }

      const isComplete = currentBatch >= totalBatches;
      const nextBatch = isComplete ? undefined : currentBatch;

      return {
        success: errors.length === 0,
        processed,
        total,
        batches: currentBatch,
        errors,
        nextBatch,
        isComplete,
        executionTime: Date.now() - startTime
      };

    } finally {
      if (client) await client.close();
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async processAllBatches(
    mongoUri: string,
    options: BatchProcessorOptions
  ): Promise<BatchProcessingResult[]> {
    const results: BatchProcessingResult[] = [];
    let currentBatch = 0;
    let isComplete = false;

    while (!isComplete) {
      const result = await this.processBatch(mongoUri, {
        ...options,
        config: {
          ...options.config,
          maxBatches: 1
        }
      });

      results.push(result);
      isComplete = result.isComplete;
      currentBatch = result.nextBatch || 0;

      if (!isComplete && result.nextBatch !== undefined) {
        await this.delay(2000);
      }
    }

    return results;
  }
}


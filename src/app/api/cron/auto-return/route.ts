import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getScriptsDatabase, getUsersDatabase } from '@/lib/mongodb-optimized';

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const SCRIPTS_DB = process.env.SCRIPTS_DB || 'mydatabase';
const SCRIPTS_COL = process.env.SCRIPTS_COL || 'scripts';


const BATCH_SIZE = 1000;
const MAX_EXECUTION_TIME = 8000;

const PROMOTION_III_THRESHOLD = 6 * 60 * 60 * 1000;
const PROMOTION_IV_THRESHOLD = 1 * 60 * 60 * 1000;



export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    

    const { batch = 0, batchSize = BATCH_SIZE } = await request.json().catch(() => ({}));
    
    const db = await getScriptsDatabase();
    const scriptsCol = db.collection(SCRIPTS_COL);
    
    const now = new Date();
    
    const totalScriptsNeedingUpdate = await scriptsCol.countDocuments({
      $or: [
        {
          promotionTier: 'III',
          promotionActive: true,
          lastActivity: { $lt: new Date(now.getTime() - PROMOTION_III_THRESHOLD) }
        },
        {
          promotionTier: 'IV',
          promotionActive: true,
          lastActivity: { $lt: new Date(now.getTime() - PROMOTION_IV_THRESHOLD) }
        }
      ]
    });
    
    const totalBatches = Math.ceil(totalScriptsNeedingUpdate / batchSize);
    
    const skip = batch * batchSize;
    const scriptsNeedingUpdate = await scriptsCol.find({
      $or: [
        {
          promotionTier: 'III',
          promotionActive: true,
          lastActivity: { $lt: new Date(now.getTime() - PROMOTION_III_THRESHOLD) }
        },
        {
          promotionTier: 'IV',
          promotionActive: true,
          lastActivity: { $lt: new Date(now.getTime() - PROMOTION_IV_THRESHOLD) }
        }
      ]
    }).skip(skip).limit(batchSize).toArray();
    
    let updated = 0;
    let promotionIIIUpdated = 0;
    let promotionIVUpdated = 0;
    
    const bulkOps: any[] = [];
    
    for (const script of scriptsNeedingUpdate) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        break;
      }
      
      bulkOps.push({
        updateOne: {
          filter: { _id: script._id },
          update: { $set: { lastActivity: now } }
        }
      });
      
      updated++;
      
      if (script.promotionTier === 'III') {
        promotionIIIUpdated++;
      } else if (script.promotionTier === 'IV') {
        promotionIVUpdated++;
      }
    }
    
    if (bulkOps.length > 0) {
      await scriptsCol.bulkWrite(bulkOps);
    }
    
    const hasMore = (batch + 1) * batchSize < totalScriptsNeedingUpdate;
    const progress = Math.min(((batch + 1) * batchSize / totalScriptsNeedingUpdate) * 100, 100);
    
    return NextResponse.json({ 
      success: true,
      message: `Auto-return batch complete. Updated ${updated} scripts.`,
      batch,
      batchSize,
      totalScriptsNeedingUpdate,
      totalBatches,
      progress: Math.round(progress * 100) / 100,
      hasMore,
      nextBatch: hasMore ? batch + 1 : null,
      processed: scriptsNeedingUpdate.length,
      updated,
      promotionIIIUpdated,
      promotionIVUpdated,
      executionTime: Date.now() - startTime
    });
    
  } catch (error) {

    return NextResponse.json({ 
      error: 'Failed to process auto-return', 
      details: String(error),
      batch: 0,
      executionTime: Date.now() - startTime
    }, { status: 500 });
  } finally {
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

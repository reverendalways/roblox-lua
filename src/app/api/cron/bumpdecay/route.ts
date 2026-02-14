import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getScriptsDatabase, getUsersDatabase } from '@/lib/mongodb-optimized';

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';


const BATCH_SIZE = 1000;
const MAX_EXECUTION_TIME = 8000;



export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    

    const { batch = 0, batchSize = BATCH_SIZE } = await req.json().catch(() => ({}));
    
    const db = await getScriptsDatabase();
    const scriptsCol = db.collection('scripts');
    
    const now = new Date().toISOString();
    
    const totalExpiredBumps = await scriptsCol.countDocuments({
      isBumped: true,
      bumpExpire: { $type: 'string', $ne: '', $lte: now }
    });
    const totalBatches = Math.ceil(totalExpiredBumps / batchSize);
    
    const skip = batch * batchSize;
    const expiredBumps = await scriptsCol.find({
      isBumped: true,
      bumpExpire: { $type: 'string', $ne: '', $lte: now }
    }).skip(skip).limit(batchSize).toArray();
    
    let updated = 0;
    
    const bulkOps: any[] = [];
    
    for (const script of expiredBumps) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        break;
      }
      
      bulkOps.push({
        updateOne: {
          filter: { _id: script._id },
          update: { $set: { isBumped: false, bumpExpire: '' } }
        }
      });
      updated++;
    }
    
    if (bulkOps.length > 0) {
      await scriptsCol.bulkWrite(bulkOps);
    }
    
    const hasMore = (batch + 1) * batchSize < totalExpiredBumps;
    const progress = Math.min(((batch + 1) * batchSize / totalExpiredBumps) * 100, 100);
    
    return NextResponse.json({ 
      success: true, 
      batch,
      batchSize,
      totalExpiredBumps,
      totalBatches,
      progress: Math.round(progress * 100) / 100,
      hasMore,
      nextBatch: hasMore ? batch + 1 : null,
      processed: expiredBumps.length,
      updated,
      executionTime: Date.now() - startTime
    });
    
  } catch (err) {
    return NextResponse.json({ 
      error: 'Failed to process bump decay', 
      details: String(err),
      executionTime: Date.now() - startTime
    }, { status: 500 });
  } finally {
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

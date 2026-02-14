import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getScriptsDatabase, getUsersDatabase } from '@/lib/mongodb-optimized';

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';


const BATCH_SIZE = 500;
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
    const codesCol = db.collection('codes');
    const scriptsCol = db.collection('scripts');
    
    const now = new Date();
    
    const totalExpiredCodes = await codesCol.countDocuments({
      active: true,
      expiresAt: { $type: 'date', $lte: now }
    });
    const totalBatches = Math.ceil(totalExpiredCodes / batchSize);
    
    const skip = batch * batchSize;
    const expiredCodes = await codesCol.find({
      active: true,
      expiresAt: { $type: 'date', $lte: now }
    }).skip(skip).limit(batchSize).toArray();
    
    let codesUpdated = 0;
    let scriptsUpdated = 0;
    
    const codeBulkOps: any[] = [];
    const scriptBulkOps: any[] = [];
    
    for (const code of expiredCodes) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        break;
      }
      
      codeBulkOps.push({
        updateOne: {
          filter: { _id: code._id },
          update: { $set: { active: false } }
        }
      });
      codesUpdated++;
      
      const scriptsUsingCode = await scriptsCol.find({
        promotionCode: code.code,
        promotionActive: true
      }).toArray();
      
      for (const script of scriptsUsingCode) {
        scriptBulkOps.push({
          updateOne: {
            filter: { _id: script._id },
            update: { 
              $set: { 
                promotionActive: false,
                promotionTier: null,
                promotionCode: null
              }
            }
          }
        });
        scriptsUpdated++;
      }
    }
    
    if (codeBulkOps.length > 0) {
      await codesCol.bulkWrite(codeBulkOps);
    }
    if (scriptBulkOps.length > 0) {
      await scriptsCol.bulkWrite(scriptBulkOps);
    }
    
    const hasMore = (batch + 1) * batchSize < totalExpiredCodes;
    const progress = Math.min(((batch + 1) * batchSize / totalExpiredCodes) * 100, 100);
    
    return NextResponse.json({ 
      success: true, 
      batch,
      batchSize,
      totalExpiredCodes,
      totalBatches,
      progress: Math.round(progress * 100) / 100,
      hasMore,
      nextBatch: hasMore ? batch + 1 : null,
      processed: expiredCodes.length,
      codesUpdated,
      scriptsUpdated,
      executionTime: Date.now() - startTime
    });
    
  } catch (err) {
    return NextResponse.json({ 
      error: 'Failed to process promotion decay', 
      details: String(err),
      executionTime: Date.now() - startTime
    }, { status: 500 });
  } finally {
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getScriptsDatabase } from '@/lib/mongodb-optimized';

const MONGODB_URI = process.env.MONGODB_URI!;

const BATCH_SIZE = 500;
const MAX_EXECUTION_TIME = 8000;

export async function POST(req: NextRequest) {
  let client: null = null;
  const startTime = Date.now();
  
  try {
    const { batch = 0, batchSize = BATCH_SIZE } = await req.json().catch(() => ({}));
    
    const db = await getScriptsDatabase();
    const codesCol = db.collection('codes');
    const scriptsCol = db.collection('scripts');

    const now = new Date();
    
    const totalExpiredCodes = await codesCol.countDocuments({ 
      expiresAt: { $ne: null, $lte: now }, 
      expired: { $ne: true } 
    });
    const totalBatches = Math.ceil(totalExpiredCodes / batchSize);
    
    const skip = batch * batchSize;
    const expiredCodes = await codesCol.find({ 
      expiresAt: { $ne: null, $lte: now }, 
      expired: { $ne: true } 
    }).skip(skip).limit(batchSize).toArray();
    
    let updatedCount = 0;
    let totalScriptsAffected = 0;
    
    const codesBulkOps: any[] = [];
    const scriptsBulkOps: any[] = [];
    
    for (const code of expiredCodes) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        break;
      }
      
      const scriptRes = await scriptsCol.updateMany(
        { promotionCode: code.code },
        { $set: {
            promotionTier: null,
            promotionCode: null,
            promotionExpiresAt: null,
            promotionActive: false
          }
        }
      );
      
      if (scriptRes.modifiedCount > 0) {
        totalScriptsAffected += scriptRes.modifiedCount;
      }
      
      codesBulkOps.push({
        updateOne: {
          filter: { _id: code._id },
          update: { $set: { active: false, expired: true } }
        }
      });
      
      updatedCount++;
    }
    
    if (codesBulkOps.length > 0) {
      await codesCol.bulkWrite(codesBulkOps);
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
      expiredCount: updatedCount,
      totalScriptsAffected,
      executionTime: Date.now() - startTime
    });
    
  } catch (err) {
    return NextResponse.json({ 
      error: 'Failed to expire promotions', 
      details: String(err),
      executionTime: Date.now() - startTime
    }, { status: 500 });
  } finally {
    
  }
}

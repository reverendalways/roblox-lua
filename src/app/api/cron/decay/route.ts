import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getScriptsDatabase, getUsersDatabase } from "@/lib/mongodb-optimized";

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const SCRIPTS_DB = 'mydatabase';
const SCRIPTS_COL = 'scripts';


const BATCH_SIZE = 1000;
const MAX_EXECUTION_TIME = 8000;



function calculateDecay(createdAt: Date | string, currentPoints: number) {
  const now = new Date();
  const created = new Date(createdAt);
  const msSince = now.getTime() - created.getTime();
  const periods = Math.floor(msSince / (30 * 24 * 60 * 60 * 1000));
  
  if (periods > 0) {
    return Math.floor(currentPoints * Math.pow(0.5, periods));
  }
  return currentPoints;
}

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
    
    const totalDocs = await scriptsCol.countDocuments({});
    const totalBatches = Math.ceil(totalDocs / batchSize);
    
    const skip = batch * batchSize;
    const scripts = await scriptsCol.find({}).skip(skip).limit(batchSize).toArray();
    
    let updated = 0;
    let decayed = 0;
    let totalDecayAmount = 0;
    
    const bulkOps: any[] = [];
    
    for (const script of scripts) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        break;
      }
      
      if (!script.createdAt) continue;
      
      const currentPoints = typeof script.points === 'number' ? script.points : 0;
      const newPoints = calculateDecay(script.createdAt, currentPoints);
      
      if (newPoints !== currentPoints) {
        bulkOps.push({
          updateOne: {
            filter: { _id: script._id },
            update: { $set: { points: newPoints } }
          }
        });
        updated++;
        decayed++;
        totalDecayAmount += (currentPoints - newPoints);
      }
    }
    
    if (bulkOps.length > 0) {
      await scriptsCol.bulkWrite(bulkOps);
    }
    
    const hasMore = (batch + 1) * batchSize < totalDocs;
    const progress = Math.min(((batch + 1) * batchSize / totalDocs) * 100, 100);
    
    return NextResponse.json({ 
      success: true,
      message: `Decay batch complete. Updated ${updated} scripts.`,
      batch,
      batchSize,
      totalDocs,
      totalBatches,
      progress: Math.round(progress * 100) / 100,
      hasMore,
      nextBatch: hasMore ? batch + 1 : null,
      processed: scripts.length,
      updated,
      decayed,
      totalDecayAmount,
      executionTime: Date.now() - startTime
    });
    
  } catch (error) {

    return NextResponse.json({ 
      error: 'Failed to process decay', 
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

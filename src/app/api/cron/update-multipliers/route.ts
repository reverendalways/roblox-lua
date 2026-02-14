import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getScriptsDatabase, getUsersDatabase } from '@/lib/mongodb-optimized';
import { mongoPool } from '@/lib/mongodb-pool';


const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';


const BATCH_SIZE = 1000;
const MAX_EXECUTION_TIME = 8000;

const MULTIPLIERS = [
  { maxAge: 60 * 60 * 1000, multiplier: 2.0 },
  { maxAge: 24 * 60 * 60 * 1000, multiplier: 1.6 },
  { maxAge: 3 * 24 * 60 * 60 * 1000, multiplier: 1.4 },
  { maxAge: 7 * 24 * 60 * 60 * 1000, multiplier: 1.3 },
  { maxAge: 14 * 24 * 60 * 60 * 1000, multiplier: 1.15 },
  { maxAge: 30 * 24 * 60 * 60 * 1000, multiplier: 1.1 },
  { maxAge: 90 * 24 * 60 * 60 * 1000, multiplier: 1.0 },
  { maxAge: Infinity, multiplier: 0.9 },
];

function getFreshnessMultiplier(createdAt: Date | string) {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const age = now - created;
  for (const window of MULTIPLIERS) {
    if (age <= window.maxAge) return window.multiplier;
  }
  return 1.0;
}

function calculateMultiplier(script: any, user: any) {
  const freshnessMultiplier = getFreshnessMultiplier(script.createdAt);
  
  let promotionMultiplier = 0;
  if (script.promotionActive && script.promotionTier) {
    switch (script.promotionTier) {
      case 'I':
      case 'Promotion I':
        promotionMultiplier = 0.2;
        break;
      case 'II':
      case 'Promotion II':
        promotionMultiplier = 0.35;
        break;
      case 'III':
      case 'Promotion III':
        promotionMultiplier = 0.5;
        break;
      case 'IV':
      case 'Promotion IV':
        promotionMultiplier = 0.7;
        break;
    }
  }
  
  const verificationMultiplier = user ? 0.4 : 0;
  
  let bumpBonus = 0;
  if (script.isBumped) {
    if (script.promotionTier === 1 || script.promotionTier === 'I' || script.promotionTier === 'Promotion I') bumpBonus = 0.10;
    else if (script.promotionTier === 2 || script.promotionTier === 'II' || script.promotionTier === 'Promotion II') bumpBonus = 0.15;
    else if (script.promotionTier === 3 || script.promotionTier === 'III' || script.promotionTier === 'Promotion III') bumpBonus = 0.20;
    else if (script.promotionTier === 4 || script.promotionTier === 'IV' || script.promotionTier === 'Promotion IV') bumpBonus = 0.25;
    else bumpBonus = 0.05;
  }
  
  let multiplier = freshnessMultiplier * (1 + promotionMultiplier) * (1 + verificationMultiplier) * (1 + bumpBonus);
  return Math.round(multiplier * 1000) / 1000;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    

    const { batch = 0, batchSize = BATCH_SIZE } = await req.json().catch(() => ({}));
    
    const scriptsDb = await getScriptsDatabase();
    const scriptsCol = scriptsDb.collection('scripts');
    
    const usersDb = await getUsersDatabase();
    const usersCol = usersDb.collection('ScriptVoid');
    

    const totalDocs = await scriptsCol.countDocuments({});
    const totalBatches = Math.ceil(totalDocs / batchSize);
    
    const skip = batch * batchSize;
    const scripts = await scriptsCol.find({}).skip(skip).limit(batchSize).toArray();
    
    let updated = 0;
    let verifiedUpdated = 0;
    let verifiedCount = 0;
    let unverifiedCount = 0;
    
    const bulkOps: any[] = [];
    const userCache = new Map();
    
    for (const script of scripts) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        break;
      }
      
      let user: any = null;
      const cacheKey = script.ownerUserId || script.ownerId || script.ownerUsername;
      
      if (userCache.has(cacheKey)) {
        user = userCache.get(cacheKey);
      } else {
        if (script.ownerUserId && typeof script.ownerUserId === 'string' && script.ownerUserId.length === 24) {
          const orArr: any[] = [];
          try { orArr.push({ _id: new ObjectId(script.ownerUserId) }); } catch {}
          orArr.push({ _id: script.ownerUserId });
          user = await usersCol.findOne({ $or: orArr, verified: true });
        } else if (script.ownerId || script.ownerUsername) {
          const orArr: any[] = [];
        
        if (script.ownerId) orArr.push({ username: { $regex: script.ownerId, $options: 'i' } });
        if (script.ownerUsername) orArr.push({ username: { $regex: script.ownerUsername, $options: 'i' } });
          if (orArr.length > 0) {
            user = await usersCol.findOne({ $or: orArr, verified: true });
          }
        }
        userCache.set(cacheKey, user);
      }
      
      const newOwnerVerified = !!user;
      const newIsVerified = !!user;
      if (script.ownerVerified !== newOwnerVerified || script.isVerified !== newIsVerified) {
        bulkOps.push({
          updateOne: {
            filter: { _id: script._id },
            update: { $set: { ownerVerified: newOwnerVerified, isVerified: newIsVerified } }
          }
        });
        updated++;
        if (newOwnerVerified) verifiedUpdated++;
      }
      
      const newMultiplier = calculateMultiplier(script, user);
      if (script.multiplier !== newMultiplier) {
        bulkOps.push({
          updateOne: {
            filter: { _id: script._id },
            update: { $set: { multiplier: newMultiplier } }
          }
        });
        updated++;
      }
      
      if (user) {
        verifiedCount++;
      } else {
        unverifiedCount++;
      }
    }
    
    if (bulkOps.length > 0) {
      await scriptsCol.bulkWrite(bulkOps);
    }
    
    const hasMore = (batch + 1) * batchSize < totalDocs;
    const progress = Math.min(((batch + 1) * batchSize / totalDocs) * 100, 100);
    
    
    
    return NextResponse.json({ 
      success: true, 
      batch,
      batchSize,
      totalDocs,
      totalBatches,
      progress: Math.round(progress * 100) / 100,
      hasMore,
      nextBatch: hasMore ? batch + 1 : null,
      processed: scripts.length,
      updated,
      verifiedUpdated,
      verifiedCount,
      unverifiedCount,
      executionTime: Date.now() - startTime
    }, { status: 200 });
    
  } catch (err) {

    return NextResponse.json({ 
      error: 'Failed to update multipliers', 
      details: String(err),
      executionTime: Date.now() - startTime
    }, { status: 500 });
  } finally {
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

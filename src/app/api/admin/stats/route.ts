import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { checkAdminAccess } from '@/lib/admin-utils';
import jwt from 'jsonwebtoken';
import { getUsersDatabase, getScriptsDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ONLINE_COL = 'online';
const SCRIPTS_DB = process.env.SCRIPTS_DB || 'mydatabase';
const SCRIPTS_COL = process.env.SCRIPTS_COL || 'scripts';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

const BATCH_SIZE = 2000;
const MAX_EXECUTION_TIME = 8000;



export async function POST(req: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const { userId: pingUserId, sessionId } = await req.json().catch(() => ({}));
    const now = Date.now();

    const usersDb = await getUsersDatabase();
    const onlineCol = usersDb.collection(ONLINE_COL);
    if (pingUserId) {
      await onlineCol.updateOne(
        { userId: pingUserId },
        { $set: { userId: pingUserId, type: 'user', lastPing: now } },
        { upsert: true }
      );
    } else if (sessionId) {
      await onlineCol.updateOne(
        { sessionId },
        { $set: { sessionId, type: 'guest', lastPing: now } },
        { upsert: true }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const now = Date.now();
    const usersDb = await getUsersDatabase();
    const onlineCol = usersDb.collection(ONLINE_COL);
    
    const { batch = 0, batchSize = BATCH_SIZE } = await req.json().catch(() => ({}));
    
    const totalExpiredEntries = await onlineCol.countDocuments({ lastPing: { $lt: now - 30000 } });
    const totalBatches = Math.ceil(totalExpiredEntries / batchSize);
    
    const skip = batch * batchSize;
    const expiredEntries = await onlineCol.find({ lastPing: { $lt: now - 30000 } })
      .skip(skip)
      .limit(batchSize)
      .toArray();
    
    let cleanedUp = 0;
    
    const bulkOps: any[] = [];
    
    for (const entry of expiredEntries) {
      bulkOps.push({
        deleteOne: { filter: { _id: entry._id } }
      });
      cleanedUp++;
    }
    
    if (bulkOps.length > 0) {
      await onlineCol.bulkWrite(bulkOps);
    }
    
    const guestsOnline = await onlineCol.countDocuments({ type: 'guest', lastPing: { $gte: now - 30000 } });
    const usersOnline = await onlineCol.countDocuments({ type: 'user', lastPing: { $gte: now - 30000 } });
    
    const scriptsDb = await getScriptsDatabase();
    const scriptsCol = scriptsDb.collection(SCRIPTS_COL);
    const scriptsCount = await scriptsCol.countDocuments({});
    
    let adminName = null;
    const token = req.cookies.get('token');
    if (token) {
      try {
        const payload: any = jwt.verify(token.value, JWT_SECRET);
        if (payload && payload.username) adminName = payload.username;
      } catch {}
    }
    
    
    const hasMore = (batch + 1) * batchSize < totalExpiredEntries;
    const progress = Math.min(((batch + 1) * batchSize / totalExpiredEntries) * 100, 100);
    
    return NextResponse.json({ 
      guestOnline: guestsOnline, 
      usersOnline, 
      scriptsCount, 
      adminName,
      batch,
      batchSize,
      totalExpiredEntries,
      totalBatches,
      progress: Math.round(progress * 100) / 100,
      hasMore,
      nextBatch: hasMore ? batch + 1 : null,
      processed: expiredEntries.length,
      cleanedUp
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

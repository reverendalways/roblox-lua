import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = 'users';
const COLLECTION = 'UserNotifications';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

const notificationsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000;

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get('token');
    if (!token) return null;
    
    const payload: any = jwt.verify(token.value, JWT_SECRET);
    const userId = payload.userId && typeof payload.userId === 'string' && payload.userId.length === 24 ? payload.userId : null;
    return userId;
  } catch {
    return null;
  }
}

function s(v: any) { return (typeof v === 'string' ? v : '').trim(); }

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = s(searchParams.get('userId'));
    
    if (requestedUserId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const limitParam = Number(searchParams.get('limit'));
    const offsetParam = Number(searchParams.get('offset'));
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, Math.floor(limitParam))) : 20;
    const offset = Number.isFinite(offsetParam) ? Math.max(0, Math.floor(offsetParam)) : 0;
    
    const now = Date.now();
    const cacheKey = `${userId}_${limit}_${offset}`;
    const cachedNotifications = notificationsCache.get(cacheKey);
    if (cachedNotifications && (now - cachedNotifications.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cachedNotifications.data,
        cached: true,
        cacheAge: Math.round((now - cachedNotifications.timestamp) / 1000)
      });
    }
    
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(COLLECTION);
    const docs = await col
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    const result = docs.map(d => ({
      id: d._id,
      type: d.type,
      message: d.message,
      read: !!d.read,
      date: d.createdAt,
    }));

    notificationsCache.set(cacheKey, { data: result, timestamp: now });
    
    return NextResponse.json(result);
  } catch (e) {
    console.error('Notifications fetch error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    if (!process.env.CRON_SECRET || bearer !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const userId = s(body.userId);
    const message = s(body.message);
    const type = s(body.type) || 'Info';
    
    if (!userId || !message) return NextResponse.json({ error: 'userId and message required' }, { status: 400 });
    
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }
    
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(COLLECTION);
    const doc = { 
      userId: new ObjectId(userId), 
      type, 
      message, 
      read: false, 
      createdAt: new Date().toISOString() 
    };
    const res = await col.insertOne(doc);
    return NextResponse.json({ id: res.insertedId, ...doc });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedUserId = s(body.userId);
    
    if (requestedUserId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (body.markAllRead) {
      const usersDb = await getUsersDatabase();
    const col = usersDb.collection(COLLECTION);
      await col.updateMany(
        { userId: new ObjectId(userId), read: { $ne: true } }, 
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Nothing to do' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

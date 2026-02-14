import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_COL = 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

async function getClientDb() { return await getUsersDatabase(); }

const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_TTL_MS = 300000;

async function getUserId(req: NextRequest) {
  const token = req.cookies.get('token');
  if (token) {
    try { 
      const payload: any = jwt.verify(token.value, JWT_SECRET, { 
        algorithms: ['HS256'] 
      });
      
      if (payload.userId && ObjectId.isValid(payload.userId)) {
        return payload.userId;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  return null;
}

export async function GET(req: NextRequest) {
  try {
    
    const userId = await getUserId(req);
    
    if (!userId) {
      return NextResponse.json({ isAdmin: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const cacheKey = `${userId}`;
    const cachedAdmin = adminCache.get(cacheKey);
    if (cachedAdmin && (now - cachedAdmin.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json({
        isAdmin: cachedAdmin.isAdmin,
        cached: true,
        cacheAge: Math.round((now - cachedAdmin.timestamp) / 1000)
      });
    }

    const db = await getClientDb();
    const col = db.collection(USERS_COL);
    
    let userDoc: any = null;
    
    if (ObjectId.isValid(userId)) {
      const projection: Record<string, number> = { staffRank: 1 };
      if (ADMIN_FIELD) projection[ADMIN_FIELD] = 1;
      userDoc = await col.findOne(
        { _id: new ObjectId(userId) },
        { projection, maxTimeMS: 3000 }
      );
    }
    

    let isUserAdmin = false;
    if (userDoc) {
      isUserAdmin = 
        (ADMIN_FIELD && userDoc[ADMIN_FIELD] === ADMIN_FIELD_VALUE) ||
        userDoc.staffRank === 'owner' ||
        userDoc.staffRank === 'senior_moderator' ||
        userDoc.staffRank === 'moderator' ||
        userDoc.staffRank === 'junior_moderator';
    }

    adminCache.set(cacheKey, { isAdmin: isUserAdmin, timestamp: now });


    return NextResponse.json({ isAdmin: isUserAdmin });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false, error: 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { rateLimitByIP } from '@/middleware/rate-limit';

const uri = process.env.USERS_MONGODB_URI;
const dbName = 'users';
const collectionName = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

import { getUsersDatabase } from '@/lib/mongodb-optimized';

const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 0;

export async function GET(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'userInfo');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    let payload: any = null;
    
    const tokenCookie = req.cookies.get('token');
    if (tokenCookie) {
      try {
        payload = jwt.verify(tokenCookie.value, JWT_SECRET);
      } catch (error) {
      }
    }
    
    if (!payload) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const tokenValue = authHeader.substring(7);
        try {
          payload = jwt.verify(tokenValue, JWT_SECRET);
        } catch (error) {
        }
      }
    }
    
    if (!payload) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const cacheKey = `${payload.userId || payload.username || payload.id || payload.email}`;
    
    const now = Date.now();
    const cachedUser = userCache.get(cacheKey);
    if (CACHE_TTL_MS > 0) {
      if (cachedUser && (now - cachedUser.timestamp) < CACHE_TTL_MS) {
        const r = NextResponse.json({
          ...cachedUser.data,
          cached: true,
          cacheAge: Math.round((now - cachedUser.timestamp) / 1000)
        });
        r.headers.set('Cache-Control', 'no-store');
        return r;
      }
    }

    const usersDb = await getUsersDatabase();
    const users = usersDb.collection(collectionName);

    let doc: any = null;
    
    if (payload.userId && ObjectId.isValid(payload.userId)) {
      doc = await users.findOne(
        { _id: new ObjectId(payload.userId) },
        { 
          projection: { 
            username: 1, 
            email: 1, 
            accountthumbnail: 1, 
            lastUsernameChange: 1, 
            last_username_change: 1,
            isTimeouted: 1,
            timeoutEnd: 1,
            timeoutReason: 1,
            timeoutAt: 1,
            staffRank: 1,
            verified: 1,
            bio: 1,
            accountStatus: 1,
            ...(ADMIN_FIELD ? { [ADMIN_FIELD]: 1 } : {})
          },
          maxTimeMS: 1500
        }
      );
    }
    
    if (!doc && payload.username) {
      doc = await users.findOne(
        { username: payload.username },
        { 
          projection: { 
            username: 1, 
            email: 1, 
            accountthumbnail: 1, 
            lastUsernameChange: 1, 
            last_username_change: 1,
            isTimeouted: 1,
            timeoutEnd: 1,
            timeoutReason: 1,
            timeoutAt: 1,
            staffRank: 1,
            verified: 1,
            bio: 1,
            accountStatus: 1,
            ...(ADMIN_FIELD ? { [ADMIN_FIELD]: 1 } : {})
          },
          maxTimeMS: 1500
        }
      );
    }
    
    if (!doc && payload.id && ObjectId.isValid(payload.id)) {
      doc = await users.findOne(
        { _id: new ObjectId(payload.id) },
        { 
          projection: { 
            username: 1, 
            email: 1, 
            accountthumbnail: 1, 
            lastUsernameChange: 1, 
            last_username_change: 1,
            isTimeouted: 1,
            timeoutEnd: 1,
            timeoutReason: 1,
            timeoutAt: 1,
            staffRank: 1,
            verified: 1,
            bio: 1,
            accountStatus: 1,
            ...(ADMIN_FIELD ? { [ADMIN_FIELD]: 1 } : {})
          },
          maxTimeMS: 1500
        }
      );
    }
    
    if (!doc && payload.email) {
      doc = await users.findOne(
        { email: payload.email },
        { 
          projection: { 
            username: 1, 
            email: 1, 
            accountthumbnail: 1, 
            lastUsernameChange: 1, 
            last_username_change: 1,
            isTimeouted: 1,
            timeoutEnd: 1,
            timeoutReason: 1,
            timeoutAt: 1,
            staffRank: 1,
            verified: 1,
            bio: 1,
            accountStatus: 1,
            ...(ADMIN_FIELD ? { [ADMIN_FIELD]: 1 } : {})
          },
          maxTimeMS: 1500
        }
      );
    }
    
    if (!doc) {
      {
        const r = NextResponse.json({ error: 'User not found' }, { status: 404 });
        r.headers.set('Cache-Control', 'no-store');
        return r;
      }
    }
    
    if (payload.userId && ObjectId.isValid(payload.userId)) {
      try {
        const updateResult = await users.updateOne(
          { _id: new ObjectId(payload.userId) },
          { $set: { lastSeen: new Date() } }
        );
        console.log(`Updated lastSeen for user ${payload.userId}, modified: ${updateResult.modifiedCount}`);
      } catch (error) {
        console.error('Failed to update lastSeen:', error);
      }
    }
    
    const lastUsernameChange = doc.lastUsernameChange || doc.last_username_change || null;

    const isUserAdmin = 
      (ADMIN_FIELD && doc[ADMIN_FIELD] === ADMIN_FIELD_VALUE) ||
      doc.staffRank === 'owner' ||
      doc.staffRank === 'senior_moderator' ||
      doc.staffRank === 'moderator' ||
      doc.staffRank === 'junior_moderator';
    
    const response = {
      id: String(doc._id),
      username: doc.username,
      email: doc.email,
      accountthumbnail: doc.accountthumbnail || '',
      lastUsernameChange,
      isTimeouted: doc.isTimeouted || false,
      timeoutEnd: doc.timeoutEnd || null,
      timeoutReason: doc.timeoutReason || null,
      timeoutAt: doc.timeoutAt || null,
      timeoutDuration: doc.timeoutDuration || null,
      timeoutDurationUnit: doc.timeoutDurationUnit || null,
      isAdmin: isUserAdmin,
      role: isUserAdmin ? 'admin' : 'user',
      admin: isUserAdmin,
      bio: doc.bio || '',
      verified: doc.verified || false,
      accountStatus: doc.accountStatus || 'all_good'
    };


    if (CACHE_TTL_MS > 0) userCache.set(cacheKey, { data: response, timestamp: now });
    const ok = NextResponse.json(response);
    ok.headers.set('Cache-Control', 'no-store');
    return ok;
  } catch (err) {
    const r = NextResponse.json({ error: 'Server error' }, { status: 500 });
    r.headers.set('Cache-Control', 'no-store');
    return r;
  }
}

export async function POST(req: Request) {
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await req.json();
    
    const allowedFields = ['email', 'username'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in user info: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'verified', 'lastOnline', 'lastSeen', 
      'accountthumbnail', 'lastUsernameChange', 'totalScripts', 
      'totalViews', 'totalPoints', 'leaderboardPosition', 'lastStatsUpdate', 
      'lastLeaderboardUpdate', 'isTimeouted', 'timeoutEnd', 'timeoutReason',
      'admin', 'isAdmin', 'role', 'permissions', 'bio', 'password'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in user info: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.email !== undefined && typeof body.email !== 'string') {
      return NextResponse.json({ error: "Email must be a string" }, { status: 400 });
    }
    if (body.username !== undefined && typeof body.username !== 'string') {
      return NextResponse.json({ error: "Username must be a string" }, { status: 400 });
    }

    const { email, username } = body;
    if (!email && !username) {
      return NextResponse.json({ error: 'Missing email or username' }, { status: 400 });
    }
    const usersDb = await getUsersDatabase();
    const users = usersDb.collection(collectionName);
    let user: any = null;
    if (email) {
      user = await users.findOne({ email });
    } else if (username) {
      user = await users.findOne({ username });
    }
        if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ username: user.username, nickname: user.nickname || '', email: user.email });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function userinfo(req: NextRequest) {
  try {
    const token = req.cookies.get('token');
    if (!token) return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    let payload: any = null;
    try {
      payload = jwt.verify(token.value, JWT_SECRET);
    } catch {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }
    const userId = payload.userId;
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }
    const usersDb = await getUsersDatabase();
    const users = usersDb.collection(collectionName);
    const user = await users.findOne({ _id: new ObjectId(userId) });
        if (!user) return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    return NextResponse.json({
      isLoggedIn: true,
      userId: user._id.toString(),
      username: user.username,
      nickname: user.nickname || '',
      accountthumbnail: user.accountthumbnail || '',
      bio: user.bio || ''
    });
  } catch {
    return NextResponse.json({ isLoggedIn: false }, { status: 500 });
  }
}

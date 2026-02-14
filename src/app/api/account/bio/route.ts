import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { filterContentByField } from '@/lib/content-filter';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

const MAX_BIO_CHARS = 145;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

async function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('token');
  if (!token) return { error: 'No auth token cookie', status: 401 } as const;
  let payload: any; try { 
    payload = jwt.verify(token.value, JWT_SECRET, { 
      algorithms: ['HS256'] 
    }); 
  } catch { return { error: 'Invalid or expired token', status: 401 } as const; }
  const userId = payload.userId; if (!userId || !ObjectId.isValid(userId)) return { error: 'Invalid token payload', status: 401 } as const;
  try {
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const doc = await col.findOne({ _id: new ObjectId(userId) }, { projection: { _id: 1, username: 1, bio: 1 } });
    if (!doc) return { error: 'User not found', status: 404 } as const;
    return { user: { id: String(doc._id), username: doc.username, bio: doc.bio || '' } } as const;
  } catch { return { error: 'Database error', status: 500 } as const; }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromToken(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return NextResponse.json({ bio: auth.user.bio, max: MAX_BIO_CHARS });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'bioChange');
  if (rateLimitResponse) return rateLimitResponse;
  
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

    const auth = await getUserFromToken(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const csrfToken = req.headers.get('x-csrf-token') || 
                     req.headers.get('csrf-token') ||
                     body.csrfToken;
    
    if (!csrfToken) {
      return NextResponse.json({ error: "CSRF token required" }, { status: 403 });
    }
    
    if (!validateCSRFToken(csrfToken, auth.user.id)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }
    
    const allowedFields = ['bio', 'csrfToken'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in bio update: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'verified', 'lastOnline', 'lastSeen', 
      'accountthumbnail', 'lastUsernameChange', 'totalScripts', 
      'totalViews', 'totalPoints', 'leaderboardPosition', 'lastStatsUpdate', 
      'lastLeaderboardUpdate', 'isTimeouted', 'timeoutEnd', 'timeoutReason',
      'admin', 'isAdmin', 'role', 'permissions', 'username', 'email'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in bio update: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.bio !== undefined && typeof body.bio !== 'string') {
      return NextResponse.json({ error: "Bio must be a string" }, { status: 400 });
    }
    if (body.csrfToken !== undefined && typeof body.csrfToken !== 'string') {
      return NextResponse.json({ error: "CSRF token must be a string" }, { status: 400 });
    }

    const raw = typeof body.bio === 'string' ? body.bio : '';
    const trimmed = raw.slice(0, MAX_BIO_CHARS);
    if (trimmed.trim().length === 0) return NextResponse.json({ error: 'Bio cannot be empty' }, { status: 400 });
    
    const bioFilter = filterContentByField(trimmed, 'bio');
    if (!bioFilter.isValid) {
      return NextResponse.json({ error: bioFilter.error }, { status: 400 });
    }
    const cleanBio = bioFilter.cleanedText;
    
    const truncated = raw.length > MAX_BIO_CHARS;
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const res = await col.updateOne({ _id: new ObjectId(auth.user.id) }, { $set: { bio: cleanBio } });
    if (res.matchedCount !== 1) return NextResponse.json({ error: 'Failed to write bio (user missing)' }, { status: 404 });
    
    try {
      const { clearProfileCache } = await import('@/lib/simple-cache');
      clearProfileCache(auth.user.username);
      
      const { smartCache, addUserChange } = await import('@/lib/smart-cache');
      smartCache.clearByPattern(`profile:${auth.user.username}`);
      smartCache.clearByPattern(`user_${auth.user.username}`);
      smartCache.clearByPattern(`profile-dashboard:${auth.user.username.toLowerCase()}`);
      
      addUserChange(auth.user.username, 'updated', { bio: cleanBio });
      
      const { PerformanceOptimizer } = await import('@/lib/performance-optimizer');
      const optimizer = PerformanceOptimizer.getInstance();
      optimizer.clearCache();
      
      console.log(`✅ Cleared all caches for user: ${auth.user.username}`);
    } catch (error) {
      console.error('Failed to clear profile cache:', error);
    }
    
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: auth.user.username, 
        userId: auth.user.id,
        action: 'profile_edited' 
      })
    }).catch(() => {});
    
    return NextResponse.json({ success: true, bio: cleanBio, truncated, max: MAX_BIO_CHARS });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { createSafeMongoRegexQuery } from '@/lib/security';
import { filterContentByField } from '@/lib/content-filter';
import { getScriptsDatabase } from '@/lib/mongodb-optimized';
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

interface User {
  id: string;
  username: string;
  lastUsernameChange?: string | null;
}

const USERS_URI = process.env.USERS_MONGODB_URI!;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  try {
    const tokenCookie = req.cookies.get('token');
    if (!tokenCookie) return null;
    let payload: any;
    try {
      payload = jwt.verify(tokenCookie.value, JWT_SECRET, { 
        algorithms: ['HS256'] 
      });
    } catch {
      return null;
    }
    const client = await mongoPool.getClient();
    const db = client.db(USERS_DB);
    const col = db.collection(USERS_COL);
    let doc: any = null;
    if (payload.userId) {
      try {
        doc = await col.findOne({ _id: new ObjectId(payload.userId) });
      } catch {}
    }
    if (!doc && payload.username) {
      doc = await col.findOne({ username: payload.username });
    }
        if (!doc) return null;
    return {
      id: String(doc._id),
      username: doc.username,
      lastUsernameChange: doc.lastUsernameChange || doc.last_username_change || null,
    };
  } catch (e) {
    
    return null;
  }
}

async function findUserByUsername(desired: string): Promise<User | null> {
  const client = await mongoPool.getClient();
  const db = client.db(USERS_DB);
  const col = db.collection(USERS_COL);
  
  const doc: any = await col.findOne({ username: createSafeMongoRegexQuery(desired) });
    if (!doc) return null;
  return { id: String(doc._id), username: doc.username, lastUsernameChange: doc.lastUsernameChange || null };
}

async function updateUserUsername(userId: string, newUsername: string): Promise<void> {
  const client = await mongoPool.getClient();
  const db = client.db(USERS_DB);
  const col = db.collection(USERS_COL);
  await col.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { username: newUsername, lastUsernameChange: new Date().toISOString() } }
  );
  }

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'usernameChange');
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

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    
    const csrfToken = req.headers.get('x-csrf-token') || 
                     req.headers.get('csrf-token') ||
                     body.csrfToken;
    
    if (!csrfToken) {
      return NextResponse.json({ error: "CSRF token required" }, { status: 403 });
    }
    
    if (!validateCSRFToken(csrfToken, user.id)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }
    
    const allowedFields = ['newUsername', 'csrfToken'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in username change: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'verified', 'lastOnline', 'lastSeen', 
      'accountthumbnail', 'lastUsernameChange', 'totalScripts', 
      'totalViews', 'totalPoints', 'leaderboardPosition', 'lastStatsUpdate', 
      'lastLeaderboardUpdate', 'isTimeouted', 'timeoutEnd', 'timeoutReason',
      'admin', 'isAdmin', 'role', 'permissions', 'username', 'email', 'bio'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in username change: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.newUsername !== undefined && typeof body.newUsername !== 'string') {
      return NextResponse.json({ error: "New username must be a string" }, { status: 400 });
    }
    if (body.csrfToken !== undefined && typeof body.csrfToken !== 'string') {
      return NextResponse.json({ error: "CSRF token must be a string" }, { status: 400 });
    }

    const rawNew = (body.newUsername ?? '').trim();

    if (!rawNew) {
      return NextResponse.json({ error: 'newUsername required' }, { status: 400 });
    }
    if (rawNew.length < USERNAME_MIN || rawNew.length > USERNAME_MAX) {
      return NextResponse.json({ error: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters.` }, { status: 400 });
    }
    if (!USERNAME_REGEX.test(rawNew)) {
      return NextResponse.json({ error: 'Username contains invalid characters.' }, { status: 400 });
    }
    
    const usernameFilter = filterContentByField(rawNew, 'username');
    if (!usernameFilter.isValid) {
      return NextResponse.json({ error: usernameFilter.error }, { status: 400 });
    }
    const cleanUsername = usernameFilter.cleanedText;
    
    if (cleanUsername.toLowerCase() === user.username.toLowerCase()) {
      return NextResponse.json({ error: 'That is already your username.' }, { status: 400 });
    }

    if (user.lastUsernameChange) {
      const last = new Date(user.lastUsernameChange).getTime();
      if (!Number.isNaN(last) && Date.now() - last < SEVEN_DAYS_MS) {
        const nextDateMs = last + SEVEN_DAYS_MS;
        const nextDate = new Date(nextDateMs).toISOString();
        const remainingMs = nextDateMs - Date.now();
        const minutesUntilChange = Math.max(1, Math.ceil(remainingMs / 60000));
        const hoursUntilChange = Math.max(1, Math.ceil(remainingMs / 3600000));
        return NextResponse.json({
          error: `Username recently changed. Try again in ${hoursUntilChange} hour${hoursUntilChange === 1 ? '' : 's'}.`,
          nextAllowedAt: nextDate,
          minutesUntilChange,
          hoursUntilChange
        }, { status: 429 });
      }
    }

    const existing = await findUserByUsername(cleanUsername);
    if (existing) {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
    }

    const oldUsername = user.username;
    await updateUserUsername(user.id, cleanUsername);

    try {
      const scriptsDb = await getScriptsDatabase();
      if (scriptsDb) {
        await scriptsDb.collection('scripts').updateMany(
          { ownerUserId: user.id },
          { $set: { ownerId: cleanUsername, ownerUsername: cleanUsername } }
        );
      }
    } catch (e) {
      
    }

    const tokenCookie = req.cookies.get('token');
    if (tokenCookie) {
      let payload: any;
      try {
        payload = jwt.verify(tokenCookie.value, JWT_SECRET, { 
          algorithms: ['HS256'] 
        });
      } catch {
        payload = null;
      }
      if (payload && !payload.userId) {
        const tokenExpiry = process.env.NODE_ENV === 'development' ? '30d' : '7d';
        const newToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: tokenExpiry });
        
        const cookie = serialize('token', newToken, {
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * (process.env.NODE_ENV === 'development' ? 30 : 7),
          secure: process.env.NODE_ENV === 'production',
          domain: undefined,
        });
        
        const headers = new Headers();
        headers.set('Set-Cookie', cookie);
        return new NextResponse(JSON.stringify({ success: true, username: cleanUsername }), { status: 200, headers });
      }
    }
    try {
      const webhookUrl = process.env.usernamechange;
      if (webhookUrl) {
        const content = `userid: ${user.id}\nnew username: ${cleanUsername}\nold username: ${oldUsername}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true, username: cleanUsername });
  } catch (e) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

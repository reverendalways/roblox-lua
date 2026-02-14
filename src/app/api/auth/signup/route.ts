import { NextRequest, NextResponse } from 'next/server';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { filterContentByField } from '@/lib/content-filter';
import { validateCSRFToken } from '@/lib/csrf-protection';
import { validateTurnstileFromBody } from '@/lib/turnstile-verification';
import { rateLimitByIP } from '@/middleware/rate-limit';

const uri = process.env.USERS_MONGODB_URI;
const dbName = 'users';
const collectionName = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'signup');
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
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await req.json();
    const tempUserId = req.headers.get('x-user-id');
    const csrfToken = req.headers.get('x-csrf-token');
    if (csrfToken && tempUserId && !validateCSRFToken(csrfToken, tempUserId)) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    const turnstileResult = await validateTurnstileFromBody(body, req as NextRequest);
    if (!turnstileResult.success) {
      return NextResponse.json({ 
        error: turnstileResult.error || "Security verification failed" 
      }, { status: 400 });
    }
    
    const allowedFields = ['username', 'email', 'password', 'turnstileToken'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in signup: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'verified', 'lastOnline', 'lastSeen', 
      'accountthumbnail', 'lastUsernameChange', 'bio', 'totalScripts', 
      'totalViews', 'totalPoints', 'leaderboardPosition', 'lastStatsUpdate', 
      'lastLeaderboardUpdate', 'isTimeouted', 'timeoutEnd', 'timeoutReason',
      'admin', 'isAdmin', 'role', 'permissions'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in signup: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.username !== undefined && typeof body.username !== 'string') {
      return NextResponse.json({ error: "Username must be a string" }, { status: 400 });
    }
    if (body.email !== undefined && typeof body.email !== 'string') {
      return NextResponse.json({ error: "Email must be a string" }, { status: 400 });
    }
    if (body.password !== undefined && typeof body.password !== 'string') {
      return NextResponse.json({ error: "Password must be a string" }, { status: 400 });
    }

    const { username, email, password } = body;
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const usernameFilter = filterContentByField(username, 'username');
    if (!usernameFilter.isValid) {
      return NextResponse.json({ error: usernameFilter.error }, { status: 400 });
    }
    const cleanUsername = usernameFilter.cleanedText;
    const db = await getUsersDatabase();
    const users = db.collection(collectionName);

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const existing = await users.findOne({ $or: [ { username: cleanUsername }, { email: normalizedEmail } ] });
    if (existing) {
            return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      username: cleanUsername,
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
      verified: false,
      lastOnline: new Date(),
      lastSeen: new Date(),
      accountthumbnail: "",
      lastUsernameChange: null,
      bio: "",
      totalScripts: 0,
      totalViews: 0,
      totalPoints: 0,
      leaderboardPosition: null,
      lastStatsUpdate: new Date(),
      lastLeaderboardUpdate: new Date()
    };
    const insertResult = await users.insertOne(user);
    const tokenExpiry = process.env.NODE_ENV === 'development' ? '30d' : '7d';
    const token = jwt.sign({ userId: insertResult.insertedId.toString() }, JWT_SECRET, { expiresIn: tokenExpiry });
    
    const cookie = serialize('token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * (process.env.NODE_ENV === 'development' ? 30 : 7),
      secure: process.env.NODE_ENV === 'production',
      domain: undefined,
    });
    
    try {
      const webhookUrl = process.env.signupwebhook;
      if (webhookUrl) {
        const content = `Username: ${cleanUsername}\nUserid: ${insertResult.insertedId.toString()}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    const res = NextResponse.json({ success: true, user: { username: cleanUsername, email } });
    res.headers.set('Set-Cookie', cookie);
    return res;
  	} catch (err) {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

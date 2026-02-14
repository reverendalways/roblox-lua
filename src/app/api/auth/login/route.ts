import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { rateLimitByIP } from '@/middleware/rate-limit';

const dbName = 'users';
const collectionName = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'login');
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

    const body = await req.json();
    
    const allowedFields = ['email', 'password'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in login: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'verified', 'lastOnline', 'lastSeen', 
      'accountthumbnail', 'lastUsernameChange', 'totalScripts', 
      'totalViews', 'totalPoints', 'leaderboardPosition', 'lastStatsUpdate', 
      'lastLeaderboardUpdate', 'isTimeouted', 'timeoutEnd', 'timeoutReason',
      'admin', 'isAdmin', 'role', 'permissions', 'username', 'bio'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in login: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.email !== undefined && typeof body.email !== 'string') {
      return NextResponse.json({ error: "Email must be a string" }, { status: 400 });
    }
    if (body.password !== undefined && typeof body.password !== 'string') {
      return NextResponse.json({ error: "Password must be a string" }, { status: 400 });
    }

    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const db = await getUsersDatabase();
    const users = db.collection(collectionName);

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const now = new Date();
    await users.updateOne({ _id: user._id }, { $set: { lastOnline: now, lastSeen: now, isLoggedIn: true } });
    
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: user.username, 
        userId: user._id.toString(),
        action: 'login' 
      })
    }).catch(() => {});
    const { password: _, ...userInfo } = user;

    const tokenExpiry = process.env.NODE_ENV === 'development' ? '30d' : '7d';
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: tokenExpiry });

    const cookie = serialize('token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * (process.env.NODE_ENV === 'development' ? 30 : 7),
      secure: process.env.NODE_ENV === 'production',
      domain: undefined,
    });
    
    const res = NextResponse.json({ 
      success: true, 
      user: userInfo
    });
    res.headers.set('Set-Cookie', cookie);
    return res;
  	} catch (err) {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

import { NextRequest, NextResponse } from 'next/server';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const uri = process.env.USERS_MONGODB_URI;
const dbName = 'users';
const collectionName = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await request.json();
    
    const allowedFields = ['email', 'code'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in email verification: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'verified', 'lastOnline', 'lastSeen', 
      'accountthumbnail', 'lastUsernameChange', 'totalScripts', 
      'totalViews', 'totalPoints', 'leaderboardPosition', 'lastStatsUpdate', 
      'lastLeaderboardUpdate', 'isTimeouted', 'timeoutEnd', 'timeoutReason',
      'admin', 'isAdmin', 'role', 'permissions', 'username', 'bio', 'password'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in email verification: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.email !== undefined && typeof body.email !== 'string') {
      return NextResponse.json({ error: "Email must be a string" }, { status: 400 });
    }
    if (body.code !== undefined && typeof body.code !== 'string') {
      return NextResponse.json({ error: "Code must be a string" }, { status: 400 });
    }

    const { email, code } = body;
    
    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!/^\d{8}$/.test(code)) {
      return NextResponse.json({ error: "Invalid verification code format" }, { status: 400 });
    }

    const db = await getUsersDatabase();
    const users = db.collection(collectionName);

    try {
      const verificationCode = await db.collection('email_verification_codes').findOne({
        email: normalizedEmail,
        code,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verificationCode) {
        await db.collection('email_verification_codes').updateOne(
          { email: normalizedEmail },
          { $inc: { attempts: 1 } }
        );

        const currentCode = await db.collection('email_verification_codes').findOne({
          email: normalizedEmail,
          used: false,
          expiresAt: { $gt: new Date() }
        });

        if (currentCode && currentCode.attempts >= 8) {
          await db.collection('email_verification_codes').deleteOne({
            _id: currentCode._id
          });
          return NextResponse.json({ 
            error: "Too many failed attempts. Please request a new verification code.",
            attemptsExceeded: true
          }, { status: 429 });
        }

        return NextResponse.json({ 
          error: "Invalid or expired verification code",
          attemptsRemaining: currentCode ? 8 - currentCode.attempts : 8
        }, { status: 400 });
      }

      const user = await users.findOne({ 
        _id: verificationCode.userId,
        email: normalizedEmail
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await db.collection('email_verification_codes').updateOne(
        { _id: verificationCode._id },
        { $set: { used: true } }
      );

      await users.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );

      const tokenExpiry = process.env.NODE_ENV === 'development' ? '30d' : '7d';
      const token = jwt.sign(
        { 
          userId: user._id.toString(), 
          username: user.username,
          email: user.email,
          verified: user.verified || false
        },
        JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      const cookie = serialize('token', token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * (process.env.NODE_ENV === 'development' ? 30 : 7),
        secure: process.env.NODE_ENV === 'production',
        domain: undefined,
      });

      await db.collection('email_verification_codes').deleteMany({
        userId: user._id,
        expiresAt: { $lt: new Date() }
      });

      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          verified: user.verified || false,
          accountthumbnail: user.accountthumbnail || null,
          bio: user.bio || null,
          nickname: user.username,
          accountStatus: 'all_good'
        }
      });

      response.headers.set('Set-Cookie', cookie);
      return response;

    } finally {
          }

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

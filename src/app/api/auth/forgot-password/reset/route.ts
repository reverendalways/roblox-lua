import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyCodePending } from '@/lib/codeFlow';
import { hashPassword } from '@/lib/hash';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(()=>({}));
    
    const allowedFields = ['email', 'code', 'newPassword'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in password reset: ${extraFields.join(', ')}`);
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
      console.warn(`Security: System field manipulation attempted in password reset: ${systemFieldAttempts.join(', ')}`);
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
    if (body.newPassword !== undefined && typeof body.newPassword !== 'string') {
      return NextResponse.json({ error: "New password must be a string" }, { status: 400 });
    }

    const { email, code, newPassword } = body;
    if (!email || typeof email !== 'string' || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) return NextResponse.json({ error: 'Invalid new password' }, { status: 400 });
    const normalized = email.toLowerCase().trim();
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const userDoc = await col.findOne({ email: normalized }, { projection: { _id: 1 } });
    if (!userDoc) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    const verified = await verifyCodePending(userDoc._id.toString(), code, 'forgotpassword');
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });
    const hashed = await hashPassword(newPassword);
    await col.updateOne({ _id: userDoc._id }, { $set: { password: hashed } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

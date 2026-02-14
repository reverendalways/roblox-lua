import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { sendEmail } from '@/lib/email';
import { generateCode, createOrReplaceCodePending } from '@/lib/codeFlow';
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
    
    const allowedFields = ['email'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in forgot password request: ${extraFields.join(', ')}`);
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
      console.warn(`Security: System field manipulation attempted in forgot password request: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.email !== undefined && typeof body.email !== 'string') {
      return NextResponse.json({ error: "Email must be a string" }, { status: 400 });
    }

    const { email } = body;
    if (!email || typeof email !== 'string' || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    const normalized = email.toLowerCase().trim();
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const userDoc = await col.findOne({ email: normalized }, { projection: { username: 1, _id: 1 } });
    if (!userDoc) return NextResponse.json({ success: true });
    const code = generateCode(16);
    await createOrReplaceCodePending(userDoc._id.toString(), code, 'forgotpassword', 15);
    try {
      await sendEmail({
        to: normalized,
        subject: 'Password reset code (ScriptVoid)',
        html: `<p>Hello${userDoc.username ? ' ' + userDoc.username : ''},</p><p>You requested to reset your ScriptVoid account password.</p><p>Enter this code to continue:</p><h2 style="font-size:24px;letter-spacing:4px;">${code}</h2><p>This code expires in 15 minutes.</p><p>If you did not request this, please contact ScriptVoid Support immediately.</p>` ,
        text: `Code: ${code} (expires in 15 minutes). If you did not request this, contact ScriptVoid Support immediately.`
      });
    } catch (err: any) {}
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

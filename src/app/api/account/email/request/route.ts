import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/email';
import { createOrReplacePending, generateCode } from '@/lib/emailChange';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}
async function getUser(req: NextRequest) {
  const token = req.cookies.get('token');
  if (!token) return null;
  try { const payload: any = jwt.verify(token.value, JWT_SECRET); return payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null; } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { newEmail } = await req.json().catch(()=>({}));
    if (typeof newEmail !== 'string' || !newEmail.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    const normalized = newEmail.toLowerCase().trim();
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const userDoc = await col.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, username: 1 } });
    if (!userDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const currentEmail = (userDoc.email || '').toLowerCase();
    if (!currentEmail || !currentEmail.includes('@')) return NextResponse.json({ error: 'Current email missing – cannot verify change' }, { status: 400 });
    if (currentEmail === normalized) return NextResponse.json({ error: 'New email cannot be same as current email' }, { status: 400 });
    const existingTarget = await col.findOne({ email: normalized, _id: { $ne: new ObjectId(userId) } });
    if (existingTarget) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    const code = generateCode(6);
    await createOrReplacePending(userId, normalized, code, 15);
    try {
      await sendEmail({
        to: currentEmail,
        subject: 'Confirm your email change (ScriptVoid)',
        html: `<p>Hello${userDoc.username ? ' ' + userDoc.username : ''},</p><p>You requested to change your ScriptVoid account email to <strong>${normalized}</strong>.</p><p>Enter this verification code to confirm the change:</p><h2 style="font-size:24px;letter-spacing:4px;">${code}</h2><p>This code expires in 15 minutes.</p><p>If you did not request this change, please contact ScriptVoid Support immediately.</p>` ,
        text: `Code: ${code} (expires in 15 minutes). Requested change to: ${normalized}. If you did not request this change, contact ScriptVoid Support immediately.`
      });
    } catch (err: any) {

      return NextResponse.json({ error: 'Failed to send verification code', details: err?.message || String(err) }, { status: 500 });
    }
    return NextResponse.json({ success: true, sentTo: currentEmail, pendingNew: normalized });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

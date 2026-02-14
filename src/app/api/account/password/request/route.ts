import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/email';
import { generateCode } from '@/lib/codeFlow';
import crypto from 'crypto';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const CODE_COLLECTION = 'changepassword';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

async function getUser(req: NextRequest) {
  const token = req.cookies.get('token');
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token.value, JWT_SECRET);
    return payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let client: MongoClient | null = null;
  try {
    const userId = await getUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const codeCol = usersDb.collection(CODE_COLLECTION);
    const userDoc = await col.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, username: 1 } });
    if (!userDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const currentEmail = (userDoc.email || '').toLowerCase();
    if (!currentEmail || !currentEmail.includes('@')) return NextResponse.json({ error: 'Current email missing – cannot verify change' }, { status: 400 });
    const code = generateCode(6);
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await codeCol.deleteMany({ userId: new ObjectId(userId) });
    const insertResult = await codeCol.insertOne({
      userId: new ObjectId(userId),
      codeHash,
      expiresAt,
      createdAt: new Date(),
      attempts: 0
    });
    if (!insertResult.insertedId) {

      return NextResponse.json({ error: 'Failed to save code' }, { status: 500 });
    }
    try {
      await sendEmail({
        to: currentEmail,
        subject: 'Password change verification (ScriptVoid)',
        html: `<p>Hello${userDoc.username ? ' ' + userDoc.username : ''},</p><p>You requested to change your ScriptVoid account password.</p><p>Enter this verification code to continue:</p><h2 style="font-size:24px;letter-spacing:4px;">${code}</h2><p>This code expires in 15 minutes.</p><p>If you did not request this change, please contact ScriptVoid Support immediately.</p>` ,
        text: `Code: ${code} (expires in 15 minutes). If you did not request this change, contact ScriptVoid Support immediately.`
      });
    } catch (err: any) {

      return NextResponse.json({ error: 'Failed to send verification code', details: err?.message || String(err) }, { status: 500 });
    }
    return NextResponse.json({ success: true, sentTo: currentEmail });
  } catch (e) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
  }
}

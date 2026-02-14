import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { verifyCode } from '@/lib/emailChange';
import { sendEmail } from '@/lib/email';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

async function getUserId(req: NextRequest) {
  const token = req.cookies.get('token');
  if (!token) return null;
  try { const payload: any = jwt.verify(token.value, JWT_SECRET); return payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null; } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    let { code } = await req.json().catch(()=>({}));
    if (typeof code !== 'string') code = String(code || '');
    code = code.trim();
    if (code.length < 4) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    const result = await verifyCode(userId, code);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const pendingNew = result.newEmail.toLowerCase();
    const taken = await col.findOne({ email: pendingNew, _id: { $ne: new ObjectId(userId) } }, { projection: { _id: 1 } });
    if (taken) {
      return NextResponse.json({ error: 'Email already in use by another account. Start the process again with a different email.' }, { status: 409 });
    }
    const existing = await col.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, username: 1 } });
    const oldEmail = existing?.email || null;
    await col.updateOne({ _id: new ObjectId(userId) }, { $set: { email: pendingNew } });
    if (oldEmail && oldEmail !== pendingNew) {
      sendEmail({
        to: oldEmail,
        subject: 'Your ScriptVoid email was changed',
        html: `<p>Hello${existing?.username ? ' ' + existing.username : ''},</p><p>Your account email was just changed to <strong>${pendingNew}</strong>. If you did not perform this action, please contact support immediately.</p>`,
        text: `Your ScriptVoid email was changed to ${pendingNew}. If this wasn't you contact support.`
      }).catch(()=>{});
    }
    return NextResponse.json({ success: true, email: pendingNew, notifiedOld: !!oldEmail && oldEmail !== pendingNew, message: 'Email updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

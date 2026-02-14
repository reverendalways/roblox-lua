import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { verifyCodePending } from '@/lib/codeFlow';
import { hashPassword } from '@/lib/hash';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const CODE_COLLECTION = 'changepassword';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

import { getUsersDatabase } from '@/lib/mongodb-optimized';
async function getUser(req: NextRequest) {
  const token = req.cookies.get('token');
  if (!token) return null;
  try { const payload: any = jwt.verify(token.value, JWT_SECRET); return payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null; } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const { code, newPassword } = await req.json().catch(()=>({}));
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) return NextResponse.json({ error: 'Missing or invalid new password' }, { status: 400 });
    const verified = await verifyCodePending(userId.toString(), code, CODE_COLLECTION);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });
    const hashed = await hashPassword(newPassword);
    await col.updateOne({ _id: new ObjectId(userId) }, { $set: { password: hashed } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

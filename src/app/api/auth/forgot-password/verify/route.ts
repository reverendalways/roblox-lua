import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { verifyCodePending } from '@/lib/codeFlow';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const FORGOT_COLLECTION = 'forgotpassword';
const VERIFIED_COLLECTION = 'ForgotPasswordVerified';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json().catch(()=>({}));
    if (!email || typeof email !== 'string' || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    const normalized = email.toLowerCase().trim();
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const userDoc = await col.findOne({ email: normalized }, { projection: { _id: 1 } });
    if (!userDoc) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    const verified = await verifyCodePending(userDoc._id.toString(), code, FORGOT_COLLECTION);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });
    await usersDb.collection(VERIFIED_COLLECTION).insertOne({ userId: userDoc._id, expiresAt: new Date(Date.now() + 10 * 60_000) });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

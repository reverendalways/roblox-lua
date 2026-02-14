import crypto from 'crypto';
import { MongoClient, ObjectId } from 'mongodb';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = 'users';

export function generateCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}
function hashCode(code: string) { return crypto.createHash('sha256').update(code).digest('hex'); }

async function getCol(collection: string) {
  if (!USERS_URI) throw new Error('Missing MONGO uri');
  const client = new MongoClient(USERS_URI);
  await client.connect();
  return client.db(DB_NAME).collection(collection);
}

export async function createOrReplaceCodePending(userId: string, code: string, collection: string, ttlMinutes = 15) {
  const col = await getCol(collection);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await col.deleteMany({ userId });
  const doc = {
    userId: new ObjectId(userId),
    codeHash: hashCode(code),
    expiresAt,
    attempts: 0,
    createdAt: new Date()
  };
  await col.insertOne(doc as any);
  return { code, expiresAt };
}

export async function verifyCodePending(userId: string, code: string, collection: string, maxAttempts = 5) {
  const col = await getCol(collection);
  const record = await col.findOne({ userId: new ObjectId(userId) });
  if (!record) return { ok: false, error: 'No pending code' } as const;
  if (record.expiresAt.getTime() < Date.now()) { await col.deleteOne({ _id: record._id }); return { ok: false, error: 'Code expired' } as const; }
  if (record.attempts >= maxAttempts) { await col.deleteOne({ _id: record._id }); return { ok: false, error: 'Too many attempts' } as const; }
  const providedHash = hashCode(code);
  if (providedHash !== record.codeHash) {
    await col.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { ok: false, error: 'Invalid code' } as const;
  }
  await col.deleteOne({ _id: record._id });
  return { ok: true } as const;
}

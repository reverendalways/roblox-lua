import crypto, { randomBytes } from 'crypto';
import { MongoClient, Collection, ObjectId } from 'mongodb';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = 'users';
const PENDING_COL = 'PendingEmailChanges';
let client: MongoClient | null = null;

async function getCol(): Promise<Collection> {
  if (!USERS_URI) throw new Error('Missing MONGO uri');
  if (!client) { client = new MongoClient(USERS_URI); await client.connect(); }
  return client.db(DB_NAME).collection(PENDING_COL);
}

export interface PendingEmailChange {
  _id?: ObjectId;
  userId: ObjectId;
  newEmail: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

export function generateCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function hashCode(code: string) { return crypto.createHash('sha256').update(code).digest('hex'); }

export async function createOrReplacePending(userId: string, newEmail: string, code: string, ttlMinutes = 15) {
  const col = await getCol();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await col.deleteMany({ userId });
  const doc: PendingEmailChange = {
    userId: new ObjectId(userId),
    newEmail: newEmail.toLowerCase().trim(),
    codeHash: hashCode(code),
    expiresAt,
    attempts: 0,
    createdAt: new Date()
  };
  await col.insertOne(doc as any);
  return { code, expiresAt };
}

export async function verifyCode(userId: string, code: string, maxAttempts = 5) {
  const col = await getCol();
  const record = await col.findOne({ userId: new ObjectId(userId) });
  if (!record) return { ok: false, error: 'No pending change' } as const;
  if (record.expiresAt.getTime() < Date.now()) { await col.deleteOne({ _id: record._id }); return { ok: false, error: 'Code expired' } as const; }
  if (record.attempts >= maxAttempts) { await col.deleteOne({ _id: record._id }); return { ok: false, error: 'Too many attempts' } as const; }
  const providedHash = hashCode(code);
  if (providedHash !== record.codeHash) {
    await col.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { ok: false, error: 'Invalid code' } as const;
  }
  await col.deleteOne({ _id: record._id });
  return { ok: true, newEmail: record.newEmail } as const;
}

export async function consumeCode(userId: string, code: string) {
  const col = await getCol();
  await col.deleteMany({ userId, code });
}

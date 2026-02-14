import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { rateLimitByIP } from '@/middleware/rate-limit';
import { filterBase64Image } from '@/lib/content-filter';
import { validateAccountThumbnail } from '@/lib/security';

const USERS_URI = process.env.USERS_MONGODB_URI!;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token');
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token.value, JWT_SECRET);
    return payload.userId || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'profilePicture');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
    }

    const thumbnailValidation = validateAccountThumbnail(imageBase64);
    if (!thumbnailValidation.isValid) {
      return NextResponse.json({ error: thumbnailValidation.error }, { status: 400 });
    }
    const commaIdx = imageBase64.indexOf(',');
    const b64 = commaIdx !== -1 ? imageBase64.slice(commaIdx + 1) : imageBase64;
    const approxBytes = Math.floor(b64.length * 3 / 4);
    const sizeMB = approxBytes / 1024 / 1024;
    if (sizeMB > 1) {
      return NextResponse.json({ error: 'Avatar too large (max 1MB)' }, { status: 400 });
    }

    const contentFilter = await filterBase64Image(imageBase64, 0.8);
    if (!contentFilter.isSafe) {
      console.log(`Content filter blocked avatar upload: ${contentFilter.reason}`);
      return NextResponse.json({ 
        error: 'Content not allowed', 
        reason: 'Avatar contains inappropriate content' 
      }, { status: 400 });
    }
    const client = await mongoPool.getClient();
    const col = client.db(USERS_DB).collection(USERS_COL);
    await col.updateOne({ _id: new ObjectId(userId) }, { $set: { accountthumbnail: imageBase64 } });
        return NextResponse.json({ success: true });
  } catch (e) {

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'profilePicture');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const client = await mongoPool.getClient();
    const col = client.db(USERS_DB).collection(USERS_COL);
    await col.updateOne({ _id: new ObjectId(userId) }, { $set: { accountthumbnail: '' } });
        return NextResponse.json({ success: true });
  } catch (e) {

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

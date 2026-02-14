import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getScriptsDatabase, getUsersDatabase } from '@/lib/mongodb-optimized';
import { getBaseUrl } from '@/lib/url';
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleDelete(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleDelete(req, params);
}

async function handleDelete(req: NextRequest, params: Promise<{ id: string }>) {
  const rateLimitResponse = await rateLimitByIP(req, 'userDeleteScript');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const { id } = await params;
    
    const tokenCookie = req.cookies.get('token');
    if (!tokenCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const token = tokenCookie.value;
    let payload: any;
    
    try {
      payload = jwt.verify(token, JWT_SECRET, { 
        algorithms: ['HS256'] 
      });
    } catch (jwtError) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    {
      const csrfToken = req.headers.get('x-csrf-token');
      if (!csrfToken || !validateCSRFToken(csrfToken, payload.userId)) {
        return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
      }
    }

    const db = await getScriptsDatabase();
    
    let script: any = null;
    const candidates: any[] = [];
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      try { candidates.push({ _id: new ObjectId(id) }); } catch {}
    }
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      candidates.push({ id: numericId });
    }
    candidates.push({ id: id });

    script = await db.collection("scripts").findOne({ $or: candidates });
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    let isOwner = false;
    if (script.ownerUserId) {
      try {
        const scriptOwnerId = new ObjectId(script.ownerUserId);
        const requestUserId = new ObjectId(payload.userId);
        isOwner = scriptOwnerId.equals(requestUserId);
      } catch {
        isOwner = String(script.ownerUserId) === String(payload.userId);
      }
    }
    if (!isOwner) {
      return NextResponse.json({ error: "You can only delete your own scripts" }, { status: 403 });
    }

    const scriptObjectId = typeof script._id === 'string' ? new ObjectId(script._id) : script._id;
    await db.collection("scripts").deleteOne({ _id: scriptObjectId });


    try {
      const webhookUrl = process.env.deletewebhook;
      if (webhookUrl && /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl)) {
        let userIdStr = '';
        let isVerified = false;
        let userDoc: any = null;
        try {
          const usersDb = await getUsersDatabase();
          userDoc = await usersDb.collection("ScriptVoid").findOne({ username: payload.username });
          if (userDoc && userDoc._id) {
            userIdStr = userDoc._id.toString();
          } else if (script.ownerUserId) {
            try {
              userIdStr = typeof script.ownerUserId === 'string' ? script.ownerUserId : new ObjectId(script.ownerUserId).toString();
            } catch {
              userIdStr = String(script.ownerUserId);
            }
          } else {
            userIdStr = 'unknown';
          }
          isVerified = Boolean((userDoc && userDoc.verified) || script.ownerVerified || script.isVerified);
        } catch {}

        const origin = getBaseUrl(req.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(userDoc?.username || '')}`;
        const content = `Username: ${userDoc?.username || ''}\nUserid: ${userIdStr}\nUser Profile: ${profileUrl}\nScript id: ${script.id ?? id}\nVerification Status: ${isVerified ? 'Verified' : 'Unverified'}`;

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Delete webhook error:', e);
    }

    return NextResponse.json({ message: "Script deleted successfully" });
  } catch (error) {
    console.error('Delete script error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

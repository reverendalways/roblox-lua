import { NextRequest, NextResponse } from "next/server";
import { getScriptsDatabase, getUsersDatabase } from "@/lib/mongodb-optimized";
import { ObjectId } from "mongodb";
import { getBaseUrl } from "@/lib/url";
import jwt from "jsonwebtoken";
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

function getAuthFromCookie(req: NextRequest): { userId: string | null, username: string | null } {
  try {
    const tokenCookie = req.cookies.get('token');
    if (!tokenCookie || !JWT_SECRET) return { userId: null, username: null };
    const payload: any = jwt.verify(tokenCookie.value, JWT_SECRET, { 
      algorithms: ['HS256'] 
    });
    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    const username = typeof payload.username === 'string' ? payload.username : null;
    return { userId, username };
  } catch {
    return { userId: null, username: null };
  }
}

function sanitizeReason(input: string): string {
  const noTags = input.replace(/<[^>]*>/g, "");
  return noTags.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 2000).trim();
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await rateLimitByIP(req, 'scriptReport');
  if (rateLimitResponse) return rateLimitResponse;
  
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

    const { id } = await params;
    let { userId, username } = getAuthFromCookie(req);

    if (userId) {
      const csrfToken = req.headers.get('x-csrf-token');
      if (!csrfToken || !validateCSRFToken(csrfToken, userId)) {
        return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
      }
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    
    const allowedFields = ['reason'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in script report: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'updatedAt', 'userId', 'username', 'userAvatar',
      'verified', 'isVerified', 'points', 'multiplier', 'likes', 'replies',
      'isEdited', 'editHistory', 'isDeleted', 'deletedAt', 'admin', 'isAdmin',
      'scriptId', 'status', 'resolved', 'resolvedBy', 'resolvedAt'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in script report: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      return NextResponse.json({ error: "Reason must be a string" }, { status: 400 });
    }

    const rawReason = typeof body?.reason === 'string' ? body.reason : '';
    const reason = sanitizeReason(rawReason);
    if (reason.length < 3) {
      return NextResponse.json({ error: 'Reason must be at least 3 characters' }, { status: 400 });
    }

    try {
    if (!username && userId) {
      try {
        const usersDb = await getUsersDatabase();
        let userDoc: any = null;
        if (/^[0-9a-fA-F]{24}$/.test(userId)) {
          userDoc = await usersDb.collection('ScriptVoid').findOne({ _id: new ObjectId(userId) }, { projection: { username: 1 } });
        }
        if (!userDoc) {
          userDoc = await usersDb.collection('ScriptVoid').findOne({ username: userId }, { projection: { username: 1 } });
        }
        if (userDoc?.username) {
          username = userDoc.username;
        }
      } catch {}
    }

    if (!userId || !username) {
      return NextResponse.json({ error: 'Only logged users can report' }, { status: 401 });
    }

    const db = await getScriptsDatabase();
    const idCandidates: any[] = [];
    try { if (ObjectId.isValid(id)) idCandidates.push({ _id: new ObjectId(id) }); } catch {}
    const asNum = Number(id);
    if (Number.isFinite(asNum)) idCandidates.push({ id: asNum });
    idCandidates.push({ id });

    const script = await db.collection('scripts').findOne({ $or: idCandidates }, { projection: { id: 1 } });
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    try {
      const webhookUrl = process.env.scriptreport;
      if (webhookUrl) {
        const origin = getBaseUrl(req.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
        const scriptLink = `${origin}/script/${script.id || id}`;
        const content = `Username: ${username}\nUserid: ${userId}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nreason: ${reason}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}



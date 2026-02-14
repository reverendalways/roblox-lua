import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getBaseUrl } from "../../../../lib/url";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";
import { rateLimitByIP } from '@/middleware/rate-limit';
import { clearScriptsCache } from '@/lib/smart-cache';

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
  return noTags.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 500).trim();
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'scriptReport');
  if (rateLimitResponse) return rateLimitResponse;
  
  let { userId, username } = getAuthFromCookie(req);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const commentId = typeof body?.commentId === 'string' ? body.commentId : '';
  const scriptId = typeof body?.scriptId === 'string' ? body.scriptId : '';
  const rawReason = typeof body?.reason === 'string' ? body.reason : '';
  const reason = sanitizeReason(rawReason);
  if (!commentId || !scriptId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (reason.length < 3) return NextResponse.json({ error: 'Reason must be at least 3 characters' }, { status: 400 });

  try {
    const db = await getScriptsDatabase();
    if (!username && userId) {
      try {
        let userDoc: any = null;
        if (/^[0-9a-fA-F]{24}$/.test(userId)) {
          userDoc = await db.collection('ScriptVoid').findOne({ _id: new ObjectId(userId) }, { projection: { username: 1 } });
        }
        if (!userDoc) {
          userDoc = await db.collection('ScriptVoid').findOne({ username: userId }, { projection: { username: 1 } });
        }
        if (userDoc?.username) username = userDoc.username;
      } catch {}
    }
    if (!userId || !username) return NextResponse.json({ error: 'Only logged users can report' }, { status: 401 });
    const script = await
    db.collection('scripts').findOne({ $or: [{ id: scriptId }, { id: Number(scriptId) }] }, { projection: { id: 1, comments: 1 } });
    if (!script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    const comment = (script.comments || []).find((c: any) => c.id === commentId);
    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    try {
      const webhookUrl = process.env.commentreport;
      if (webhookUrl && /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl)) {
        const origin = getBaseUrl(req.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
        const scriptLink = `${origin}/script/${script.id || scriptId}`;
        const sanitizedCommentContent = (comment?.content ?? '')
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .substring(0, 500);
        const sanitizedReason = reason
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .substring(0, 200);
        const content = `Username: ${username}\nUserid: ${userId}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nComment id: ${commentId}\nComment: ${sanitizedCommentContent}\nreason: ${sanitizedReason}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    clearScriptsCache();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}



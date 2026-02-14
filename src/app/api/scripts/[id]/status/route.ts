import { NextRequest, NextResponse } from "next/server";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";
import { ObjectId } from "mongodb";
import { getBaseUrl } from "@/lib/url";
import jwt from "jsonwebtoken";
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

function getUserIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get("token");
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token.value, JWT_SECRET, { 
      algorithms: ['HS256'] 
    });
    return payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const rateLimitResponse = await rateLimitByIP(request, 'scriptStatus');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    {
      const csrfToken = request.headers.get('x-csrf-token');
      if (!csrfToken || !validateCSRFToken(csrfToken, userId)) {
        return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
      }
    }

    const db = await getScriptsDatabase();
    const scriptId = params.id;
    
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    const newStatus = body.status;

    if (!newStatus || typeof newStatus !== 'string') {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const validStatuses = ['Active', 'Inactive', 'Broken', 'Patched', 'Updated', 'Functional', 'functional'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const idCandidates: any[] = [];
    if (/^[0-9a-fA-F]{24}$/.test(scriptId)) {
      try { idCandidates.push({ _id: new ObjectId(scriptId) }); } catch (e) {}
    }
    const asNum = Number(scriptId);
    if (Number.isFinite(asNum)) {
      idCandidates.push({ id: asNum });
    }
    idCandidates.push({ id: scriptId });

    const script = await db.collection("scripts").findOne({ $or: idCandidates });
    if (!script) return NextResponse.json({ error: "Script not found" }, { status: 404 });

    let isOwner = false;
    if (script.ownerUserId) {
      try {
        const scriptOwnerId = new ObjectId(script.ownerUserId);
        const requestUserId = new ObjectId(userId);
        isOwner = scriptOwnerId.equals(requestUserId);
      } catch {
        isOwner = script.ownerUserId.toString() === userId.toString();
      }
    }
    if (!isOwner) {
      return NextResponse.json({ error: "You can only change the status of your own scripts" }, { status: 403 });
    }

    const oldStatus = script.status || "Unknown";
    await db.collection("scripts").updateOne(
      { _id: script._id },
      { $set: { status: newStatus, updatedAt: new Date().toISOString() } }
    );

    try {
      const webhookUrl = process.env.statuschange;
      if (webhookUrl && /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl)) {
        const username = (script.ownerId || script.ownerUsername || "unknown").toString();
        const userIdStr = script.ownerUserId && script.ownerUserId.toString ? script.ownerUserId.toString() : (script.ownerUserId || "");
        const origin = getBaseUrl(request.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
        const scriptLink = `${origin}/script/${script.id ?? scriptId}`;
        const content = `Username: ${username}\nUserid: ${userIdStr}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nStatus: ${oldStatus} -> ${newStatus}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
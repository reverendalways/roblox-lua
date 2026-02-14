import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/url";
import { getUsersDatabase, getScriptsDatabase } from "@/lib/mongodb-optimized";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
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

export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const { id: scriptId } = context.params;

  const rateLimitResponse = await rateLimitByIP(req, 'scriptBump');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || !validateCSRFToken(csrfToken, userId)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }

    const db = await getScriptsDatabase();

    const script = await db.collection("scripts").findOne({ id: scriptId });
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

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
      return NextResponse.json({ error: "You can only bump your own scripts" }, { status: 403 });
    }

    const usersDb = await getUsersDatabase();
    const user = await usersDb.collection("ScriptVoid").findOne({ _id: new ObjectId(userId) });
    if (user?.isTimeouted === true) {
      const timeoutEnd = user.timeoutEnd ? new Date(user.timeoutEnd) : null;
      const isExpired = timeoutEnd && timeoutEnd < new Date();
      if (!isExpired) {
        return NextResponse.json({
          error: 'You are currently timeouted and cannot bump scripts.',
          timeoutEnd,
          timeoutReason: user.timeoutReason || 'Admin timeout'
        }, { status: 403 });
      }
    }

    let bumpPoints = 25;
    const tier = script.promotionTier;
    
    const validTiers = [1, 'I', 'Promotion I', 2, 'II', 'Promotion II', 3, 'III', 'Promotion III', 4, 'IV', 'Promotion IV'];
    if (validTiers.includes(tier)) {
      if (tier === 1 || tier === 'I' || tier === 'Promotion I') bumpPoints = 50;
      else if (tier === 2 || tier === 'II' || tier === 'Promotion II') bumpPoints = 75;
      else if (tier === 3 || tier === 'III' || tier === 'Promotion III') bumpPoints = 100;
      else if (tier === 4 || tier === 'IV' || tier === 'Promotion IV') bumpPoints = 125;
    }
    
    bumpPoints = Math.min(bumpPoints, 125);
    
    if (script.isBumped && script.bumpExpire) {
      const bumpExpireDate = new Date(script.bumpExpire);
      if (bumpExpireDate > new Date()) {
        return NextResponse.json({ 
          error: "Script is already bumped", 
          bumpExpire: script.bumpExpire 
        }, { status: 400 });
      }
    }

    const bumpExpire = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    
    const result = await db.collection("scripts").updateOne(
      { 
        id: scriptId,
        $or: [
          { isBumped: { $ne: true } },
          { bumpExpire: { $lt: now } }
        ]
      },
      { 
        $set: { 
          isBumped: true, 
          bumpExpire, 
          lastActivity: now 
        }, 
        $inc: { 
          points: bumpPoints 
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        error: "Script bump failed - may already be bumped" 
      }, { status: 400 });
    }

    try {
      const webhookUrl = process.env.bumpwebhook;
      if (webhookUrl && /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl)) {
        const username = (script.ownerUsername || script.ownerId || 'unknown').toString();
        let userIdStr = '';
        try {
          const uDoc = await usersDb.collection('ScriptVoid').findOne({ username });
          if (uDoc && uDoc._id) userIdStr = uDoc._id.toString();
        } catch {}
        if (!userIdStr && script.ownerUserId) {
          userIdStr = script.ownerUserId?.toString?.() || String(script.ownerUserId);
        }
        const origin = getBaseUrl(req.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
        const scriptLink = `${origin}/script/${script.id || scriptId}`;
        let promotedLabel = 'No';
        if (script.promotionActive || script.promotionTier) {
          if (tier === 1 || tier === 'I' || tier === 'Promotion I') promotedLabel = 'Tier I';
          else if (tier === 2 || tier === 'II' || tier === 'Promotion II') promotedLabel = 'Tier II';
          else if (tier === 3 || tier === 'III' || tier === 'Promotion III') promotedLabel = 'Tier III';
          else if (tier === 4 || tier === 'IV' || tier === 'Promotion IV') promotedLabel = 'Tier IV';
        }
        const content = `Username: ${username}\nUserid: ${userIdStr}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink} Promoted: ${promotedLabel}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch (e) {}

    return NextResponse.json({ success: true, bumpPoints, bumpExpire });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
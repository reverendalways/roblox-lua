import { NextRequest, NextResponse } from "next/server";
import { getScriptsDatabase, getUsersDatabase } from "@/lib/mongodb-optimized";
import { ObjectId } from "mongodb";
import { simpleCache } from "@/lib/simple-cache";
import { smartCache } from "@/lib/smart-cache";
import jwt from "jsonwebtoken";
import { checkScriptViewRateLimit } from "@/lib/rate-limiter";

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

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

function getIPIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: scriptId } = await params;
  
  const ipIdentifier = getIPIdentifier(req);
  const rateLimitResult = await checkScriptViewRateLimit(ipIdentifier, scriptId);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Slow down!',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '5 per script, 30 global',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      }
    );
  }
  
  try {
    const userId = getUserIdFromRequest(req);
    
    const scriptsDb = await getScriptsDatabase();
    
    let user: any = null;
    if (userId) {
      const usersDb = await getUsersDatabase();
      user = await usersDb.collection("ScriptVoid").findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (user.isTimeouted === true) {
        const timeoutEnd = user.timeoutEnd ? new Date(user.timeoutEnd) : null;
        const isExpired = timeoutEnd && timeoutEnd < new Date();
        
        if (!isExpired) {
          return NextResponse.json({ 
            error: 'You are currently timeouted and cannot view scripts.',
            timeoutEnd: timeoutEnd,
            timeoutReason: user.timeoutReason || 'Admin timeout'
          }, { status: 403 });
        }
      }
    }

    const idCandidates: any[] = [];
    try { if (ObjectId.isValid(scriptId)) idCandidates.push({ _id: new ObjectId(scriptId) }); } catch {}
    const asNum = Number(scriptId);
    if (Number.isFinite(asNum)) idCandidates.push({ id: asNum });
    idCandidates.push({ id: scriptId });

    const script = await scriptsDb.collection("scripts").findOne({ $or: idCandidates });
    if (!script) {
      console.error(`Script not found for ID: ${scriptId}, candidates:`, idCandidates);
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    
    const multiplier = typeof script.multiplier === 'number' ? Math.max(0, Math.min(script.multiplier, 10)) : 1;
    const basePoints = 0.1;
    const pointsToAdd = Math.round((basePoints * multiplier) * 100) / 100;

    const isOwner = script.ownerId === userId || script.ownerUsername === user?.username;
    const updateData: any = { $inc: { views: 1 } };
    
    if (!isOwner) {
      updateData.$inc.points = pointsToAdd;
    }

    const result = await scriptsDb.collection("scripts").findOneAndUpdate(
      { 
        _id: script._id,
        views: { $gte: 0 }
      },
      updateData,
      { 
        returnDocument: "after",
        upsert: false
      }
    );
    
    if (!result || !result.value) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    
    simpleCache.clearByPattern(`script:${scriptId}`);
    simpleCache.clearByPattern('scripts');
    simpleCache.clearByPattern('fast:scripts');
    
    smartCache.clearByPattern(`script:${scriptId}`);
    smartCache.clearByPattern('scripts');
    smartCache.clearByPattern('fast:scripts');
    

    
    return NextResponse.json({ 
      views: result.value.views, 
      points: result.value.points 
    }, { status: 200 });
    
  } catch (error) {
    console.error('View update error:', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

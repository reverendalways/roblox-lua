import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { getUsersDatabase, getScriptsDatabase } from "@/lib/mongodb-optimized";
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

const DB_NAME = "users";
const LIKES_COL = "likes";
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

async function getUsersDb() { return await getUsersDatabase(); }
async function getScriptsDb() { return await getScriptsDatabase(); }

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

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await rateLimitByIP(req, 'scriptLike');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 0) {
      console.warn(`Security: Body detected in like request`);
      return NextResponse.json({ error: 'Like requests should not contain a body' }, { status: 400 });
    }

    const { id: scriptId } = await context.params;
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || !validateCSRFToken(csrfToken, userId)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }

    const usersDb = await getUsersDb();
    const usersCol = usersDb.collection("ScriptVoid");
    const user = await usersCol.findOne({ _id: new ObjectId(userId) });
    
    if (user?.isTimeouted === true) {
      const timeoutEnd = user.timeoutEnd ? new Date(user.timeoutEnd) : null;
      const isExpired = timeoutEnd && timeoutEnd < new Date();
      
      if (!isExpired) {
        return NextResponse.json({ 
          error: 'You are currently timeouted and cannot like scripts. Please check your account settings for more details.',
          timeoutEnd: timeoutEnd,
          timeoutReason: user.timeoutReason || 'Admin timeout'
        }, { status: 403 });
      }
    }

    const likesCol = usersDb.collection(LIKES_COL);
    const existing = await likesCol.findOne({ scriptId, userId });
    if (existing) {
      return NextResponse.json({ error: "Already liked" }, { status: 409 });
    }
    const scriptsDb = await getScriptsDb();
    const scriptsCol = scriptsDb.collection("scripts");
    const script = await scriptsCol.findOne({ id: scriptId });
    const multiplier = script && typeof script.multiplier === 'number' ? script.multiplier : 1;
    const basePoints = 2;
    const pointsToAdd = basePoints * multiplier;
    await likesCol.insertOne({ scriptId, userId, createdAt: new Date().toISOString(), multiplier });
    if (script) {
      const isOwner = script.ownerId === userId || script.ownerUsername === user?.username;
      const updateData: any = { $inc: { likes: 1 } };
      
      if (!isOwner) {
        updateData.$inc.points = pointsToAdd;
      }
      
      await scriptsCol.updateOne({ id: scriptId }, updateData);
    }
    
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: user?.username, 
        userId: userId,
        action: 'liked_script' 
      })
    }).catch(() => {});
    
    const updatedScript = await scriptsCol.findOne({ id: scriptId }, { projection: { likes: 1 } });
    const count = updatedScript?.likes || 0;
    return NextResponse.json({ success: true, liked: true, likeCount: count });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: scriptId } = await context.params;
    const userId = getUserIdFromRequest(req);
    
    const scriptsDb = await getScriptsDb();
    const scriptsCol = scriptsDb.collection("scripts");
    const script = await scriptsCol.findOne({ id: scriptId }, { projection: { likes: 1 } });
    const count = script?.likes || 0;
    
    let liked = false;
    if (userId) {
      const usersDb = await getUsersDb();
      const likesCol = usersDb.collection(LIKES_COL);
      liked = !!(await likesCol.findOne({ scriptId, userId }));
    }
    
    return NextResponse.json({ likeCount: count, liked });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await rateLimitByIP(req, 'scriptLike');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    if (req.method !== 'DELETE') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 0) {
      console.warn(`Security: Body detected in unlike request`);
      return NextResponse.json({ error: 'Unlike requests should not contain a body' }, { status: 400 });
    }

    const { id: scriptId } = await context.params;
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || !validateCSRFToken(csrfToken, userId)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }

    const usersDb = await getUsersDb();
    const usersCol = usersDb.collection("ScriptVoid");
    const user = await usersCol.findOne({ _id: new ObjectId(userId) });
    
    if (user?.isTimeouted === true) {
      const timeoutEnd = user.timeoutEnd ? new Date(user.timeoutEnd) : null;
      const isExpired = timeoutEnd && timeoutEnd < new Date();
      
      if (!isExpired) {
        return NextResponse.json({ 
          error: 'You are currently timeouted and cannot unlike scripts. Please check your account settings for more details.',
          timeoutEnd: timeoutEnd,
          timeoutReason: user.timeoutReason || 'Admin timeout'
        }, { status: 403 });
      }
    }

    const likesCol = usersDb.collection(LIKES_COL);
    const likeDoc = await likesCol.findOne({ scriptId, userId });
    let pointsToRemove = 0;
    if (likeDoc && typeof likeDoc.multiplier === 'number') {
      pointsToRemove = 2 * likeDoc.multiplier;
    }
    await likesCol.deleteOne({ scriptId, userId });
    const scriptsDb = await getScriptsDb();
    const scriptsCol = scriptsDb.collection("scripts");
    await scriptsCol.updateOne({ id: scriptId }, { 
      $inc: { 
        points: -pointsToRemove, 
        likes: -1 
      } 
    });
    
    const updatedScript = await scriptsCol.findOne({ id: scriptId }, { projection: { likes: 1 } });
    const count = updatedScript?.likes || 0;
    return NextResponse.json({ success: true, liked: false, likeCount: count });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
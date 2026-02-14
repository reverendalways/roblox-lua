import { NextRequest, NextResponse } from "next/server";
import { mongoPool } from "@/lib/mongodb-pool";
import { ObjectId } from "mongodb";
import { filterContentByField } from "@/lib/content-filter";
import jwt from "jsonwebtoken";
import { getBaseUrl } from "@/lib/url";
import { getUsersDatabase, getScriptsDatabase } from "@/lib/mongodb-optimized";
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';
import { clearScriptsCache } from '@/lib/smart-cache';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'comment');
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
    if (contentLength && parseInt(contentLength) > 10 * 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }


    const token = req.cookies.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    let payload: any = null;
    try { 
      payload = jwt.verify(token.value, JWT_SECRET, { 
        algorithms: ['HS256'] 
      }); 
    } catch { return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }); }

    const body = await req.json();
    
    const csrfToken = req.headers.get('x-csrf-token') || 
                     req.headers.get('csrf-token') ||
                     body.csrfToken;
    
    if (!csrfToken) {
      return NextResponse.json({ error: "CSRF token required" }, { status: 403 });
    }
    
    if (payload.userId && !validateCSRFToken(csrfToken, payload.userId)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }
    
    const allowedFields = ['content', 'scriptId', 'userId', 'csrfToken'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in comment: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'updatedAt', 'username', 'userAvatar',
      'verified', 'isVerified', 'points', 'multiplier', 'likes', 'replies',
      'isEdited', 'editHistory', 'isDeleted', 'deletedAt', 'admin', 'isAdmin'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in comment: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.content !== undefined && typeof body.content !== 'string') {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }
    if (body.scriptId !== undefined && typeof body.scriptId !== 'string' && typeof body.scriptId !== 'number') {
      return NextResponse.json({ error: "Script ID must be a string or number" }, { status: 400 });
    }
    if (body.userId !== undefined && typeof body.userId !== 'string') {
      return NextResponse.json({ error: "User ID must be a string" }, { status: 400 });
    }
    if (body.csrfToken !== undefined && typeof body.csrfToken !== 'string') {
      return NextResponse.json({ error: "CSRF token must be a string" }, { status: 400 });
    }

    const { content, scriptId } = body;
    if (content === undefined || scriptId === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const userIdStr = typeof payload.userId === 'string' ? payload.userId : '';
    const scriptIdStr = typeof scriptId === 'string' ? scriptId : String(scriptId);
    const contentText = typeof content === 'string' ? content : String(content);

    if (contentText.trim().length < 2 || contentText.length > 1000) {
      return NextResponse.json({ error: "Comment must be 2-1000 characters" }, { status: 400 });
    }

    const contentFilter = filterContentByField(contentText, 'comment');
    if (!contentFilter.isValid) {
      return NextResponse.json({ error: contentFilter.error }, { status: 400 });
    }
    const cleanContent = contentText;
    const sanitizedForWebhook = contentText
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .substring(0, 500);

    const client = await mongoPool.getClient();
    const db = client.db("mydatabase");
    
    let user: any = null;
    try { user = await client.db("users").collection("ScriptVoid").findOne({ _id: new ObjectId(userIdStr) }); } catch {}
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isTimeouted === true) {
      const timeoutEnd = user.timeoutEnd ? new Date(user.timeoutEnd) : null;
      const isExpired = timeoutEnd && timeoutEnd < new Date();
      
      if (!isExpired) {
        return NextResponse.json({ 
          error: 'You are currently timeouted and cannot post comments. Please check your account settings for more details.',
          timeoutEnd: timeoutEnd,
          timeoutReason: user.timeoutReason || 'Admin timeout'
        }, { status: 403 });
      }
    }

    const idCandidates: any[] = [];
    try { if (ObjectId.isValid(scriptIdStr)) idCandidates.push({ _id: new ObjectId(scriptIdStr) }); } catch {}
    const asNum = Number(scriptIdStr);
    if (Number.isFinite(asNum)) idCandidates.push({ id: asNum });
    idCandidates.push({ id: scriptIdStr });
    const script = await db.collection("scripts").findOne({ $or: idCandidates });
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    const multiplier = typeof script.multiplier === 'number' ? script.multiplier : 1;
    const basePoints = 4;
    const pointsToAdd = basePoints * multiplier;
    
    const isOwner = script.ownerId === userIdStr || script.ownerUsername === user?.username;
    const commentId = new ObjectId().toString();
    const userInfo: any = await client.db("users").collection("ScriptVoid").findOne({ _id: new ObjectId(userIdStr) });
    const comment = {
      id: commentId,
      userId: userIdStr,
      username: userInfo?.username || undefined,
      content: cleanContent,
      timestamp: new Date().toISOString(),
      multiplier
    };
    const userObjectId = userInfo?._id ? userInfo._id.toString() : undefined;
    const commentWithId = { ...comment, userObjectId };
    
    const updateData: any = { $push: { comments: commentWithId } };
    
    if (!isOwner) {
      updateData.$inc = { points: pointsToAdd };
    }
    
    await db.collection("scripts").updateOne(
      { $or: idCandidates },
      updateData
    );
    
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: userInfo?.username, 
        userId: userIdStr,
        action: 'commented' 
      })
    }).catch(() => {});
    
    try {
      const scriptOwnerUsername = script.ownerId || script.ownerUsername;
      const commenterUsername = userInfo?.username || '';
      if (scriptOwnerUsername && commenterUsername && scriptOwnerUsername !== commenterUsername) {
        const notificationMessage = `Somebody has commented on "${script.title}"|${scriptId}`;
        
        const usersDb = await getUsersDatabase();
        const userDoc = await usersDb.collection("ScriptVoid").findOne({ username: scriptOwnerUsername });
        
        if (userDoc && userDoc._id) {
          await fetch(`/api/notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
            },
            body: JSON.stringify({
              userId: userDoc._id.toString(),
              type: 'Comment',
              message: notificationMessage
            })
          });
        }
      }
    } catch (notificationError) {
    }
    
    try {
      const webhookUrl = process.env.commentwebhook;
      if (webhookUrl) {
        const username = (userInfo?.username || userIdStr).toString();
        const userIdLine = userInfo?._id ? userInfo._id.toString() : userIdStr;
        const origin = getBaseUrl(req.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
        const scriptLink = `${origin}/script/${script.id || scriptIdStr}`;
        const content = `Username: ${username}\nUserid: ${userIdLine}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nComment id: ${commentId}\nComment: ${sanitizedForWebhook}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    clearScriptsCache();
    
    const responseComment = {
      ...commentWithId,
      username: userInfo?.username || commentWithId.username,
      avatar: userInfo?.avatar || userInfo?.accountthumbnail || userInfo?.profileImage || undefined
    };
    return NextResponse.json(responseComment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {

    const token = req.cookies.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    let payload: any = null;
    try { 
      payload = jwt.verify(token.value, JWT_SECRET, { 
        algorithms: ['HS256'] 
      }); 
    } catch { return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }); }

    const body = await req.json();
    
    const csrfToken = req.headers.get('x-csrf-token') || 
                     req.headers.get('csrf-token') ||
                     body.csrfToken;
    
    if (!csrfToken) {
      return NextResponse.json({ error: "CSRF token required" }, { status: 403 });
    }
    
    if (payload.userId && !validateCSRFToken(csrfToken, payload.userId)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }

    const authUserId = typeof payload.userId === 'string' ? payload.userId : '';
    if (!authUserId || !ObjectId.isValid(authUserId)) {
      return NextResponse.json({ error: 'Invalid user identity' }, { status: 401 });
    }

    const { commentId, scriptId } = body;
    if (!commentId || !scriptId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const db = await getScriptsDatabase();
    const idCandidates: any[] = [];
    try { if (ObjectId.isValid(String(scriptId))) idCandidates.push({ _id: new ObjectId(String(scriptId)) }); } catch {}
    const asNum = Number(String(scriptId));
    if (Number.isFinite(asNum)) idCandidates.push({ id: asNum });
    idCandidates.push({ id: String(scriptId) });
    const script = await db.collection("scripts").findOne({ $or: idCandidates });
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    const comment = (script.comments || []).find((c: any) => c.id === commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const usersDb = await getUsersDatabase();
    const usersCol = usersDb.collection("ScriptVoid");
    let authUser: any = null;
    try { authUser = await usersCol.findOne({ _id: new ObjectId(authUserId) }, { projection: { username: 1 } }); } catch {}
    const authUsername = authUser?.username || '';
    const isOwner = (
      comment.userObjectId && comment.userObjectId === authUserId
    ) || (
      comment.userId && (comment.userId === authUserId || (authUsername && comment.userId === authUsername))
    ) || (
      authUsername && comment.username === authUsername
    );
    if (!isOwner) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    let pointsToRemove = 0;
    if (comment && typeof comment.multiplier === 'number') {
      pointsToRemove = 4 * comment.multiplier;
    }
    await db.collection("scripts").updateOne(
      { $or: idCandidates },
      { $pull: { comments: { id: commentId } }, $inc: { points: -pointsToRemove } } as any
    );
    
    clearScriptsCache();

    try {
      const webhookUrl = process.env.deletecommentwebhook;
      if (webhookUrl) {
        const userDoc: any = authUser;
        const username = (userDoc?.username || comment.userId || '').toString();
        const userIdLine = userDoc?._id ? userDoc._id.toString() : authUserId;
        const origin = getBaseUrl(req.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
        const scriptLink = `${origin}/script/${script.id || String(scriptId)}`;
        const sanitizedCommentContent = (comment.content || '')
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .substring(0, 500);
        const content = `Username: ${username}\nUserid: ${userIdLine}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nComment: ${sanitizedCommentContent}\nComment id: ${commentId}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

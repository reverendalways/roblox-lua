import { NextRequest, NextResponse } from "next/server";
import { mongoPool } from '@/lib/mongodb-pool';
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { getBaseUrl } from "@/lib/url";
import { clearScriptsCache } from "@/lib/smart-cache";
import { getUsersDatabase, getScriptsDatabase } from "@/lib/mongodb-optimized";
import { getDemoScriptById } from "@/lib/demo-data";

const LIKES_COL = "likes";
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

function getUserIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get("token");
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token.value, JWT_SECRET);
    return payload.userId && typeof payload.userId === 'string' ? payload.userId : null;
  } catch {
    return null;
  }
}

async function getAuthIdentity(req: NextRequest): Promise<{ username: string | null, userId: string | null }> {
  const nextAuthCookie = req.cookies.get('next-auth.session-token') || req.cookies.get('__Secure-next-auth.session-token');
  if (nextAuthCookie) {
    try {
      const payload: any = jwt.verify(nextAuthCookie.value, JWT_SECRET);
      if (payload && payload.username) {
        try {
          const usersDb = await getUsersDatabase();
          const userDoc = await usersDb.collection("ScriptVoid").findOne({ username: payload.username }, { projection: { _id: 1 } });
          return { username: payload.username, userId: userDoc?._id?.toString?.() || null };
        } catch {
          return { username: payload.username, userId: null };
        }
      }
    } catch {}
  }

  const fallbackUserId = getUserIdFromRequest(req);
  if (fallbackUserId) {
    try {
      const usersDb = await getUsersDatabase();
      const userDoc = await usersDb.collection("ScriptVoid").findOne({ _id: new ObjectId(fallbackUserId) }, { projection: { username: 1 } });
      return { username: userDoc?.username || null, userId: fallbackUserId };
    } catch {
      return { username: null, userId: fallbackUserId };
    }
  }

  return { username: null, userId: null };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const isEdit = searchParams.get('edit') === 'true';
  
  try {
    const scriptsDb = await getScriptsDatabase();
    const script = await scriptsDb.collection("scripts").findOne(
      { 
        $or: [
          ...(/^[0-9a-fA-F]{24}$/.test(id) ? [{ _id: new ObjectId(id) }] : []),
          ...(Number.isFinite(Number(id)) ? [{ id: Number(id) }] : []),
          { id: id }
        ]
      },
      { 
        projection: {
          _id: 1, id: 1, title: 1, description: 1, features: 1, scriptCode: 1, views: 1,
          ownerId: 1, ownerUsername: 1, ownerUserId: 1, ownerVerified: 1, verified: 1,
          customThumbnail: 1, thumbnailUrl: 1, dbThumbnail: 1, databaseThumbnail: 1, isUniversal: 1,
          price: 1, priceAmount: 1, points: 1, multiplier: 1, likes: 1,
          status: 1, createdAt: 1, updatedAt: 1, isOrphaned: 1,
          gameId: 1, gameName: 1, gameTitle: 1, visibility: 1,
          discordServer: 1, keySystemLink: 1, tags: 1, comments: 1,
          isBumped: 1, bumpExpire: 1, promotionActive: 1, promotionTier: 1,
          promotionCode: 1, promotionExpiresAt: 1, effectiveAge: 1,
          ageResetAt: 1, ageResetCode: 1, scriptAgeReset: 1
        }
      }
    );
    
    if (!script) {
      const demoScript = getDemoScriptById(id);
      if (demoScript) {
        const optimizedScript = {
          ...demoScript,
          thumbnailUrl: demoScript.thumbnailUrl || (demoScript.isUniversal ? "/universal.png" : "/no-thumbnail.png"),
          ownerVerified: demoScript.verified || demoScript.ownerVerified || false,
          ownerIsVerified: demoScript.verified || demoScript.ownerVerified || false,
          likes: demoScript.likes || 0,
          isLiked: false
        };
        return NextResponse.json(optimizedScript);
      }
      clearScriptsCache();
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    
    const likeData = await (async () => {
      const userId = getUserIdFromRequest(request);
      
      try {
        const likeCount = script.likes || 0;
        
        let isLiked = false;
        if (userId) {
          const usersDb = await getUsersDatabase();
          const userLike = await usersDb.collection("likes").findOne({ scriptId: id, userId }, { projection: { _id: 1 } });
          isLiked = !!userLike;
        }
        
        return {
          likes: likeCount,
          isLiked: isLiked
        };
      } catch {
        return { likes: script.likes || 0, isLiked: false };
      }
    })();

    const optimizedScript = {
      ...JSON.parse(JSON.stringify(script)),
      description: (script.description || '').toString(),
      thumbnailUrl: script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || (script.isUniversal ? "/universal.png" : "/no-thumbnail.png"),
      dbThumbnail: script.dbThumbnail || script.databaseThumbnail || null,
      ownerVerified: script.ownerVerified || script.verified || false,
      ownerIsVerified: script.ownerVerified || script.verified || false,
      likes: likeData.likes,
      isLiked: likeData.isLiked
    };

    const response = NextResponse.json(optimizedScript);
    if (isEdit) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300');
    }
    
    return response;
    
  } catch (err) {
    console.error('Script fetch error:', err);
    const demoScript = getDemoScriptById(id);
    if (demoScript) {
      const optimizedScript = {
        ...demoScript,
        thumbnailUrl: demoScript.thumbnailUrl || (demoScript.isUniversal ? "/universal.png" : "/no-thumbnail.png"),
        ownerVerified: demoScript.verified || demoScript.ownerVerified || false,
        ownerIsVerified: demoScript.verified || demoScript.ownerVerified || false,
        likes: demoScript.likes || 0,
        isLiked: false
      };
      return NextResponse.json(optimizedScript);
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { username, userId } = await getAuthIdentity(request);
    
    if (!username && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scriptsDb = await getScriptsDatabase();
    let isVerified = false;
    try {
      if (userId) {
        const usersDb = await getUsersDatabase();
        const userDoc = await usersDb.collection("ScriptVoid").findOne({ _id: new ObjectId(userId) }, { projection: { verified: 1 } });
        isVerified = Boolean(userDoc?.verified);
      }
    } catch {}
    
    const idCandidates: any[] = [];
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      try { idCandidates.push({ _id: new ObjectId(id) }); } catch {}
    }
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      idCandidates.push({ id: numericId });
    }
    idCandidates.push({ id: id });

    const ownerCandidates: any[] = [];
    if (userId) {
      ownerCandidates.push({ ownerUserId: userId });
      try { ownerCandidates.push({ ownerUserId: new ObjectId(userId) }); } catch {}
    }
    if (username) {
      ownerCandidates.push({ ownerId: username }, { ownerUsername: username });
    }

    const scriptDoc = await scriptsDb.collection("scripts").findOne(
      { $or: idCandidates },
      { projection: { _id: 1, id: 1, ownerId: 1, ownerUsername: 1, ownerUserId: 1, ownerVerified: 1, verified: 1 } }
    );

    if (!scriptDoc) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    let isOwner = false;
    if (userId && scriptDoc.ownerUserId) {
      try {
        const docOwnerIdStr = typeof scriptDoc.ownerUserId === 'string' ? scriptDoc.ownerUserId : (scriptDoc.ownerUserId?.toString?.() || '');
        isOwner = docOwnerIdStr === userId;
        if (!isOwner) {
          if (/^[0-9a-fA-F]{24}$/.test(userId) && /^[0-9a-fA-F]{24}$/.test(docOwnerIdStr)) {
            isOwner = new ObjectId(userId).equals(new ObjectId(docOwnerIdStr));
          }
        }
      } catch {
        isOwner = false;
      }
    }
    if (!isOwner && username) {
      const ownerName = (scriptDoc.ownerId || scriptDoc.ownerUsername || '').toString();
      if (ownerName) {
        isOwner = ownerName.toLowerCase() === username.toLowerCase();
      }
      if (!isOwner && userId && typeof userId === 'string') {
        isOwner = ownerName.toLowerCase() === userId.toLowerCase();
      }
    }

    if (!isOwner) {
      return NextResponse.json({ error: "You can only delete your own scripts" }, { status: 403 });
    }

    await scriptsDb.collection("scripts").deleteOne({ _id: scriptDoc._id });

    try {
      clearScriptsCache();
    } catch (error) {
    }

    try {
      const webhookUrl = process.env.deletewebhook;
      if (webhookUrl) {
        const profileName = username || scriptDoc.ownerId || scriptDoc.ownerUsername || "unknown";
        const base = getBaseUrl(request.nextUrl.origin);
        const profileUrl = `${base}/profile/${encodeURIComponent(profileName)}`;
        let userIdStr = userId || '';
        if (!userIdStr && scriptDoc.ownerUserId) {
          userIdStr = typeof scriptDoc.ownerUserId === 'string' ? scriptDoc.ownerUserId : (scriptDoc.ownerUserId?.toString?.() || '');
        }
        const scriptIdStr = scriptDoc.id ?? id;
        const verifiedFlag = isVerified || Boolean(scriptDoc.ownerVerified || scriptDoc.verified);
        const content = `Username: ${profileName}\nUserid: ${userIdStr}\nUser Profile: ${profileUrl}\nScript id: ${scriptIdStr}\nVerification Status: ${verifiedFlag ? 'Verified' : 'Unverified'}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true, message: "Script deleted successfully" });

  } catch (error) {
    console.error('Script deletion error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

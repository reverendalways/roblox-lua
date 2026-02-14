import { NextRequest, NextResponse } from "next/server";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { filterBase64Image, filterContentByField } from "@/lib/content-filter";
import { getBaseUrl } from "@/lib/url";
import { optimizeRobloxThumbnail, optimizeCustomThumbnail } from '@/lib/roblox-thumbnail-optimizer';
import { rateLimitByIP } from '@/middleware/rate-limit';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}



function getUserIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get('token');
  if (!token) {
    return null;
  }
  
  try {
    const payload: any = jwt.verify(token.value, JWT_SECRET);
    
    let userId = null;
    
    if (payload.userId) {
      userId = payload.userId;
    }
    else if (payload.username) {
      userId = payload.username;
    }
    else if (payload.id) {
      userId = payload.id;
    }
    else if (payload.email) {
      userId = payload.email;
    }
    
    return userId;
  } catch (error) {
    return null;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await rateLimitByIP(request, 'scriptEdit');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    if (request.method !== 'PATCH') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getScriptsDatabase();
    
    const body = await request.json();
    
    const allowedFields = [
      'title', 'features', 'scriptCode', 'gameId', 'isUniversal', 
      'price', 'priceAmount', 'discordServer', 'keySystemLink', 
      'customThumbnail', 'tags'
    ];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in script edit: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', 'status', 'multiplier', 'thumbnailUrl', 'gameName', 'createdAt', 'updatedAt',
      'views', 'likes', 'ownerUserId', 'ownerId', 'ownerUsername', 'ownerAvatar', 
      'ownerVerified', 'isVerified', 'comments', 'points', 'promotionTier', 
      'promotionCode', 'promotionExpiresAt', 'promotionActive', 'isBumped', 
      'bumpExpire', 'lastActivity', 'isOrphaned'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in script edit: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.title !== undefined && typeof body.title !== 'string') {
      return NextResponse.json({ error: "Title must be a string" }, { status: 400 });
    }
    if (body.features !== undefined && typeof body.features !== 'string') {
      return NextResponse.json({ error: "Features must be a string" }, { status: 400 });
    }
    if (body.scriptCode !== undefined && typeof body.scriptCode !== 'string') {
      return NextResponse.json({ error: "Script code must be a string" }, { status: 400 });
    }
    if (body.gameId !== undefined && typeof body.gameId !== 'string') {
      return NextResponse.json({ error: "Game ID must be a string" }, { status: 400 });
    }
    if (body.isUniversal !== undefined && typeof body.isUniversal !== 'boolean') {
      return NextResponse.json({ error: "isUniversal must be a boolean" }, { status: 400 });
    }
    if (body.price !== undefined && typeof body.price !== 'string') {
      return NextResponse.json({ error: "Price must be a string" }, { status: 400 });
    }
    if (body.priceAmount !== undefined && body.priceAmount !== null && typeof body.priceAmount !== 'number') {
      return NextResponse.json({ error: "Price amount must be a number or null" }, { status: 400 });
    }
    if (body.discordServer !== undefined && typeof body.discordServer !== 'string') {
      return NextResponse.json({ error: "Discord server must be a string" }, { status: 400 });
    }
    if (body.keySystemLink !== undefined && typeof body.keySystemLink !== 'string') {
      return NextResponse.json({ error: "Key system link must be a string" }, { status: 400 });
    }
    if (body.customThumbnail !== undefined && typeof body.customThumbnail !== 'string' && body.customThumbnail !== null) {
      return NextResponse.json({ error: "Custom thumbnail must be a string or null" }, { status: 400 });
    }
    if (body.tags !== undefined && !Array.isArray(body.tags)) {
      return NextResponse.json({ error: "Tags must be an array" }, { status: 400 });
    }
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    const idCandidates: any[] = [];
    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
      try { idCandidates.push({ _id: new ObjectId(id) }); } catch {}
    }
    const idAsNum = Number(id);
    if (Number.isFinite(idAsNum)) {
      idCandidates.push({ id: idAsNum });
    }
    idCandidates.push({ id });

    let script = await db.collection("scripts").findOne({ $or: idCandidates });
    
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    


    let isOwner = false;
    

    
    if (script.ownerUserId && userId) {
      try {
        const scriptOwnerId = new ObjectId(script.ownerUserId);
        const requestUserId = new ObjectId(userId);
        isOwner = scriptOwnerId.equals(requestUserId);
        

      } catch (error) {
        isOwner = script.ownerUserId.toString() === userId.toString();
      }
    }
    
    if (script.isOrphaned === true) {
      isOwner = false;
    }
    
    if (!isOwner) {
      return NextResponse.json({ error: "You don't own this script" }, { status: 403 });
    }

    function trimAndCheck(str: any) {
      if (typeof str !== 'string') return '';
      return str.trim();
    }

    const title = trimAndCheck(body.title);
    const features = trimAndCheck(body.features);
    const scriptCode = trimAndCheck(body.scriptCode);
    const gameId = trimAndCheck(body.gameId);
    const discordServer = trimAndCheck(body.discordServer);
    const keySystemLink = trimAndCheck(body.keySystemLink);
    const customThumbnail = body.customThumbnail;
    const isUniversal = body.isUniversal === true;
    const price = body.price;
    const priceAmount = body.priceAmount;
    
    let tags: string[] = [];
    if (body.tags && Array.isArray(body.tags)) {
      tags = body.tags
        .map((tag: any) => typeof tag === 'string' ? tag.trim() : '')
        .filter((tag: string) => tag.length > 0 && tag.length <= 20)
        .slice(0, 10)
        .map(tag => {
          const tagFilter = filterContentByField(tag, 'general');
          if (!tagFilter.isValid) {
            throw new Error(`Tag "${tag}" contains inappropriate content`);
          }
          return tagFilter.cleanedText;
        });
    }

    
    
    if (!title || title.replace(/\s/g, '').length < 3) {
      return NextResponse.json({ error: "Title must be at least 3 non-space characters. Current length: " + (title?.replace(/\s/g, '').length || 0) }, { status: 400 });
    }
    if (title.length > 45) {
      return NextResponse.json({ error: "Title must be less than or equal to 45 characters. Current length: " + title.length }, { status: 400 });
    }
    if (!features || features.replace(/\s/g, '').length < 10) {
      return NextResponse.json({ error: "Description must be at least 10 non-space characters. Current length: " + (features?.replace(/\s/g, '').length || 0) }, { status: 400 });
    }
    if (features.length > 2000) {
      return NextResponse.json({ error: "Description must be less than or equal to 2000 characters. Current length: " + features.length }, { status: 400 });
    }
    
    const titleFilter = filterContentByField(title, 'script-title');
    if (!titleFilter.isValid) {
      return NextResponse.json({ error: titleFilter.error }, { status: 400 });
    }
    const cleanTitle = titleFilter.cleanedText;
    
    const featuresFilter = filterContentByField(features, 'script-description');
    if (!featuresFilter.isValid) {
      return NextResponse.json({ error: featuresFilter.error }, { status: 400 });
    }
    const cleanFeatures = featuresFilter.cleanedText;
    
    
    
    if (!scriptCode || scriptCode.replace(/\s/g, '').length < 10) {
      return NextResponse.json({ error: "Script code must be at least 10 non-space characters" }, { status: 400 });
    }
    if (scriptCode.length > 25000) {
      return NextResponse.json({ error: "Script code must be less than or equal to 25000 characters" }, { status: 400 });
    }

    if (!isUniversal && (!gameId || gameId.trim() === '')) {
      return NextResponse.json({ error: "Game ID is required for non-universal scripts" }, { status: 400 });
    }

    
    
    if (isUniversal) {
      const hasExistingThumbnail = script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl;
      
      
      
      if (!customThumbnail && !hasExistingThumbnail) {
        return NextResponse.json({ 
          error: "Custom thumbnail is required for universal scripts. Please upload an image thumbnail since universal scripts don't have a specific game thumbnail." 
        }, { status: 400 });
      }
      
    }

    if (customThumbnail && typeof customThumbnail === 'string') {
      const base64Length = customThumbnail.length - (customThumbnail.indexOf(',') + 1);
      const sizeInMB = base64Length * 3 / 4 / 1024 / 1024;
      if (sizeInMB > 1.5) {
        return NextResponse.json({ error: "Thumbnail image must be less than 1.5MB." }, { status: 400 });
      }

      const contentFilter = await filterBase64Image(customThumbnail, 0.8);
      if (!contentFilter.isSafe) {
        console.log(`Content filter blocked script edit thumbnail: ${contentFilter.reason}`);
        return NextResponse.json({ 
          error: 'Content not allowed', 
          reason: 'Thumbnail contains inappropriate content' 
        }, { status: 400 });
      }
    }

    if (discordServer && !/^https?:\/\/(www\.)?discord\.(gg|com)\/(invite\/)?[\w-]+$/.test(discordServer)) {
      return NextResponse.json({ error: "Must be a valid Discord invite link (e.g., https://discord.gg/abc123 or https://discord.com/invite/abc123)" }, { status: 400 });
    }
    if (keySystemLink && !/^https?:\/\/.+/.test(keySystemLink)) {
      return NextResponse.json({ error: "Key system link must be a valid URL starting with http:// or https://" }, { status: 400 });
    }

    if (price && !['Free', 'Paid'].includes(price)) {
      return NextResponse.json({ error: "Script type must be Free or Paid" }, { status: 400 });
    }


    const updateData: any = {
      title: cleanTitle,
      features: cleanFeatures,
      scriptCode,
      isUniversal,
      gameId: isUniversal ? "universal" : gameId,
      discordServer: discordServer || null,
      keySystemLink: keySystemLink || null,
      price: price || 'Free',
      priceAmount: price === 'Paid' ? priceAmount : null,
      tags: tags,
      status: script.status,
      updatedAt: new Date(),
    };
    
    if (customThumbnail && 
        typeof customThumbnail === 'string' && 
        customThumbnail.startsWith('data:image') &&
        customThumbnail !== script.customThumbnail) {
      
      updateData.thumbnailUrl = script.thumbnailUrl || "/no-thumbnail.png";
      
      setImmediate(async () => {
        try {
          const optimizedUrl = await optimizeCustomThumbnail(customThumbnail, id);
          if (optimizedUrl) {
            await db.collection("scripts").updateOne(
              { _id: script._id },
              { $set: { thumbnailUrl: optimizedUrl, updatedAt: new Date().toISOString() } }
            );
            console.log(`Updated script ${id} with optimized custom thumbnail after edit`);
          }
        } catch (error) {
          console.error('Background custom thumbnail optimization failed:', error);
        }
      });
    }
    
    if (script.dbThumbnail) {
      updateData.dbThumbnail = script.dbThumbnail;
    }
    if (script.databaseThumbnail) {
      updateData.databaseThumbnail = script.databaseThumbnail;
    }
    
    if (customThumbnail && 
        customThumbnail.startsWith('data:image') && 
        customThumbnail !== script.customThumbnail) {
    } else {
      if (script.customThumbnail) {
        updateData.customThumbnail = script.customThumbnail;
      }
      if (script.thumbnailUrl && !updateData.thumbnailUrl) {
        updateData.thumbnailUrl = script.thumbnailUrl;
      }
    }
    

    if (!isUniversal && gameId && gameId !== script.gameId) {
      updateData.gameName = "Loading Game Info...";
      
      setImmediate(async () => {
        try {
          const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${gameId}/universe`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (universeRes.ok) {
            const universeData = await universeRes.json();
            
            if (universeData && universeData.universeId) {
              const universeId = universeData.universeId;
              
              const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              if (gameRes.ok) {
                const gameData = await gameRes.json();
                
                if (gameData && gameData.data && gameData.data[0] && gameData.data[0].name) {
                  const fetchedGameName = gameData.data[0].name;
                  
                  await db.collection("scripts").updateOne(
                    { _id: script._id },
                    { 
                      $set: { 
                        gameName: fetchedGameName,
                        updatedAt: new Date().toISOString()
                      } 
                    }
                  );
                  
                  if (!customThumbnail || !customThumbnail.startsWith('data:image')) {
                    try {
                      const robloxThumbnailUrl = await optimizeRobloxThumbnail({ 
                        gameId: gameId, 
                        scriptId: id 
                      });
                      if (robloxThumbnailUrl) {
                        await db.collection("scripts").updateOne(
                          { _id: script._id },
                          { $set: { thumbnailUrl: robloxThumbnailUrl } }
                        );
                      }
                    } catch (thumbError) {
                      console.error('Background Roblox thumbnail optimization failed:', thumbError);
                    }
                  }
                  
                  console.log(`Updated script ${id} with game info after edit: ${fetchedGameName}`);
                }
              }
            }
          }
        } catch (error) {
          console.error('Background game info fetch failed during edit:', error);
        }
      });
    }

    if (isUniversal && script.gameId !== 'universal') {
      updateData.gameName = "Universal Script";
    }


    
    const summarizeChanges = (before: any, after: any) => {
      const changes: string[] = [];
      const keys = new Set<string>([...Object.keys(before || {}), ...Object.keys(after || {})]);
      const THUMBNAIL_KEYS = new Set(['thumbnailUrl', 'customThumbnail', 'dbThumbnail', 'databaseThumbnail']);
      let thumbnailLogged = false;
      const clip = (s: string) => (s.length > 60 ? s.slice(0, 57) + '...' : s);
      for (const key of keys) {
        if (key === 'updatedAt') continue;
        const prev = before?.[key];
        const next = after?.[key];
        const prevDefined = typeof prev !== 'undefined' && prev !== null && prev !== '';
        const nextDefined = typeof next !== 'undefined' && next !== null && next !== '';

        if (THUMBNAIL_KEYS.has(key)) {
          const prevStr = typeof prev === 'string' ? prev : JSON.stringify(prev);
          const nextStr = typeof next === 'string' ? next : JSON.stringify(next);
          if (prevStr !== nextStr && !thumbnailLogged) {
            changes.push('thumbnail changed');
            thumbnailLogged = true;
          }
          continue;
        }

        if (!prevDefined && nextDefined) {
          changes.push(`added ${key}`);
          continue;
        }
        if (prevDefined && !nextDefined) {
          changes.push(`removed ${key}`);
          continue;
        }
        if (prevDefined && nextDefined) {
          const prevStr = typeof prev === 'string' ? prev : JSON.stringify(prev);
          const nextStr = typeof next === 'string' ? next : JSON.stringify(next);
          if (prevStr !== nextStr) {
            changes.push(`changed ${key}: "${clip(prevStr)}" -> "${clip(nextStr)}"`);
          }
        }
      }
      return changes.slice(0, 8).join('; ');
    };

    const result = await db.collection("scripts").updateOne(
      { _id: script._id },
      { $set: updateData }
    );

    if (!result.acknowledged) {
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "No changes were made" }, { status: 400 });
    }

    try {
      const { clearScriptsCache } = await import("../../../../../lib/smart-cache");
      clearScriptsCache();
    } catch (error) {
    }

    const updatedScript = await db.collection("scripts").findOne({ _id: script._id });
    
    if (!updatedScript) {
      return NextResponse.json({ error: "Failed to fetch updated script" }, { status: 500 });
    }
    
    try {
      const webhookUrl = process.env.editwebhook;
      if (webhookUrl && /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl)) {
        const username = (updatedScript.ownerId || updatedScript.ownerUsername || 'unknown').toString();
        const userIdStr = (updatedScript.ownerUserId && updatedScript.ownerUserId.toString) ? updatedScript.ownerUserId.toString() : (updatedScript.ownerUserId || '');
        const origin = getBaseUrl(request.nextUrl.origin);
        const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
        const scriptLink = `${origin}/script/${updatedScript.id || id}`;
        const verifiedFlag = Boolean(updatedScript.ownerVerified || updatedScript.verified);
        const editSummary = summarizeChanges(script, updatedScript) || 'No visible changes';
        const sanitizedEditSummary = editSummary
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .substring(0, 200);
        const content = `Username: ${username}\nUserid: ${userIdStr}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nVerification Status: ${verifiedFlag ? 'Verified' : 'Unverified'}\nEdit: ${sanitizedEditSummary}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    if (body.gameId && /^\d+$/.test(body.gameId) && !customThumbnail && body.gameId !== script.gameId) {
      setImmediate(async () => {
        try {
          const optimizedThumbnailUrl = await optimizeRobloxThumbnail({ 
            gameId: body.gameId, 
            scriptId: id 
          });
          
          if (optimizedThumbnailUrl) {
            await db.collection('scripts').updateOne(
              { _id: script._id },
              { $set: { thumbnailUrl: optimizedThumbnailUrl } }
            );
            console.log(`Updated script ${id} with optimized Roblox thumbnail after edit`);
          }
        } catch (error) {
          console.error('Failed to optimize Roblox thumbnail after edit:', error);
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Script updated successfully",
      script: updatedScript 
    });

  } catch (error) {
    console.error('Script edit error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
    
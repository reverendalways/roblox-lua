
import { NextRequest, NextResponse } from "next/server";
import { mongoPool } from '@/lib/mongodb-pool';
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { filterBase64Image, filterContentByField } from "@/lib/content-filter";
import { rateLimitByIP } from '@/middleware/rate-limit';
import { addScriptChange } from "@/lib/simple-cache";
import { clearScriptsCache } from "@/lib/smart-cache";
import { smartCache } from "@/lib/smart-cache";
import { getScriptsDatabase, getUsersDatabase } from "@/lib/mongodb-optimized";
import { headers } from "next/headers";
import { validateCSRFToken } from '@/lib/csrf-protection';
import { validateTurnstileFromBody } from '@/lib/turnstile-verification';
import { optimizeRobloxThumbnail, optimizeCustomThumbnail } from '@/lib/roblox-thumbnail-optimizer';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

function levenshtein(a: string, b: string) {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
    }
  }
  return matrix[a.length][b.length];
}
function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

let indexesEnsured = false;

function sanitizeInput(input: any): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function validateCSRF(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const expectedOrigin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  if (origin === expectedOrigin || referer?.startsWith(expectedOrigin)) {
    return true;
  }
  
  if (process.env.NODE_ENV === 'development' && 
      (origin?.includes('localhost') || referer?.includes('localhost'))) {
    return true;
  }
  
  return false;
}

function validateFileType(base64String: string): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const matches = base64String.match(/^data:(image\/[a-zA-Z]+);base64,/);
  return matches ? validTypes.includes(matches[1]) : false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  
  try {
    const db = await getScriptsDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));
    const includePopularParam = searchParams.get('includePopular');
    const includePopular = includePopularParam === '1' || (includePopularParam === null && page === 0);
    const skip = page * limit;
    
    

    const cacheKey = `browse:scripts:v2:${page}:${limit}`;
    let newest: any[] = smartCache.get(cacheKey) as any[] || [];
    
    if (!newest || newest.length === 0) {
      try {
        newest = await db.collection('scripts')
          .find({}, { 
            projection: { 
              id: 1, title: 1, thumbnailUrl: 1, gameName: 1, views: 1, likes: 1, 
              isUniversal: 1, price: 1, priceAmount: 1, createdAt: 1, ownerId: 1, 
              ownerUsername: 1, ownerVerified: 1, isVerified: 1, points: 1, 
              discordServer: 1, keySystemLink: 1, status: 1, lastActivity: 1, comments: 1
            } 
          })
          .sort({ lastActivity: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
      } catch (error) {
        console.error('Browse scripts query error:', error);
        newest = [];
      }
      
      newest.forEach((script: any) => {
        script.commentCount = Array.isArray(script.comments) ? script.comments.length : 0;
        delete script.comments;
      });
      
      smartCache.set(cacheKey, newest, { 
        totalCount: newest.length, 
        lastModified: Date.now(),
        ttl: 120000
      });
    }

    let popular: any[] = [];
    if (includePopular) {
      const popularCacheKey = 'browse:scripts:popular:v2';
      popular = smartCache.get(popularCacheKey) as any[] || [];
      
      if (!popular || popular.length === 0) {
        try {
          popular = await db.collection('scripts')
            .find({}, { 
              projection: { 
                id: 1, title: 1, thumbnailUrl: 1, gameName: 1, views: 1, likes: 1, 
                isUniversal: 1, price: 1, priceAmount: 1, createdAt: 1, ownerId: 1, 
                ownerUsername: 1, ownerVerified: 1, isVerified: 1, points: 1, 
                discordServer: 1, keySystemLink: 1, status: 1, comments: 1
              } 
            })
            .sort({ points: -1, views: -1, likes: -1 })
            .limit(32)
            .toArray();
        } catch (error) {
          console.error('Popular scripts query error:', error);
          popular = [];
        }

        popular.forEach((script: any) => {
          script.commentCount = Array.isArray(script.comments) ? script.comments.length : 0;
          delete script.comments;
        });

        smartCache.set(popularCacheKey, popular, { 
          totalCount: popular.length, 
          lastModified: Date.now(),
          ttl: 300000
        });
      }
    }

    const totalTime = Date.now() - startTime;
    
    
    return NextResponse.json({ 
      newest, 
      popular: includePopular ? popular : undefined,
      performance: { totalTime }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'scriptUpload');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const requiredEnvVars = ['MONGODB_URI', 'USERS_MONGODB_URI', 'NEXTAUTH_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }


    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const db = await getScriptsDatabase();
    
    try {
      await db.admin().ping();
    } catch (pingError) {
      console.error('Database ping failed:', pingError);
    }
    

    const tokenCookie = req.cookies.get('token');
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!tokenCookie.value || typeof tokenCookie.value !== 'string') {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }

    let payload: any = null;
    try {
      payload = jwt.verify(tokenCookie.value, JWT_SECRET, { 
        algorithms: ['HS256'] 
      });
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!payload || typeof payload !== 'object' || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }


    if (!ObjectId.isValid(payload.userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 401 });
    }

    const usersUri = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI!;
    const usersDb = await mongoPool.getConnection(usersUri, 'users');
    const usersCollection = usersDb.collection('ScriptVoid');
    
    let user: any = null;
    try {
      user = await usersCollection.findOne({ _id: new ObjectId(payload.userId) });
    } catch (error) {
      return NextResponse.json({ error: 'Error looking up user' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isTimeouted === true) {
      const timeoutEnd = user.timeoutEnd ? new Date(user.timeoutEnd) : null;
      const isExpired = timeoutEnd && timeoutEnd < new Date();
      
      if (!isExpired) {
        return NextResponse.json({ 
          error: 'You are currently timeouted and cannot post scripts. Please check your account settings for more details.',
          timeoutEnd: timeoutEnd,
          timeoutReason: user.timeoutReason || 'Admin timeout'
        }, { status: 403 });
      }
    }

    const body = await req.json();

    const turnstileResult = await validateTurnstileFromBody(body, req);
    if (!turnstileResult.success) {
      return NextResponse.json({ 
        error: turnstileResult.error || "Security verification failed" 
      }, { status: 400 });
    }

    const csrfToken = body.csrfToken;
    if (!csrfToken || !validateCSRFToken(csrfToken, payload.userId)) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }
    
    const allowedFields = [
      'title', 'features', 'scriptCode', 'gameId', 'isUniversal', 
      'price', 'priceAmount', 'discordServer', 'keySystemLink', 
      'customThumbnail', 'tags', 'turnstileToken', 'csrfToken'
    ];
    
    const systemFields = [
      'id', 'status', 'multiplier', 'thumbnailUrl', 'gameName', 'createdAt', 'updatedAt',
      'views', 'likes', 'ownerUserId', 'ownerId', 'ownerUsername', 'ownerAvatar', 
      'ownerVerified', 'isVerified', 'comments', 'points', 'promotionTier', 
      'promotionCode', 'promotionExpiresAt', 'promotionActive', 'isBumped', 
      'bumpExpire', 'lastActivity', 'isOrphaned'
    ];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted: ${systemFieldAttempts.join(', ')}`);
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
    if (body.csrfToken !== undefined && typeof body.csrfToken !== 'string') {
      return NextResponse.json({ error: "CSRF token must be a string" }, { status: 400 });
    }
    
    function trimAndCheck(str: any) {
      if (typeof str !== 'string') return '';
      return sanitizeInput(str.trim());
    }
    
    body.title = trimAndCheck(body.title);
    body.features = trimAndCheck(body.features);
    body.scriptCode = trimAndCheck(body.scriptCode);
    body.gameId = trimAndCheck(body.gameId);
    body.discordServer = trimAndCheck(body.discordServer);
    body.keySystemLink = trimAndCheck(body.keySystemLink);
    
    if (body.tags && Array.isArray(body.tags)) {
      body.tags = body.tags.map((t: any) => trimAndCheck(t)).filter(t => t.length > 0);
    }
    
    if (body.customThumbnail && typeof body.customThumbnail === 'string') {
      if (!validateFileType(body.customThumbnail)) {
        return NextResponse.json({ error: "Invalid thumbnail file type. Only JPEG, PNG, WebP, and GIF are allowed." }, { status: 400 });
      }
    }
    if (body.customThumbnail && typeof body.customThumbnail === 'string') {
      const base64Length = body.customThumbnail.length - (body.customThumbnail.indexOf(',') + 1);
      const sizeInMB = base64Length * 3 / 4 / 1024 / 1024;
      if (sizeInMB > 1.5) {
        return NextResponse.json({ error: "Thumbnail image must be less than 1.5MB." }, { status: 400 });
      }

      const contentFilter = await filterBase64Image(body.customThumbnail, 0.8);
      if (!contentFilter.isSafe) {
        console.log(`Content filter blocked script upload thumbnail: ${contentFilter.reason}`);
        return NextResponse.json({ 
          error: 'Content not allowed', 
          reason: 'Thumbnail contains inappropriate content' 
        }, { status: 400 });
      }
    }
    if (!body.title || body.title.replace(/\s/g, '').length < 3) {
      return NextResponse.json({ error: "Title must be at least 3 non-space characters" }, { status: 400 });
    }
    if (body.title.length > 45) {
      return NextResponse.json({ error: "Title must be less than or equal to 45 characters" }, { status: 400 });
    }
    if (!body.features || body.features.replace(/\s/g, '').length < 10) {
      return NextResponse.json({ error: "Description must be at least 10 non-space characters" }, { status: 400 });
    }
    if (body.features.length > 2000) {
      return NextResponse.json({ error: "Description must be less than or equal to 2000 characters" }, { status: 400 });
    }
    
    const titleFilter = filterContentByField(body.title, 'script-title');
    if (!titleFilter.isValid) {
      return NextResponse.json({ error: titleFilter.error }, { status: 400 });
    }
    body.title = titleFilter.cleanedText;
    
    const featuresFilter = filterContentByField(body.features, 'script-description');
    if (!featuresFilter.isValid) {
      return NextResponse.json({ error: featuresFilter.error }, { status: 400 });
    }
    body.features = featuresFilter.cleanedText;
    
    const scriptCodeFilter = filterContentByField(body.scriptCode, 'script-code');
    if (!scriptCodeFilter.isValid) {
      return NextResponse.json({ error: scriptCodeFilter.error }, { status: 400 });
    }
    body.scriptCode = scriptCodeFilter.cleanedText;
    
    if (!body.scriptCode || body.scriptCode.replace(/\s/g, '').length < 10) {
      return NextResponse.json({ error: "Script code must be at least 10 non-space characters" }, { status: 400 });
    }
    if (body.scriptCode.length > 25000) {
      return NextResponse.json({ error: "Script code must be less than or equal to 25000 characters" }, { status: 400 });
    }
    if (body.tags) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json({ error: "Tags must be an array" }, { status: 400 });
      }
      if (body.tags.length > 10) {
        return NextResponse.json({ error: "You can add up to 10 tags" }, { status: 400 });
      }
      for (let i = 0; i < body.tags.length; i++) {
        const tag = body.tags[i];
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          return NextResponse.json({ error: "Tags cannot be empty" }, { status: 400 });
        }
        if (tag.length > 20) {
          return NextResponse.json({ error: "Each tag must be 20 characters or less" }, { status: 400 });
        }
        
        const tagFilter = filterContentByField(tag, 'general');
        if (!tagFilter.isValid) {
          return NextResponse.json({ error: `Tag "${tag}" contains inappropriate content` }, { status: 400 });
        }
        body.tags[i] = tagFilter.cleanedText;
      }
    }
    if (body.discordServer && !/^https?:\/\/(www\.)?discord\.(gg|com)\/(invite\/)?[\w-]+$/.test(body.discordServer)) {
      return NextResponse.json({ error: "Must be a valid Discord invite link (e.g., https://discord.gg/abc123 or https://discord.com/invite/abc123)" }, { status: 400 });
    }
    if (body.keySystemLink && !/^https?:\/\/.+/.test(body.keySystemLink)) {
      return NextResponse.json({ error: "Key system link must be a valid URL starting with http:// or https://" }, { status: 400 });
    }
    if (body.price !== undefined) {
      if (body.price !== 'Free' && body.price !== 'Paid') {
        return NextResponse.json({ error: "Price must be exactly 'Free' or 'Paid'" }, { status: 400 });
      }
    }
    if (body.price && body.price.toLowerCase() === 'paid') {
      if (body.priceAmount !== undefined && body.priceAmount !== null && body.priceAmount !== "") {
        const num = Number(body.priceAmount);
        if (isNaN(num) || num < 1 || num > 1000) {
          return NextResponse.json({ error: "Price must be between $1 and $1000" }, { status: 400 });
        }
      }
    } else {
      delete body.priceAmount;
    }
    if (body.isUniversal === true) {
      if (!body.customThumbnail || !body.customThumbnail.startsWith('data:image')) {
        return NextResponse.json({ error: "Universal scripts require a custom thumbnail" }, { status: 400 });
      }
      if (body.gameId && body.gameId.trim() !== '') {
        return NextResponse.json({ error: "Universal scripts cannot have a Game ID" }, { status: 400 });
      }
    } else if (body.isUniversal === false) {
      if (!body.gameId || !/^\d+$/.test(body.gameId)) {
        return NextResponse.json({ error: "Game ID is required and must be a number" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "isUniversal must be true or false" }, { status: 400 });
    }
    let newId = 1;
    try {
      const last = await db.collection('scripts').aggregate([
        {
          $addFields: {
            idNum: {
              $cond: [
                { $isNumber: "$id" },
                "$id",
                {
                  $cond: [
                    { $regexMatch: { input: "$id", regex: /^\d+$/ } },
                    { $toInt: "$id" },
                    0
                  ]
                }
              ]
            }
          }
        },
        { $sort: { idNum: -1 } },
        { $limit: 1 },
        { $project: { idNum: 1 } }
      ]).toArray();
      
      if (last.length && typeof last[0].idNum === 'number' && !isNaN(last[0].idNum) && last[0].idNum > 0) {
        newId = last[0].idNum + 1;
      }
    } catch (error) {
      console.error('Error generating script ID:', error);
    }
    const now = new Date().toISOString();
    const isCustomThumb = typeof body.customThumbnail === 'string' && body.customThumbnail.startsWith('data:image');
    let thumbnailUrl = "";
    let gameName = "";
    
    if (isCustomThumb) {
      thumbnailUrl = "/no-thumbnail.png";
      
      setImmediate(async () => {
        try {
          const optimizedUrl = await optimizeCustomThumbnail(body.customThumbnail, newId.toString());
          if (optimizedUrl) {
            await db.collection("scripts").updateOne(
              { id: String(newId) },
              { $set: { thumbnailUrl: optimizedUrl, updatedAt: new Date().toISOString() } }
            );
            console.log(`Updated script ${newId} with optimized thumbnail`);
          }
        } catch (error) {
          console.error('Background thumbnail optimization failed:', error);
        }
      });
    }
    if (!body.isUniversal && body.gameId && /^\d+$/.test(body.gameId)) {
      gameName = "Loading Game Info...";
      if (!isCustomThumb) {
        thumbnailUrl = "/no-thumbnail.png";
      }
      
      setImmediate(async () => {
        try {
          const gameInfoResponse = await fetch(`https://games.roblox.com/v1/games?universeIds=${body.gameId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          
          if (gameInfoResponse.ok) {
            const gameData = await gameInfoResponse.json();
            if (gameData.data && gameData.data.length > 0) {
              const game = gameData.data[0];
              const fetchedGameName = game.name || "Unknown Game";
              
              await db.collection("scripts").updateOne(
                { id: String(newId) },
                { 
                  $set: { 
                    gameName: fetchedGameName,
                    updatedAt: new Date().toISOString()
                  } 
                }
              );
              
              if (!isCustomThumb) {
                try {
                  const robloxThumbnailUrl = await optimizeRobloxThumbnail({ 
                    gameId: body.gameId, 
                    scriptId: newId.toString() 
                  });
                  if (robloxThumbnailUrl) {
                    await db.collection("scripts").updateOne(
                      { id: String(newId) },
                      { $set: { thumbnailUrl: robloxThumbnailUrl } }
                    );
                  }
                } catch (thumbError) {
                  console.error('Background Roblox thumbnail optimization failed:', thumbError);
                }
              }
              
              console.log(`Updated script ${newId} with game info: ${fetchedGameName}`);
            }
          }
        } catch (error) {
          console.error('Background game info fetch failed:', error);
        }
      });
    }
    if (body.isUniversal) {
      gameName = "Universal Script";
      if (!thumbnailUrl) {
        thumbnailUrl = "/universal.png";
      }
    }
    if (!gameName) {
      gameName = body.gameName || "Unknown Game";
    }
    const ownerIsVerified = !!user.verified;
    const ownerUserObjectId = user._id;
    


    const newScript: any = {
      id: String(newId),
      title: body.title,
      gameId: body.gameId || "",
      isUniversal: !!body.isUniversal,
      features: body.features,
      price: body.price === "Paid" ? "Paid" : "Free",
      status: "Functional",
      multiplier: ownerIsVerified ? 2.8 : 2.0,
      keySystemLink: body.keySystemLink || "",
      discordServer: body.discordServer || "",
      thumbnailUrl: thumbnailUrl || "",
      customThumbnail: isCustomThumb ? body.customThumbnail : "",
      gameName: gameName || "Unknown Game",
      scriptCode: body.scriptCode,
      createdAt: now,
      updatedAt: now,
      views: 0,
      likes: 0,
      ownerUserId: ownerUserObjectId,
      ownerId: user.username,
      ownerUsername: user.username,
      ownerAvatar: user.accountthumbnail || "",
      ownerVerified: !!user.verified,
      isVerified: ownerIsVerified,
      comments: [],
      tags: body.tags || [],
      points: 100,
      promotionTier: null,
      promotionCode: null,
      promotionExpiresAt: null,
      promotionActive: false,
      isBumped: false,
      bumpExpire: "",
      lastActivity: now,
    };
    

    if (body.price === "Paid" && body.priceAmount !== undefined && body.priceAmount !== null && body.priceAmount !== "") {
      newScript.priceAmount = Number(body.priceAmount);
    }
    const systemFieldsToRemove = [
      'id', 'status', 'multiplier', 'thumbnailUrl', 'gameName', 'createdAt', 'updatedAt',
      'views', 'likes', 'ownerUserId', 'ownerId', 'ownerUsername', 'ownerAvatar', 
      'ownerVerified', 'isVerified', 'comments', 'points', 'promotionTier', 
      'promotionCode', 'promotionExpiresAt', 'promotionActive', 'isBumped', 
      'bumpExpire', 'lastActivity', 'isOrphaned'
    ];
    
    systemFieldsToRemove.forEach(field => {
      if (field in body) {
        delete body[field];
        console.warn(`Security: Removed client-supplied system field: ${field}`);
      }
    });
    newScript.points = 100;
    
    try {
      let inserted = false;
      let attempts = 0;
      let lastErr: any = null;
      while (!inserted && attempts < 5) {
        try {
          const result = await db.collection("scripts").insertOne(newScript);
          inserted = true;
        } catch (e: any) {
          lastErr = e;
          console.error(`Insert attempt ${attempts + 1} failed:`, e);
          if (e && (e.code === 11000 || (e.message && e.message.includes('E11000')))) {
            const asNum = Number(newScript.id);
            newScript.id = String(isNaN(asNum) ? `${newScript.id}_${Date.now()%1000}` : asNum + 1);
            attempts++;
            continue;
          }
          throw e;
        }
      }
      if (!inserted && lastErr) {
        console.error('All insert attempts failed, last error:', lastErr);
        throw lastErr;
      }
      
      if (inserted) {
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: newScript.ownerUsername, 
            action: 'script_uploaded' 
          })
        }).catch(() => {});
        
        addScriptChange(newScript.id, 'created', {
          title: newScript.title,
          ownerUsername: newScript.ownerUsername,
          createdAt: newScript.createdAt,
          gameName: newScript.gameName,
          isUniversal: newScript.isUniversal,
          price: newScript.price,
          status: newScript.status,
          thumbnailUrl: newScript.thumbnailUrl,
          views: newScript.views,
          likes: newScript.likes,
          points: newScript.points,
          ownerVerified: newScript.ownerVerified,
          isVerified: newScript.isVerified
        });
        
        clearScriptsCache();
      }
              

        
        setImmediate(async () => {
          try {
            const webhookUrl = process.env.Uploadwebhook;
            if (webhookUrl) {
              const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
              const scriptLink = `${baseUrl}/script/${newScript.id}`;
              const webhookData = {
                content: `Username: ${user.username}\nUserid: ${ownerUserObjectId}\nUser Profile: ${baseUrl}/profile/${user.username}\nScript link: ${scriptLink}\nVerification Status: ${ownerIsVerified ? 'Verified' : 'Not Verified'}`
              };
              
              await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookData)
              });
            }
          } catch (webhookError) {
            console.error('Discord webhook error:', webhookError);
          }
        });
        
        
        if (!body.isUniversal && body.gameId && /^\d+$/.test(body.gameId)) {
          setImmediate(async () => {
            try {
              const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
              const response = await fetch(`${baseUrl}/api/scripts/update-game-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: newScript.id, gameId: body.gameId })
              });
              
              if (!response.ok) {
                console.error(`Failed to update game info: ${response.status} ${response.statusText}`);
              } else {
                console.log(`Successfully updated game info for script ${newScript.id}`);
              }
            } catch (error) {
              console.error('Failed to update game info:', error);
            }
          });
        }
        
        if (!body.isUniversal && body.gameId && /^\d+$/.test(body.gameId) && !isCustomThumb) {
          setImmediate(async () => {
            try {
              const optimizedThumbnailUrl = await optimizeRobloxThumbnail({ 
                gameId: body.gameId, 
                scriptId: newScript.id 
              });
              
              if (optimizedThumbnailUrl) {
                const updateResult = await db.collection('scripts').updateOne(
                  { id: newScript.id },
                  { $set: { thumbnailUrl: optimizedThumbnailUrl } }
                );
                
                if (updateResult.modifiedCount > 0) {
                  console.log(`Updated script ${newScript.id} with optimized Roblox thumbnail: ${optimizedThumbnailUrl}`);
                } else {
                  console.error(`Failed to update thumbnail for script ${newScript.id}`);
                }
              } else {
                console.error(`Failed to optimize thumbnail for script ${newScript.id}`);
              }
            } catch (error) {
              console.error('Failed to optimize Roblox thumbnail:', error);
            }
          });
        }
        
        console.log(`Script uploaded successfully: ${newScript.id} by user ${user.username} (${user._id})`);
        
        return NextResponse.json({ 
          message: "Script uploaded successfully", 
          scriptId: newScript.id 
        }, { 
          status: 201,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
          }
        });
    } catch (insertError) {
      console.error('Insert script error:', insertError);
      clearScriptsCache();
      return NextResponse.json({ error: "Failed to save script to database" }, { status: 500 });
    }
  } catch (err) {
    console.error('Script upload error:', err);
    
    if (err instanceof Error) {
      if (err.message.includes('Invalid') || err.message.includes('Unauthorized')) {
        console.warn(`Security event - Invalid request: ${err.message}`);
      }
    }
    
    clearScriptsCache();
    return NextResponse.json({ 
      error: 'Server error',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    }, { status: 500 });
  }
}

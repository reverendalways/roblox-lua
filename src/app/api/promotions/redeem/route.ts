import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import { getBaseUrl } from '@/lib/url';
import { getScriptsDatabase, getUsersDatabase } from '@/lib/mongodb-optimized';
import jwt from 'jsonwebtoken';
import { rateLimitByIP } from '@/middleware/rate-limit';

const MONGODB_URI = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

function getUserIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get("token");
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token.value, JWT_SECRET);
    return payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'scriptPromote');
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

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    
    const allowedFields = ['code', 'scriptId'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in promo redeem: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'updatedAt', 'userId', 'username', 'userAvatar',
      'verified', 'isVerified', 'points', 'multiplier', 'likes', 'replies',
      'isEdited', 'editHistory', 'isDeleted', 'deletedAt', 'admin', 'isAdmin',
      'status', 'resolved', 'resolvedBy', 'resolvedAt', 'redeemed',
      'redeemedBy', 'redeemedAt', 'expiresAt', 'tier', 'discount'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in promo redeem: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.code !== undefined && typeof body.code !== 'string') {
      return NextResponse.json({ error: "Code must be a string" }, { status: 400 });
    }
    if (body.scriptId !== undefined && typeof body.scriptId !== 'string') {
      return NextResponse.json({ error: "Script ID must be a string" }, { status: 400 });
    }

    const { code, scriptId } = body;
    if (!code || typeof code !== 'string' || code.length > 30) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }
    if (!scriptId || typeof scriptId !== 'string') {
      return NextResponse.json({ error: 'Invalid scriptId' }, { status: 400 });
    }
    let scriptQuery: any;
    if (ObjectId.isValid(scriptId)) {
      scriptQuery = { _id: new ObjectId(scriptId) };
    } else {
      scriptQuery = { id: scriptId };
    }
    try {
      const db = await getScriptsDatabase();
      const codesCol = db.collection('codes');
      const scriptsCol = db.collection('scripts');

      const promo = await codesCol.findOne({ code });
      if (!promo) {
        await scriptsCol.updateOne(
          scriptQuery,
          { $set: {
              promotionTier: null,
              promotionCode: null,
              promotionExpiresAt: null,
              promotionActive: false
            }
          }
        );
        return NextResponse.json({
          success: false,
          error: 'Invalid promotion code',
          reason: 'invalid',
          promotion: {
            tier: null,
            code: null,
            expiresAt: null,
            active: false
          }
        }, { status: 400 });
      }
      if (promo.expired || (promo.expiresAt && new Date(promo.expiresAt) < new Date())) {
        await codesCol.updateOne({ _id: promo._id }, { $set: { active: false, expired: true } });
        await scriptsCol.updateOne(
          scriptQuery,
          { $set: {
              promotionTier: null,
              promotionCode: null,
              promotionExpiresAt: null,
              promotionActive: false
            }
          }
        );
        return NextResponse.json({
          success: false,
          error: 'Promotion code expired',
          reason: 'expired',
          promotion: {
            tier: null,
            code: null,
            expiresAt: null,
            active: false
          }
        }, { status: 400 });
      }
      if (promo.active) {
        return NextResponse.json({
          success: false,
          error: 'Promotion code already used',
          reason: 'used',
          promotion: {
            tier: null,
            code: null,
            expiresAt: null,
            active: false
          }
        }, { status: 400 });
      }
      
      const currentScript = await scriptsCol.findOne(scriptQuery);
      if (!currentScript) {
        return NextResponse.json({ error: 'Script not found' }, { status: 404 });
      }

      let isOwner = false;
      if (currentScript.ownerUserId) {
        try {
          const scriptOwnerId = new ObjectId(currentScript.ownerUserId);
          const requestUserId = new ObjectId(userId);
          isOwner = scriptOwnerId.equals(requestUserId);
        } catch (error) {
          isOwner = currentScript.ownerUserId.toString() === userId.toString();
        }
      }
      
      if (!isOwner) {
        return NextResponse.json({ error: "You can only redeem codes for your own scripts" }, { status: 403 });
      }
      
      if (currentScript.promotionActive && currentScript.promotionCode && promo.codeType !== 'ageReset') {
        return NextResponse.json({
          success: false,
          error: 'Script already has an active promotion code',
          reason: 'already_has_promo',
          promotion: {
            tier: currentScript.promotionTier,
            code: currentScript.promotionCode,
            expiresAt: currentScript.promotionExpiresAt,
            active: currentScript.promotionActive
          }
        }, { status: 400 });
      }
      
      if (promo.active && promo.scriptId && promo.scriptId !== scriptId) {
        return NextResponse.json({
          success: false,
          error: 'Promotion code already used on another script',
          reason: 'used_on_other_script',
          promotion: {
            tier: null,
            code: null,
            expiresAt: null,
            active: false
          }
        }, { status: 400 });
      }
      
      const now = new Date();
      const expiresAt = promo.ageReversalDays ? new Date(now.getTime() + promo.ageReversalDays * 24 * 60 * 60 * 1000) : null;
      
      await codesCol.updateOne(
        { _id: promo._id },
        { $set: { 
          active: true, 
          expiresAt,
          usedAt: now,
          scriptId: scriptId,
          usedBy: currentScript.ownerUsername || currentScript.ownerId
        }}
      );
      
      try {
        const scriptOwnerUsername = currentScript.ownerUsername || currentScript.ownerId;
        if (scriptOwnerUsername) {
          const usersDb = await getUsersDatabase();
          const userCol = usersDb.collection('ScriptVoid');
          const userDoc = await userCol.findOne({ username: scriptOwnerUsername });
          
          if (userDoc && userDoc._id) {
            const baseN = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
            await fetch(`${baseN}/api/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userDoc._id.toString(),
                type: 'Code Redeemed',
                message: 'Thanks for purchase. It means a lot for me.'
              })
            });
          }
        }
      } catch (notificationError) {

      }
      
      if (promo.codeType === 'ageReset') {
        const newEffectiveAge = now;
        

        
        const updateResult = await scriptsCol.updateOne(
          scriptQuery,
          { $set: {
            createdAt: now,
            promotionTier: null,
            promotionCode: null,
            promotionExpiresAt: null,
            promotionActive: false,
            effectiveAge: null,
            ageResetAt: null,
            ageResetCode: null,
            scriptAgeReset: null
          }}
        );
        
        try {
          const webhookUrl = process.env.redeemwebhook;
          if (webhookUrl) {
            const username = (currentScript.ownerUsername || currentScript.ownerId || 'unknown').toString();
            let userIdStr = '';
            try {
              const usersDb = await getUsersDatabase();
              const uDoc = await usersDb.collection('ScriptVoid').findOne({ username });
              if (uDoc && uDoc._id) userIdStr = uDoc._id.toString();
            } catch {}
            if (!userIdStr && currentScript.ownerUserId) {
              userIdStr = currentScript.ownerUserId?.toString?.() || String(currentScript.ownerUserId);
            }
            const origin = getBaseUrl(req.nextUrl.origin);
            const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
            const scriptLink = `${origin}/script/${currentScript.id || scriptId}`;
            const content = `Username: ${username}\nUserid: ${userIdStr}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nCode: ${code}\nCodetype: Age reset`;
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content })
            }).catch(() => {});
          }
        } catch {}
        
        return NextResponse.json({
          success: true,
          promotion: {
            tier: null,
            code: null,
            expiresAt: null,
            active: false,
            multiplier: null,
            ageReversalDays: 0,
            effectiveAge: now,
            ageResetAt: now,
            ageResetCode: promo.code,
            codeType: 'ageReset',
            description: `Script Age Reset - Script age has been reset to current time!`
          }
        }, { status: 200 });
      } else {
        let ageReversalDays = 0;
        let effectiveAge = currentScript.createdAt ? new Date(currentScript.createdAt) : now;
        
        switch (promo.tier) {
          case 'I':
            ageReversalDays = 7;
            break;
          case 'II':
            ageReversalDays = 14;
            break;
          case 'III':
            ageReversalDays = 30;
            break;
          case 'IV':
            ageReversalDays = 90;
            break;
          default:
            ageReversalDays = 0;
        }
        
        const ageReversalMs = ageReversalDays * 24 * 60 * 60 * 1000;
        const currentAgeMs = now.getTime() - effectiveAge.getTime();
        const newAgeMs = Math.max(0, currentAgeMs - ageReversalMs);
        const newEffectiveAge = new Date(now.getTime() - newAgeMs);
        
        
        const updateResult = await scriptsCol.updateOne(
          scriptQuery,
          { $set: {
            promotionTier: promo.tier ?? null,
            promotionCode: promo.code ?? null,
            promotionExpiresAt: expiresAt,
            promotionActive: true,
            promotionAgeReversal: ageReversalDays,
            effectiveAge: newEffectiveAge,
            scriptAgeReset: newEffectiveAge
          }}
        );
        
        try {
          const webhookUrl = process.env.redeemwebhook;
          if (webhookUrl) {
            const username = (currentScript.ownerUsername || currentScript.ownerId || 'unknown').toString();
            let userIdStr = '';
            try {
              const usersDb = await getUsersDatabase();
              const uDoc = await usersDb.collection('ScriptVoid').findOne({ username });
              if (uDoc && uDoc._id) userIdStr = uDoc._id.toString();
            } catch {}
            if (!userIdStr && currentScript.ownerUserId) {
              userIdStr = currentScript.ownerUserId?.toString?.() || String(currentScript.ownerUserId);
            }
            const origin = getBaseUrl(req.nextUrl.origin);
            const profileUrl = `${origin}/profile/${encodeURIComponent(username)}`;
            const scriptLink = `${origin}/script/${currentScript.id || scriptId}`;
            const codeType = promo.tier ? `Promote ${promo.tier}` : 'Promote';
            const content = `Username: ${username}\nUserid: ${userIdStr}\nUser Profile: ${profileUrl}\nScript link: ${scriptLink}\nCode: ${code}\nCodetype: ${codeType}`;
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content })
            }).catch(() => {});
          }
        } catch {}
        
        return NextResponse.json({
          success: true,
          promotion: {
            tier: promo.tier ?? null,
            code: promo.code ?? null,
            expiresAt: expiresAt,
            active: true,
            multiplier: promo.multiplier ?? null,
            ageReversalDays: ageReversalDays,
            effectiveAge: newEffectiveAge,
            ageResetAt: null,
            ageResetCode: null,
            codeType: 'promo'
          }
        }, { status: 200 });
      }
    } finally {
    }
  } catch (err) {
    return NextResponse.json({ error: 'Failed to redeem promotion', details: String(err) }, { status: 500 });
  }
}

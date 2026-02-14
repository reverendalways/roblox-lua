import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { checkAdminAccess } from '@/lib/admin-utils';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { rateLimitByIP } from '@/middleware/rate-limit';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const ADMIN_TOKEN_1 = process.env.ADMIN_TOKEN_1;
const ADMIN_TOKEN_2 = process.env.ADMIN_TOKEN_2;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

async function getClient() { return await getUsersDatabase(); }
async function getUserId(req: NextRequest) {
  const token = req.cookies.get('token');
  if (!token) return null;
  try { const payload: any = jwt.verify(token.value, JWT_SECRET, { algorithms: ['HS256'] }); return payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'adminSecureAction');
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

    const token1 = req.headers.get('x-admin-token1');
    const token2 = req.headers.get('x-admin-token2');
    
    if (!token1 || !token2) {
      return NextResponse.json({ error: 'Admin tokens required in headers' }, { status: 400 });
    }
    
    const body = await req.json().catch(()=>({}));
    const allowedFields = ['action', 'targetId', 'reason'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in admin action: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'updatedAt', 'userId', 'username', 'userAvatar',
      'verified', 'isVerified', 'points', 'multiplier', 'likes', 'replies',
      'isEdited', 'editHistory', 'isDeleted', 'deletedAt', 'admin', 'isAdmin',
      'staffRank', 'permissions', 'lastOnline', 'lastSeen', 'accountthumbnail',
      'lastUsernameChange', 'totalScripts', 'totalViews', 'totalPoints',
      'leaderboardPosition', 'lastStatsUpdate', 'lastLeaderboardUpdate',
      'isTimeouted', 'timeoutEnd', 'timeoutReason'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in admin action: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.action !== undefined && typeof body.action !== 'string') {
      return NextResponse.json({ error: "Action must be a string" }, { status: 400 });
    }
    if (body.targetId !== undefined && typeof body.targetId !== 'string') {
      return NextResponse.json({ error: "Target ID must be a string" }, { status: 400 });
    }
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      return NextResponse.json({ error: "Reason must be a string" }, { status: 400 });
    }
    
    const token = req.cookies.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
      const payload: any = jwt.verify(token.value, JWT_SECRET, { algorithms: ['HS256'] });
      const userId = payload.userId && ObjectId.isValid(payload.userId) ? payload.userId : null;
      if (!userId) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 401 });
      }

      const db = await getClient();
      const col = db.collection(USERS_COL);
      const userDoc = await col.findOne({ _id: new ObjectId(userId) });

      if (!userDoc) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const adminCheck = await checkAdminAccess(req);
      if (!adminCheck.success) {
        return NextResponse.json({ error: adminCheck.error }, { status: 403 });
      }

      if (token1 !== ADMIN_TOKEN_1 || token2 !== ADMIN_TOKEN_2) {
        return NextResponse.json({ error: 'Invalid admin tokens' }, { status: 403 });
      }
      
      setImmediate(async () => {
        try {
          const webhookUrl = process.env.logindash;
          if (webhookUrl && webhookUrl.trim() !== '') {
            const username = userDoc.username || '';
            const idStr = userDoc._id?.toString?.() || '';
            const rank = userDoc.staffRank || 'junior_moderator';
            const content = `🔐 **Admin Dashboard Login**\n**Username:** ${username}\n**User ID:** ${idStr}\n**Rank:** ${rank}\n**Time:** ${new Date().toLocaleString()}`;
            
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content })
            }).catch(() => {});
          }
        } catch (error) {
          console.error('Failed to send login webhook:', error);
        }
      });
      
      return NextResponse.json({ 
        success: true,
        user: {
          id: userDoc._id.toString(),
          username: userDoc.username,
          staffRank: userDoc.staffRank || 'junior_moderator'
        }
      });
    } catch (error) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 403 });
    }
  } catch (error) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

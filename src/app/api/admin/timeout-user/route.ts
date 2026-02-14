import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { checkAdminAccess, checkAdminWithTokens } from '@/lib/admin-utils';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const ADMIN_TOKEN_1 = process.env.ADMIN_TOKEN_1;
const ADMIN_TOKEN_2 = process.env.ADMIN_TOKEN_2;

export async function POST(request: NextRequest) {
  try {
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const token1 = request.headers.get('x-admin-token1');
    const token2 = request.headers.get('x-admin-token2');
    
    if (!token1 || !token2) {
      return NextResponse.json({ error: 'Admin tokens required in headers' }, { status: 400 });
    }

    const body = await request.json();
    
    const allowedFields = ['username', 'action', 'duration', 'durationUnit', 'reason'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in timeout user: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'updatedAt', 'userId', 'userAvatar',
      'verified', 'isVerified', 'points', 'multiplier', 'likes', 'replies',
      'isEdited', 'editHistory', 'isDeleted', 'deletedAt', 'admin', 'isAdmin',
      'staffRank', 'permissions', 'lastOnline', 'lastSeen', 'accountthumbnail',
      'lastUsernameChange', 'totalScripts', 'totalViews', 'totalPoints',
      'leaderboardPosition', 'lastStatsUpdate', 'lastLeaderboardUpdate',
      'isTimeouted', 'timeoutEnd', 'timeoutReason', 'token1', 'token2'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in timeout user: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.username !== undefined && typeof body.username !== 'string') {
      return NextResponse.json({ error: "Username must be a string" }, { status: 400 });
    }
    if (body.action !== undefined && typeof body.action !== 'string') {
      return NextResponse.json({ error: "Action must be a string" }, { status: 400 });
    }
    if (body.duration !== undefined && typeof body.duration !== 'number') {
      return NextResponse.json({ error: "Duration must be a number" }, { status: 400 });
    }
    if (body.durationUnit !== undefined && typeof body.durationUnit !== 'string') {
      return NextResponse.json({ error: "Duration unit must be a string" }, { status: 400 });
    }
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      return NextResponse.json({ error: "Reason must be a string" }, { status: 400 });
    }

    const { username, action, duration, durationUnit, reason } = body;

    if (!username || !action) {
      return NextResponse.json({ error: 'Missing username or action' }, { status: 400 });
    }

    const adminCheck = await checkAdminAccess(request, token1, token2);
    if (!adminCheck.success || !adminCheck.user) {
      return NextResponse.json({ error: adminCheck.error || 'User not found' }, { status: 403 });
    }

    const currentUser = {
      userId: adminCheck.user._id.toString(),
      username: adminCheck.user.username,
      staffRank: adminCheck.user.staffRank || 'none'
    };

    const client = await mongoPool.getClient();
    const usersCollection = client.db(USERS_DB).collection(USERS_COL);

    const targetUser = await usersCollection.findOne({ username: username });
    if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isTargetStaff = targetUser.staffRank && targetUser.staffRank !== 'none';
    const isTargetVerified = targetUser.verified === true;

    if (action === 'timeout') {
      if (!duration || duration <= 0) {
        return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
      }

      if (!durationUnit || !['minutes', 'hours', 'days', 'months'].includes(durationUnit)) {
        return NextResponse.json({ error: 'Invalid duration unit. Use: minutes, hours, days, or months' }, { status: 400 });
      }

      let canTimeout = false;
      let reason = '';

      if (currentUser.staffRank === 'owner') {
        canTimeout = true;
        reason = 'Owner can timeout any user';
      } else if (currentUser.staffRank === 'senior_moderator') {
        if (isTargetStaff) {
          canTimeout = false;
          reason = 'Senior moderator cannot timeout staff accounts (requires owner)';
        } else {
          canTimeout = true;
          reason = 'Senior moderator can timeout any non-staff user';
        }
      } else if (currentUser.staffRank === 'moderator') {
        if (isTargetStaff) {
          canTimeout = false;
          reason = 'Moderator cannot timeout staff accounts (requires owner)';
        } else if (isTargetVerified) {
          canTimeout = true;
          reason = 'Moderator can timeout verified accounts';
        } else {
          canTimeout = true;
          reason = 'Moderator can timeout non-verified, non-staff accounts';
        }
      } else if (currentUser.staffRank === 'junior_moderator') {
        if (isTargetStaff) {
          canTimeout = false;
          reason = 'Junior moderator cannot timeout staff accounts (requires owner)';
        } else if (isTargetVerified) {
          canTimeout = false;
          reason = 'Junior moderator cannot timeout verified accounts (requires moderator+)';
        } else {
          canTimeout = true;
          reason = 'Junior moderator can timeout non-verified, non-staff accounts';
        }
      }

      if (!canTimeout) {
                return NextResponse.json({ 
          error: 'Insufficient permissions to timeout this user', 
          details: reason,
          userInfo: {
            verified: isTargetVerified,
            staff: isTargetStaff,
            requiredRank: isTargetStaff ? 'owner' : 
                         isTargetVerified ? 'moderator' : 'junior_moderator'
          }
        }, { status: 403 });
      }

      let timeoutEnd: Date;
      const now = new Date();

      switch (durationUnit) {
        case 'minutes':
          timeoutEnd = new Date(now.getTime() + duration * 60 * 1000);
          break;
        case 'hours':
          timeoutEnd = new Date(now.getTime() + duration * 60 * 60 * 1000);
          break;
        case 'days':
          timeoutEnd = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
          break;
        case 'months':
          timeoutEnd = new Date(now.getTime() + duration * 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return NextResponse.json({ error: 'Invalid duration unit' }, { status: 400 });
      }

      const maxTimeout = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (timeoutEnd > maxTimeout) {
        return NextResponse.json({ error: 'Maximum timeout duration is 1 year' }, { status: 400 });
      }

      const result = await usersCollection.updateOne(
        { username: username },
        { 
          $set: { 
            isTimeouted: true,
            timeoutEnd: timeoutEnd,
            timeoutReason: reason || 'Admin timeout',
            timeoutAt: now,
            timeoutDuration: duration,
            timeoutDurationUnit: durationUnit
          }
        }
      );

      if (result.matchedCount === 0) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      try {
        if (targetUser._id) {
          const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
          await fetch(`${base}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: targetUser._id.toString(),
              type: 'Timeout',
              message: `You have been timeouted for ${duration} ${durationUnit}. Reason: ScriptVoid Moderation timeout. You cannot post scripts or comments until ${timeoutEnd.toLocaleString()}. If you believe this was done in error, please contact support.`
            })
          });
        }
      } catch (notificationError) {

      }

      try {
        const webhookUrl = process.env.timeout;
        if (webhookUrl) {
          const content = `action:${'timeout add'}\nduration: ${duration} ${durationUnit}\nusername: ${targetUser.username}\nuserid: ${targetUser._id?.toString?.() || ''}\nadminusername: ${currentUser.username}\nadminuserid: ${currentUser.userId}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          }).catch(() => {});
        }
      } catch {}

            return NextResponse.json({ 
        message: `User ${username} has been timeouted until ${timeoutEnd.toLocaleString()}`,
        timeoutEnd: timeoutEnd,
        duration: duration,
        durationUnit: durationUnit,
        reason: reason
      });

    } else if (action === 'untimeout') {
      const result = await usersCollection.updateOne(
        { username: username },
        { 
          $unset: { 
            isTimeouted: "",
            timeoutEnd: "",
            timeoutReason: "",
            timeoutAt: "",
            timeoutDuration: "",
            timeoutDurationUnit: ""
          }
        }
      );

      if (result.matchedCount === 0) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      try {
        if (targetUser._id) {
          const base2 = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
          await fetch(`${base2}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: targetUser._id.toString(),
              type: 'Untimeout',
              message: 'Your timeout has been removed. You can now post scripts and comments again.'
            })
          });
        }
      } catch (notificationError) {

      }

      try {
        const webhookUrl = process.env.timeout;
        if (webhookUrl) {
          const content = `action:${'timeout remove'}\nduration: 0\nusername: ${targetUser.username}\nuserid: ${targetUser._id?.toString?.() || ''}\nadminusername: ${currentUser.username}\nadminuserid: ${currentUser.userId}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          }).catch(() => {});
        }
      } catch {}

            return NextResponse.json({ 
        message: `User ${username} has been untimeouted successfully`
      });

    } else {
            return NextResponse.json({ error: 'Invalid action. Use "timeout" or "untimeout"' }, { status: 400 });
    }

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

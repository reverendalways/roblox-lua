import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import jwt from 'jsonwebtoken';
import { 
  requirePermission, 
  authenticateStaff,
  tokenManager 
} from '@/lib/auth-enhanced';
import { 
  validateStaffAssignment,
  DEFAULT_RANK_PERMISSIONS,
  StaffRank,
  StaffPermissions
} from '@/lib/staff-management';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;

async function isLegacyAdmin(req: NextRequest, token1: string, token2: string) {
  const token = req.cookies.get('token');
  if (!token) return false;
  
  try {
    const payload: any = jwt.verify(token.value, process.env.NEXTAUTH_SECRET);
    const userId = payload.userId && typeof payload.userId === 'string' && payload.userId.length === 24 ? payload.userId : null;
    if (!userId) return false;
    if (token1 !== process.env.ADMIN_TOKEN_1 || token2 !== process.env.ADMIN_TOKEN_2) return false;
    
    const db = await getUsersDatabase();
    const col = db.collection(USERS_COL);
    const filter: Record<string, unknown> = { _id: new ObjectId(userId) };
    if (ADMIN_FIELD) filter[ADMIN_FIELD] = ADMIN_FIELD_VALUE;
    const userDoc = await col.findOne(filter);
    return !!userDoc;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    
    const allowedFields = ['username', 'rank', 'customPermissions', 'notes'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in staff add: ${extraFields.join(', ')}`);
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
      console.warn(`Security: System field manipulation attempted in staff add: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.username !== undefined && typeof body.username !== 'string') {
      return NextResponse.json({ error: "Username must be a string" }, { status: 400 });
    }
    if (body.rank !== undefined && typeof body.rank !== 'string') {
      return NextResponse.json({ error: "Rank must be a string" }, { status: 400 });
    }
    if (body.customPermissions !== undefined && typeof body.customPermissions !== 'object') {
      return NextResponse.json({ error: "Custom permissions must be an object" }, { status: 400 });
    }
    if (body.notes !== undefined && typeof body.notes !== 'string') {
      return NextResponse.json({ error: "Notes must be a string" }, { status: 400 });
    }

    const { username, rank, customPermissions, notes } = body;
    
    if (!username || !rank) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validRanks: StaffRank[] = ['junior_moderator', 'moderator', 'senior_moderator'];
    if (!validRanks.includes(rank)) {
      return NextResponse.json({ error: 'Invalid rank specified' }, { status: 400 });
    }

    const token = req.cookies.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let currentUser;
    try {
      const payload: any = jwt.verify(token.value, process.env.NEXTAUTH_SECRET);
      const userId = payload.userId && typeof payload.userId === 'string' && payload.userId.length === 24 ? payload.userId : null;
      if (!userId) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 401 });
      }

      const usersDb = await getUsersDatabase();
      const col = usersDb.collection(USERS_COL);
      const userDoc = await col.findOne({ _id: new ObjectId(userId) });

      if (!userDoc) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (!ADMIN_FIELD || userDoc[ADMIN_FIELD] !== ADMIN_FIELD_VALUE) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      currentUser = {
        userId: userDoc._id.toString(),
        username: userDoc.username,
        staffRank: 'owner',
        staffPermissions: DEFAULT_RANK_PERMISSIONS.owner
      };
    } catch (error) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 403 });
    }

    const validation = validateStaffAssignment(
      currentUser.staffRank,
      rank,
      currentUser.staffPermissions
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);

    const targetUser = await col.findOne({ username });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.staffRank && targetUser.staffRank !== 'none') {
      return NextResponse.json({ error: 'User is already a staff member' }, { status: 400 });
    }

    let permissions: StaffPermissions;
    if (customPermissions && currentUser.staffRank === 'owner') {
      permissions = {
        ...DEFAULT_RANK_PERMISSIONS[rank],
        ...customPermissions
      };
    } else {
      permissions = DEFAULT_RANK_PERMISSIONS[rank];
    }

    const updateData: Record<string, unknown> = {
      staffRank: rank,
      staffPermissions: permissions,
      staffAssignedBy: `${currentUser.username} (${currentUser.userId})`,
      staffAssignedAt: new Date(),
      staffNotes: notes || '',
      isActive: true,
    };
    if (ADMIN_FIELD) updateData[ADMIN_FIELD] = ADMIN_FIELD_VALUE;

    const result = await col.updateOne(
      { _id: targetUser._id },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    const newToken = tokenManager.generateToken({
      userId: targetUser._id.toString(),
      username: targetUser.username,
      email: targetUser.email || '',
      staffRank: rank,
      staffPermissions: permissions
    });

    try {
      const webhookUrl = process.env.staff;
      if (webhookUrl) {
        const content = `username: ${targetUser.username}\nuserid: ${targetUser._id?.toString?.() || ''}\nold rank: none\nnew rank: ${rank}\nadminuserid: ${currentUser.userId}\nadminusername: ${currentUser.username}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    

    return NextResponse.json({ 
      success: true, 
      message: `Successfully added ${username} as ${rank}`,
      newToken: newToken
    });

  } catch (error) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { checkAdminAccess } from '@/lib/admin-utils';
import { StaffRank } from '@/lib/staff-management';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;

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
    
    const allowedFields = ['username', 'newRank', 'notes'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in staff update: ${extraFields.join(', ')}`);
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
      console.warn(`Security: System field manipulation attempted in staff update: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.username !== undefined && typeof body.username !== 'string') {
      return NextResponse.json({ error: "Username must be a string" }, { status: 400 });
    }
    if (body.newRank !== undefined && typeof body.newRank !== 'string') {
      return NextResponse.json({ error: "New rank must be a string" }, { status: 400 });
    }
    if (body.notes !== undefined && typeof body.notes !== 'string') {
      return NextResponse.json({ error: "Notes must be a string" }, { status: 400 });
    }

    const { username, newRank, notes } = body;
    
    if (!username || !newRank) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validRanks: StaffRank[] = ['junior_moderator', 'moderator', 'senior_moderator'];
    if (!validRanks.includes(newRank)) {
      return NextResponse.json({ error: 'Invalid rank specified' }, { status: 400 });
    }

    const adminCheck = await checkAdminAccess(req, token1, token2);
    if (!adminCheck.success || !adminCheck.user) {
      return NextResponse.json({ error: adminCheck.error || 'User not found' }, { status: 403 });
    }

    const currentUser = adminCheck.user;

    if (currentUser.staffRank !== 'senior_moderator' && currentUser.staffRank !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions to manage staff' }, { status: 403 });
    }

    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);

    const targetUser = await col.findOne({ username });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.staffRank || targetUser.staffRank === 'none') {
      return NextResponse.json({ error: 'User is not a staff member' }, { status: 400 });
    }

    const updateData: any = {
      staffRank: newRank,
      staffUpdatedBy: currentUser._id.toString(),
      staffUpdatedAt: new Date(),
      staffNotes: notes || targetUser.staffNotes || ''
    };

    const result = await col.updateOne(
      { username },
      { $set: updateData }
    );

    

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    try {
      const webhookUrl = process.env.staff;
      if (webhookUrl) {
        const content = `username: ${username}\nuserid: ${targetUser._id?.toString?.() || ''}\nold rank: ${targetUser.staffRank || 'none'}\nnew rank: ${newRank}\nadminuserid: ${currentUser._id?.toString?.() || ''}\nadminusername: ${currentUser.username}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${username} to ${newRank}`,
      user: {
        username,
        oldRank: targetUser.staffRank,
        newRank,
        notes: notes || targetUser.staffNotes || '',
        updatedBy: currentUser.username,
        updatedAt: updateData.staffUpdatedAt
      }
    });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

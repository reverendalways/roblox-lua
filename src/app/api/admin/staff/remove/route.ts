import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { checkAdminAccess } from '@/lib/admin-utils';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;

export async function POST(req: NextRequest) {
  try {
    const { username, token1, token2 } = await req.json();
    
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
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

    if (targetUser.staffRank === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner account' }, { status: 403 });
    }

    const setData: Record<string, unknown> = {
      staffRank: 'none',
      staffRemovedBy: currentUser._id.toString(),
      staffRemovedAt: new Date(),
    };
    const unsetData: Record<string, string> = {};
    if (ADMIN_FIELD) unsetData[ADMIN_FIELD] = '';

    const result = await col.updateOne(
      { username },
      Object.keys(unsetData).length > 0 ? { $set: setData, $unset: unsetData } : { $set: setData }
    );

    

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Failed to remove staff status' }, { status: 500 });
    }

    try {
      const webhookUrl = process.env.staff;
      if (webhookUrl) {
        const content = `username: ${username}\nuserid: ${targetUser._id?.toString?.() || ''}\nold rank: ${targetUser.staffRank}\nnew rank: none\nadminuserid: ${currentUser._id?.toString?.() || ''}\nadminusername: ${currentUser.username}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${username} from staff`,
      user: {
        username,
        oldRank: targetUser.staffRank,
        removedBy: currentUser.username,
        removedAt: setData.staffRemovedAt
      }
    });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

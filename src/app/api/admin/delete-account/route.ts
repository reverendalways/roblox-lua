import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { MongoClient, ObjectId } from 'mongodb';
import { checkAdminAccess, checkAdminWithTokens } from '@/lib/admin-utils';
import { getUsersDatabase, getScriptsDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const ADMIN_TOKEN_1 = process.env.ADMIN_TOKEN_1;
const ADMIN_TOKEN_2 = process.env.ADMIN_TOKEN_2;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, doubleConfirm = false } = body;
    
    const token1 = req.headers.get('x-admin-token1');
    const token2 = req.headers.get('x-admin-token2');
    
    if (!username) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!token1 || !token2) return NextResponse.json({ error: 'Missing admin tokens' }, { status: 401 });
    
    const adminCheck = await checkAdminAccess(req, token1, token2);
    if (!adminCheck.success || !adminCheck.user) {
      return NextResponse.json({ error: adminCheck.error || 'User not found' }, { status: 403 });
    }

    const currentUser = {
      userId: adminCheck.user._id.toString(),
      username: adminCheck.user.username,
      staffRank: adminCheck.user.staffRank || 'none'
    };
    
    const usersDb = await getUsersDatabase();
    const userCol = usersDb.collection(USERS_COL);
    const user = await userCol.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userObjectId = user._id;
    
    const isTargetStaff = user.staffRank && user.staffRank !== 'none';
    const isTargetVerified = user.verified === true;
    const accountCreationDate = new Date(user.createdAt || user.timestamp || user.dateCreated || Date.now());
    const accountAge = Date.now() - accountCreationDate.getTime();
    const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);
    
    let canDelete = false;
    let reason = '';
    
    if (currentUser.staffRank === 'owner') {
      canDelete = true;
      reason = 'Owner can delete any account';
    } else if (currentUser.staffRank === 'senior_moderator') {
      if (isTargetStaff) {
        canDelete = false;
        reason = 'Senior moderator cannot delete staff accounts (requires owner)';
      } else {
        canDelete = true;
        reason = 'Senior moderator can delete all non-staff accounts';
      }
    } else if (currentUser.staffRank === 'moderator') {
      if (isTargetStaff) {
        canDelete = false;
        reason = 'Moderator cannot delete staff accounts (requires owner)';
      } else if (isTargetVerified) {
        canDelete = false;
        reason = 'Moderator cannot delete verified accounts (requires senior moderator+)';
      } else {
        canDelete = true;
        reason = 'Moderator can delete non-verified, non-staff accounts';
      }
    } else if (currentUser.staffRank === 'junior_moderator') {
      if (isTargetStaff) {
        canDelete = false;
        reason = 'Junior moderator cannot delete staff accounts (requires owner)';
      } else if (isTargetVerified) {
        canDelete = false;
        reason = 'Junior moderator cannot delete verified accounts (requires moderator+)';
      } else if (accountAgeDays >= 7) {
        canDelete = false;
        reason = 'Junior moderator cannot delete accounts 7+ days old (requires moderator+)';
      } else {
        canDelete = true;
        reason = 'Junior moderator can delete non-verified, non-staff accounts under 7 days';
      }
    }
    
    if (!canDelete) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to delete this account', 
        details: reason,
        accountInfo: {
          age: `${Math.round(accountAgeDays)} days`,
          verified: isTargetVerified,
          staff: isTargetStaff,
          requiredRank: isTargetStaff ? 'owner' : 
                       isTargetVerified ? 'senior_moderator' : 
                       accountAgeDays >= 7 ? 'moderator' : 'junior_moderator'
        }
      }, { status: 403 });
    }
    
    if (isTargetStaff && currentUser.staffRank === 'owner' && !doubleConfirm) {
      return NextResponse.json({ 
        error: 'Double confirmation required', 
        details: 'You are attempting to delete a staff member. This requires double confirmation.',
        requiresDoubleConfirm: true,
        targetUsername: username,
        targetStaffRank: user.staffRank
      }, { status: 400 });
    }
    
    await userCol.deleteOne({ _id: userObjectId });
    
    const scriptsDb = await getScriptsDatabase();
    const scriptsCol = scriptsDb.collection('scripts');
    
    await scriptsCol.updateMany(
      { 'comments.userObjectId': userObjectId.toString() },
      { $pull: { comments: { userObjectId: userObjectId.toString() } } } as any
    );
    
    await scriptsCol.deleteMany({ $or: [
      { ownerUserId: userObjectId.toString() },
      { ownerId: username },
      { ownerUsername: username }
    ] });
    
    
    try {
      const webhookUrl = process.env.deleteaccountswebhookadmin;
      if (webhookUrl) {
        const content = `username: ${username}\nuserid: ${userObjectId.toString()}\nadminusername: ${currentUser.username}\nadminuserid: ${currentUser.userId}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ 
      success: true, 
      reason: reason,
      accountInfo: {
        age: `${Math.round(accountAgeDays)} days`,
        verified: isTargetVerified,
        staff: isTargetStaff
      }
    });
  } catch (err) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

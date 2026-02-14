import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { checkAdminAccess } from '@/lib/admin-utils';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';

export async function GET(req: NextRequest) {
  try {
  

    const url = new URL(req.url);
    const token1 = req.headers.get('x-admin-token1') || url.searchParams.get('token1');
    const token2 = req.headers.get('x-admin-token2') || url.searchParams.get('token2');

    const adminCheck = await checkAdminAccess(req, token1 || undefined, token2 || undefined);
    if (!adminCheck.success) {

      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const currentUser = adminCheck.user;
    if (!currentUser) {
      return NextResponse.json({ error: 'User data not found' }, { status: 500 });
    }



    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);

    const staffMembers = await col.find({
      staffRank: { 
        $exists: true, 
        $ne: null, 
        $in: ['junior_moderator', 'moderator', 'senior_moderator', 'owner']
      }
    }, {
      projection: {
        _id: 1,
        username: 1,
        email: 1,
        staffRank: 1,
        staffAddedAt: 1,
        staffAddedBy: 1,
        staffNotes: 1,
        isActive: 1,
        lastLogin: 1
      }
    }).toArray();

    const totalStaff = await col.countDocuments({
      staffRank: { 
        $exists: true, 
        $ne: null, 
        $in: ['junior_moderator', 'moderator', 'senior_moderator', 'owner']
      }
    });

    const totalUsers = await col.countDocuments({
      $or: [
        { staffRank: 'none' },
        { staffRank: { $exists: false } },
        { staffRank: null }
      ]
    });

    


    
    const response = {
      success: true,
      currentUser: {
        id: currentUser._id.toString(),
        username: currentUser.username,
        staffRank: currentUser.staffRank
      },
      staffMembers: staffMembers.map(member => ({
        id: member._id.toString(),
        username: member.username,
        email: member.email,
        staffRank: member.staffRank,
        staffAddedAt: member.staffAddedAt,
        staffAddedBy: member.staffAddedBy,
        staffNotes: member.staffNotes,
        isActive: member.isActive,
        lastLogin: member.lastLogin
      })),
      stats: {
        totalStaff,
        totalUsers
      }
    };
    

    return NextResponse.json(response);

  } catch (error) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

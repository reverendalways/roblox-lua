import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { createSafeMongoRegexQuery } from '@/lib/security';
import { MongoClient } from 'mongodb';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI!;
const USERS_DB = process.env.USERS_DB_NAME || 'users';
const USERS_COL = process.env.USERS_COLLECTION || 'ScriptVoid';

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
    if (contentLength && parseInt(contentLength) > 10 * 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await req.json().catch(() => ({}));
    
    const allowedFields = ['usernames'];
    
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in user meta: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }
    
    const systemFields = [
      'id', '_id', 'createdAt', 'verified', 'lastOnline', 'lastSeen', 
      'accountthumbnail', 'lastUsernameChange', 'totalScripts', 
      'totalViews', 'totalPoints', 'leaderboardPosition', 'lastStatsUpdate', 
      'lastLeaderboardUpdate', 'isTimeouted', 'timeoutEnd', 'timeoutReason',
      'admin', 'isAdmin', 'role', 'permissions', 'username', 'bio', 'password', 'email'
    ];
    
    const systemFieldAttempts = bodyKeys.filter(key => systemFields.includes(key));
    if (systemFieldAttempts.length > 0) {
      console.warn(`Security: System field manipulation attempted in user meta: ${systemFieldAttempts.join(', ')}`);
      return NextResponse.json({ 
        error: "System fields cannot be modified by users." 
      }, { status: 400 });
    }
    
    if (body.usernames !== undefined && !Array.isArray(body.usernames)) {
      return NextResponse.json({ error: "Usernames must be an array" }, { status: 400 });
    }

    let usernames: string[] = Array.isArray(body.usernames) ? body.usernames : [];
    usernames = usernames.filter(u => typeof u === 'string' && u.trim().length > 0).slice(0, 200);
    if (usernames.length === 0) {
      return NextResponse.json({ users: [] });
    }
    const usersDb = await getUsersDatabase();
    const col = usersDb.collection(USERS_COL);
    const or = usernames.map(u => ({ username: createSafeMongoRegexQuery(u) }));
    const cursor = col.find({ $or: or }, { projection: { username: 1, accountthumbnail: 1, verified: 1, _id: 1 } });
    const docs = await cursor.toArray();
    const out = docs.map(d => ({ id: d._id?.toString?.() || '', username: d.username, accountthumbnail: d.accountthumbnail || '', verified: !!d.verified }));
    return NextResponse.json({ users: out });
  	} catch (e) {
		return NextResponse.json({ error: 'Server error' }, { status: 500 });
	}
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { rateLimitByIP } from '@/middleware/rate-limit';

const USERS_DB = process.env.USERS_DB_NAME || 'users';
const ONLINE_COL = process.env.ONLINE_COLLECTION || 'online';

async function getOnlineCollection() {
  const client = await mongoPool.getClient();
  return client.db(USERS_DB).collection(ONLINE_COL);
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'userPing');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const { username, userId, action } = await req.json();
    
    if (!username && !userId) {
      return NextResponse.json({ error: 'Username or userId is required' }, { status: 400 });
    }

    const now = Date.now();
    const onlineCol = await getOnlineCollection();

    const updateData = {
      lastPing: now,
      type: 'user',
      action: action || 'active',
      updatedAt: new Date()
    };

    const filter = username ? { username } : { userId };
    
    await onlineCol.updateOne(
      filter,
      { 
        $set: { 
          ...updateData,
          ...(username && { username }),
          ...(userId && { userId })
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Online status updated',
      action: action || 'active'
    });

  } catch (error) {
    console.error('Error updating online status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

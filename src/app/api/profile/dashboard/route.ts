import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { createSafeMongoRegexQuery } from '@/lib/security';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { smartCache } from '@/lib/smart-cache';

const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;



async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get('token');
    if (!token) return null;
    
    const payload: any = jwt.verify(token.value, JWT_SECRET);
    return payload.userId || payload.username || payload.id || payload.email;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const cacheBust = searchParams.get('_cb');
    const cacheKey = `profile-dashboard:${username.toLowerCase()}`;
    let cachedResult = smartCache.get(cacheKey);
    
    if (cachedResult && !cacheBust) {
      const response = NextResponse.json(cachedResult);
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-Cached', 'true');
      return response;
    }

    const usersDb = await getUsersDatabase();
    const usersCol = usersDb.collection('ScriptVoid');

    const currentUserId = await getUserIdFromToken(req);
    
    const userDoc = await usersCol.findOne(
      { username: createSafeMongoRegexQuery(username) },
      {
        projection: {
          _id: 1,
          username: 1,
          accountthumbnail: 1,
          verified: 1,
          bio: 1,
          staffRank: 1,
          lastOnline: 1,
          lastSeen: 1,
          totalScripts: 1,
          totalViews: 1,
          totalPoints: 1,
          leaderboardPosition: 1,
          createdAt: 1
        },
        maxTimeMS: 1000
      }
    );

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let isCurrentUserAdmin = false;
    if (currentUserId) {
      try {
        const currentUserDoc = await usersCol.findOne(
          { 
            $or: [
              ...(ObjectId.isValid(currentUserId) ? [{ _id: new ObjectId(currentUserId) }] : []),
              { username: currentUserId },
              { email: currentUserId }
            ]
          },
          {
            projection: (() => {
              const p: Record<string, number> = { staffRank: 1 };
              if (ADMIN_FIELD) p[ADMIN_FIELD] = 1;
              return p;
            })(),
            maxTimeMS: 1000
          }
        );

        if (currentUserDoc) {
          isCurrentUserAdmin = 
            (ADMIN_FIELD && currentUserDoc[ADMIN_FIELD] === ADMIN_FIELD_VALUE) ||
            currentUserDoc.staffRank === 'owner' ||
            currentUserDoc.staffRank === 'senior_moderator' ||
            currentUserDoc.staffRank === 'moderator' ||
            currentUserDoc.staffRank === 'junior_moderator';
        }
      } catch (adminCheckError) {
        console.error('Admin check error:', adminCheckError);
        isCurrentUserAdmin = false;
      }
    }

    const now = Date.now();
    const lastActivityTime = userDoc.lastSeen ? new Date(userDoc.lastSeen).getTime() : 
                            (userDoc.lastOnline ? new Date(userDoc.lastOnline).getTime() : 0);
    const isOnline = (now - lastActivityTime) < 300000;
    
    const userStats = {
      totalScripts: userDoc.totalScripts || 0,
      totalViews: userDoc.totalViews || 0,
      totalPoints: userDoc.totalPoints || 0
    };
    
    const result = {
      userId: userDoc._id.toString(),
      username: userDoc.username,
      accountthumbnail: userDoc.accountthumbnail || '',
      verified: !!userDoc.verified,
      bio: typeof userDoc.bio === 'string' ? userDoc.bio : '',
      staffRank: userDoc.staffRank || null,
      createdAt: userDoc.createdAt || null,
      
      isOnline,
      lastOnline: userDoc.lastSeen || userDoc.lastOnline || null,
      
      totalScripts: userStats.totalScripts,
      totalViews: userStats.totalViews,
      totalPoints: userStats.totalPoints,
      
      leaderboardPosition: userDoc.leaderboardPosition || null,
      
      isCurrentUserAdmin,
      
      timestamp: now
    };

    const totalTime = Date.now() - startTime;
    

    const responseData = {
      ...result,
      performance: {
        totalTime,
        cached: false
      }
    };

    smartCache.set(cacheKey, responseData, { 
      totalCount: 1, 
      lastModified: Date.now(),
      ttl: 30000
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Dashboard fetch error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

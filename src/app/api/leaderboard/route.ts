import { NextRequest, NextResponse } from "next/server";
import { simpleCache } from "@/lib/simple-cache";
import { getUsersDatabase } from "@/lib/mongodb-optimized";
import { rateLimitByIP } from "@/middleware/rate-limit";
import { DEMO_LEADERS } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const rateLimitResponse = await rateLimitByIP(request, 'leaderboard');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = page * limit;
    
    

    const cacheKey = `leaderboard:${page}:${limit}`;
    let leaderboardData = simpleCache.get(cacheKey);
    
    
    if (!leaderboardData) {
      let userDb;
      try {
        userDb = await getUsersDatabase();
      } catch {
        userDb = null;
      }

      let leaderboard: any[] = [];
      let totalUsers = 0;

      if (userDb) {
        try {
          const leaderboardExists = await userDb.collection("leaderboard").countDocuments({});
          if (leaderboardExists > 0) {
            leaderboard = await userDb.collection("leaderboard")
              .find({}, { 
                projection: { 
                  position: 1,
                  username: 1, 
                  verified: 1, 
                  totalViews: 1, 
                  totalLikes: 1, 
                  totalScripts: 1, 
                  totalPoints: 1,
                  avatar: 1,
                  joinDate: 1,
                  lastUpdated: 1
                } 
              })
              .sort({ position: 1 })
              .skip(skip)
              .limit(limit)
              .toArray();
            totalUsers = leaderboardExists;
          } else {
            throw new Error('Leaderboard collection is empty');
          }
        } catch (error) {
          try {
            leaderboard = await userDb.collection("ScriptVoid")
              .find(
                { $or: [ { totalPoints: { $gt: 0 } }, { totalViews: { $gt: 0 } } ] },
                { 
                  projection: { 
                    username: 1, 
                    verified: 1, 
                    totalViews: 1, 
                    totalLikes: 1, 
                    totalScripts: 1, 
                    totalPoints: 1,
                    accountthumbnail: 1,
                    createdAt: 1
                  } 
                }
              )
              .sort({ totalPoints: -1, totalViews: -1, totalScripts: -1 })
              .skip(skip)
              .limit(limit)
              .toArray();
            totalUsers = await userDb.collection("ScriptVoid").countDocuments({
              $or: [ { totalPoints: { $gt: 0 } }, { totalViews: { $gt: 0 } } ]
            });
          } catch {
            leaderboard = [];
            totalUsers = 0;
          }
        }
      }

      if (leaderboard.length === 0) {
        const demoSlice = DEMO_LEADERS.slice(skip, skip + limit).map((user, index) => ({
          username: user.username,
          verified: user.verified || false,
          totalViews: user.totalViews || 0,
          totalLikes: user.totalLikes || 0,
          totalScripts: user.totalScripts || 0,
          totalPoints: user.totalPoints || 0,
          leaderboardPosition: user.position || (skip + index + 1),
          avatar: user.avatar || user.accountthumbnail || '',
          joinDate: new Date().toISOString(),
          lastUpdated: new Date()
        }));
        leaderboardData = {
          users: demoSlice,
          pagination: {
            page,
            limit,
            totalUsers: DEMO_LEADERS.length,
            totalPages: Math.ceil(DEMO_LEADERS.length / limit)
          }
        };
      } else {
        leaderboardData = {
          users: leaderboard.map((user, index) => ({
            username: user.username,
            verified: user.verified || false,
            totalViews: user.totalViews || 0,
            totalLikes: user.totalLikes || 0,
            totalScripts: user.totalScripts || 0,
            totalPoints: user.totalPoints || 0,
            leaderboardPosition: user.position || user.leaderboardPosition || (skip + index + 1),
            avatar: user.avatar || user.accountthumbnail || '',
            joinDate: user.joinDate || user.createdAt,
            lastUpdated: user.lastUpdated || new Date()
          })),
          pagination: {
            page,
            limit,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit)
          }
        };
      }

      simpleCache.set(cacheKey, leaderboardData, 5 * 60 * 1000);
    }

    const totalTime = Date.now() - startTime;
    const response = NextResponse.json({
      ...leaderboardData,
      cached: !!leaderboardData,
      cacheType: 'simple-global',
      responseTime: 'instant',
      performance: { totalTime }
    });
    
    const dataSource = leaderboardData.users.length > 0 && leaderboardData.users[0].lastUpdated ? 'leaderboard-collection' : 'user-collection-fallback';
    response.headers.set('X-Data-Source', dataSource);
    
    return response;

  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

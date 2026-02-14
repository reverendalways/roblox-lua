import { NextRequest, NextResponse } from "next/server";
import { getUsersDatabase } from "@/lib/mongodb-optimized";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";

interface User {
  username: string;
  verified?: boolean;
  totalViews?: number;
  totalLikes?: number;
  totalScripts?: number;
  totalPoints?: number;
  accountthumbnail?: string;
  createdAt?: Date;
  staffRank?: string;
}

interface LeaderboardEntry {
  position: number;
  username: string;
  verified: boolean;
  totalViews: number;
  totalLikes: number;
  totalScripts: number;
  totalPoints: number;
  avatar: string;
  joinDate: Date | undefined;
  lastUpdated: Date;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userDb = await getUsersDatabase();
    if (!userDb) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }
    

    const usersCol = userDb.collection('ScriptVoid');
    
    const leaderboardCol = userDb.collection('leaderboard');
    

    
    
    const allUsers = await usersCol
      .find({}, {
        projection: {
          username: 1,
          verified: 1,
          totalViews: 1,
          totalLikes: 1,
          totalScripts: 1,
          totalPoints: 1,
          accountthumbnail: 1,
          createdAt: 1,
          staffRank: 1
        }
      })
      .sort({ totalViews: -1 })
      .toArray() as unknown as User[];

    

    const batchSize = 100;
    const batches: User[][] = [];
    
    for (let i = 0; i < allUsers.length; i += batchSize) {
      batches.push(allUsers.slice(i, i + batchSize));
    }

    

    let processedCount = 0;
    const leaderboardData: LeaderboardEntry[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      

      for (let userIndex = 0; userIndex < batch.length; userIndex++) {
        const user = batch[userIndex];
        const position = processedCount + userIndex + 1;

        if (position <= 100) {
          leaderboardData.push({
            position,
            username: user.username,
            verified: user.verified || false,
            totalViews: user.totalViews || 0,
            totalLikes: user.totalLikes || 0,
            totalScripts: user.totalScripts || 0,
            totalPoints: user.totalPoints || 0,
            avatar: user.accountthumbnail || '',
            joinDate: user.createdAt,
            lastUpdated: new Date()
          });
        }

        if (position <= 100) {
          await usersCol.updateOne(
            { username: user.username },
            { 
              $set: { 
                leaderboardPosition: position,
                lastLeaderboardUpdate: new Date()
              } 
            }
          );
        } else {
          await usersCol.updateOne(
            { username: user.username },
            { 
              $unset: { 
                leaderboardPosition: "",
                lastLeaderboardUpdate: ""
              } 
            }
          );
        }
      }

      processedCount += batch.length;
      
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    

    
    
    if (leaderboardData.length > 0) {
      let updatedCount = 0;
      let createdCount = 0;
      
      for (const userData of leaderboardData) {
        try {
          const result = await leaderboardCol.updateOne(
            { username: userData.username },
            { $set: userData },
            { upsert: true }
          );
          
          if (result.upsertedCount > 0) {
            createdCount++;
          } else if (result.modifiedCount > 0) {
            updatedCount++;
          }
        } catch (error) {
          
        }
      }
      
      const verifyCount = await leaderboardCol.countDocuments({});
      
      
      const usernamesInTop100 = leaderboardData.map(user => user.username);
      const removeResult = await leaderboardCol.deleteMany({
        username: { $nin: usernamesInTop100 }
      });
      
      
      
      const finalCount = await leaderboardCol.countDocuments({});
    } else {
      
    }

    try {
      await leaderboardCol.createIndex({ position: 1 });
    } catch (error) {
      
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Updated leaderboard positions for ${processedCount} users`,
      leaderboardUsers: leaderboardData.length,
      totalUsers: processedCount,
      processingTime: totalTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Leaderboard update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

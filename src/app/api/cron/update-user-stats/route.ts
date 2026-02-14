import { NextRequest, NextResponse } from 'next/server';
import { getUsersDatabase, getScriptsDatabase } from '@/lib/mongodb-optimized';

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    
    const usersDb = await getUsersDatabase();
    const scriptsDb = await getScriptsDatabase();
    
    if (!usersDb || !scriptsDb) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const usersCol = usersDb.collection('ScriptVoid');
    const scriptsCol = scriptsDb.collection('scripts');

    const allUsers = await usersCol.find({}, {
      projection: {
        _id: 1,
        username: 1
      }
    }).toArray();

    let processedUsers = 0;
    let updatedUsers = 0;
    let errors = 0;

    const batchSize = 50;
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          const statsResult = await scriptsCol.aggregate([
            {
              $match: {
                $or: [
                  { ownerUserId: user._id.toString() },
                  { ownerId: user.username },
                  { ownerUsername: user.username }
                ]
              }
            },
            {
              $group: {
                _id: null,
                totalScripts: { $sum: 1 },
                totalViews: { $sum: { $ifNull: ["$views", 0] } },
                totalPoints: { $sum: { $ifNull: ["$points", 0] } }
              }
            }
          ], { maxTimeMS: 5000 }).toArray();

          const stats = statsResult.length > 0 ? statsResult[0] : {
            totalScripts: 0,
            totalViews: 0,
            totalPoints: 0
          };

          await usersCol.updateOne(
            { _id: user._id },
            {
              $set: {
                totalScripts: stats.totalScripts,
                totalViews: stats.totalViews,
                totalPoints: stats.totalPoints,
                lastStatsUpdate: new Date()
              }
            }
          );

          return { success: true, username: user.username, stats };
        } catch (error) {
          console.error(`Failed to update stats for user ${user.username}:`, error);
          return { success: false, username: user.username, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        processedUsers++;
        if (result.success) {
          updatedUsers++;
        } else {
          errors++;
        }
      });

      if (i + batchSize < allUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Updated user stats for ${updatedUsers} users`,
      summary: {
        totalUsers: allUsers.length,
        processedUsers,
        updatedUsers,
        errors,
        totalDuration: `${totalDuration}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('User stats update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update user stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

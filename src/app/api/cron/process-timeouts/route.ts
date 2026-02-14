import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usersDb = await getUsersDatabase();
    const usersCollection = usersDb.collection(USERS_COL);

    const now = new Date();
    const expiredTimeouts = await usersCollection.find({
      isTimeouted: true,
      timeoutEnd: { $lt: now }
    }).toArray();

    if (expiredTimeouts.length === 0) {
      return NextResponse.json({ 
        message: 'No expired timeouts found',
        processed: 0,
        timestamp: now.toISOString()
      });
    }

    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < expiredTimeouts.length; i += batchSize) {
      const batch = expiredTimeouts.slice(i, i + batchSize);
      const userIds = batch.map(user => user._id);

      await usersCollection.updateMany(
        { _id: { $in: userIds } },
        { 
          $unset: { 
            isTimeouted: "",
            timeoutEnd: "",
            timeoutReason: "",
            timeoutAt: "",
            timeoutDuration: "",
            timeoutDurationUnit: ""
          }
        }
      );

      processed += batch.length;
    }


    return NextResponse.json({ 
      message: `Successfully processed ${processed} expired timeouts`,
      processed: processed,
      timestamp: now.toISOString()
    });

  	} catch (error) {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
  return POST(request);
}


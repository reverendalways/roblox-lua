import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getScriptsDatabase, getUsersDatabase } from "@/lib/mongodb-optimized";

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';


export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    
    const db = await getScriptsDatabase();
    
    const codesToCleanup = await db.collection("codes").find({
      $or: [
        { createdAt: { $exists: false } },
        { createdAt: null },
        { createdAt: { $lt: new Date('2001-01-01') } },
        { codeType: { $exists: false } },
        { description: { $exists: false } }
      ]
    }).toArray();
    
    let updatedCount = 0;
    const now = new Date();
    
    for (const code of codesToCleanup) {
      const updateFields: any = {};
      
      if (!code.createdAt || new Date(code.createdAt).getTime() < 1000000000000) {
        updateFields.createdAt = now;
      }
      
      if (!code.codeType) {
        updateFields.codeType = 'promo';
      }
      
      if (!code.description) {
        updateFields.description = `Code - Tier ${code.tier}`;
      }
      
      if (code.usedAt && new Date(code.usedAt).getTime() < 1000000000000) {
        updateFields.usedAt = null;
        updateFields.active = false;
      }
      
      if (Object.keys(updateFields).length > 0) {
        await db.collection("codes").updateOne(
          { _id: code._id },
          { $set: updateFields }
        );
        updatedCount++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${updatedCount} codes`,
      updatedCount 
    }, { status: 200 });
    
  } catch (err) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

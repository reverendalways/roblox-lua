import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScriptsDatabase } from '@/lib/mongodb-optimized';
import { checkAdminAccess } from '@/lib/admin-utils';

const SCRIPTS_URI = process.env.SCRIPTS_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = "mydatabase";
const SCRIPTS_COL = "scripts";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.success) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: scriptId } = await params;
    const { likeCount } = await req.json();
    
    if (typeof likeCount !== 'number' || likeCount < 0 || !Number.isFinite(likeCount)) {
      return NextResponse.json({ error: 'Invalid like count' }, { status: 400 });
    }
    
    if (likeCount > 1000000) {
      return NextResponse.json({ error: 'Like count too high' }, { status: 400 });
    }

    const scriptsDb = await getScriptsDatabase();
    const scriptsCol = scriptsDb.collection(SCRIPTS_COL);
    let result;
    if (ObjectId.isValid(scriptId)) {
      result = await scriptsCol.updateOne(
        { _id: new ObjectId(scriptId) },
        { $set: { likes: likeCount } }
      );
      if (result.matchedCount === 0) {
        result = await scriptsCol.updateOne(
          { id: scriptId },
          { $set: { likes: likeCount } }
        );
      }
    } else {
      result = await scriptsCol.updateOne(
        { id: scriptId },
        { $set: { likes: likeCount } }
      );
    }
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Like count not updated" }, { status: 500 });
    }
    return NextResponse.json({ success: true, updated: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
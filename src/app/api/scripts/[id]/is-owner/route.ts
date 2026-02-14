import { NextRequest, NextResponse } from "next/server";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const tokenCookie = req.cookies.get("token");
    if (!tokenCookie) {
      return NextResponse.json({ isOwner: false, error: "Not authenticated" }, { status: 401 });
    }
    
    let payload: any = null;
    try {
      payload = jwt.verify(tokenCookie.value, JWT_SECRET, { 
        algorithms: ['HS256'] 
      });
    } catch {
      return NextResponse.json({ isOwner: false, error: "Invalid or expired token" }, { status: 401 });
    }
    
    const userId = payload.userId;
    if (!userId) {
      return NextResponse.json({ isOwner: false, error: "Invalid userId in token" }, { status: 401 });
    }
    
    const db = await getScriptsDatabase();
    
    const script = await db.collection("scripts").findOne({ id });
    if (!script) {
      return NextResponse.json({ isOwner: false, error: "Script not found" }, { status: 404 });
    }
    
    let isOwner = false;
    
    if (script.ownerUserId) {
      try {
        const scriptOwnerId = new ObjectId(script.ownerUserId);
        const requestUserId = new ObjectId(userId);
        isOwner = scriptOwnerId.equals(requestUserId);
        

      } catch (error) {

        isOwner = script.ownerUserId.toString() === userId.toString();
      }
    }
    
    if (script.isOrphaned === true) {
      isOwner = false;
      
    }
    

    
    return NextResponse.json({ isOwner });
    
  } catch (err) {

    return NextResponse.json({ isOwner: false, error: "Server error" }, { status: 500 });
  }
}

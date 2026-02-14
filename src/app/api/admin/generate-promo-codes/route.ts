import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { checkAdminAccess } from "../../../../lib/admin-utils";
import { createSafeMongoRegexQuery } from "../../../../lib/security";
import { getScriptsDatabase, getUsersDatabase } from "@/lib/mongodb-optimized";

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const ADMIN_TOKEN_1 = process.env.ADMIN_TOKEN_1;
const ADMIN_TOKEN_2 = process.env.ADMIN_TOKEN_2;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

const MULTIPLIERS = [
  { maxAge: 60 * 60 * 1000, multiplier: 2.0 },
  { maxAge: 24 * 60 * 60 * 1000, multiplier: 1.6 },
  { maxAge: 3 * 24 * 60 * 60 * 1000, multiplier: 1.4 },
  { maxAge: 7 * 24 * 60 * 60 * 1000, multiplier: 1.3 },
  { maxAge: 14 * 24 * 60 * 60 * 1000, multiplier: 1.15 },
  { maxAge: 30 * 24 * 60 * 60 * 1000, multiplier: 1.1 },
  { maxAge: 90 * 24 * 60 * 60 * 1000, multiplier: 1.0 },
  { maxAge: Infinity, multiplier: 0.9 },
];

function getFreshnessMultiplier(createdAt: Date | string) {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const age = now - created;
  for (const window of MULTIPLIERS) {
    if (age <= window.maxAge) return window.multiplier;
  }
  return 1.0;
}

function generateCode(tier: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rand = "";
  for (let i = 0; i < 12; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `PROMO-${tier}-${rand}`;
}



export async function POST(req: NextRequest) {
  let client: null = null;
  try {
    const { count = 10 } = await req.json();
    
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }
    const scriptsDb = await getScriptsDatabase();
    const scriptsCol = scriptsDb.collection('scripts');
    
    const usersDb = await getUsersDatabase();
    const usersCol = usersDb.collection('ScriptVoid');
    

    const scripts = await scriptsCol.find({}).toArray();
    let updated = 0;
    let verifiedUpdated = 0;
    let verifiedCount = 0;
    let unverifiedCount = 0;
    for (const script of scripts) {
      let user: any = null;
      if (script.ownerUserId && typeof script.ownerUserId === 'string' && script.ownerUserId.length === 24) {
        const orArr: any[] = [];
        try { orArr.push({ _id: new ObjectId(script.ownerUserId) }); } catch {}
        orArr.push({ _id: script.ownerUserId });
        user = await usersCol.findOne({ $or: orArr, verified: true });
      } else if (script.ownerId || script.ownerUsername) {
        const orArr: any[] = [];
        if (script.ownerId) orArr.push({ username: createSafeMongoRegexQuery(script.ownerId) });
        if (script.ownerUsername) orArr.push({ username: createSafeMongoRegexQuery(script.ownerUsername) });
        if (orArr.length > 0) {
          user = await usersCol.findOne({ $or: orArr, verified: true });
        }
      }
      let shouldUpdateVerification = false;
      let newOwnerVerified = !!user;
      let newIsVerified = !!user;
      if (script.ownerVerified !== newOwnerVerified || script.isVerified !== newIsVerified) {
        await scriptsCol.updateOne(
          { _id: script._id },
          { $set: { ownerVerified: newOwnerVerified, isVerified: newIsVerified } }
        );
        shouldUpdateVerification = true;
        updated++;
        if (newOwnerVerified) verifiedUpdated++;
      }
      const freshScript = await scriptsCol.findOne({ _id: script._id });
      if (!freshScript) continue;
      const freshnessMultiplier = getFreshnessMultiplier(freshScript.createdAt);
      let promotionMultiplier = 0;
      if (freshScript.promotionActive && freshScript.promotionTier) {
        switch (freshScript.promotionTier) {
          case 'I':
          case 'Promotion I':
            promotionMultiplier = 0.2;
            break;
          case 'II':
          case 'Promotion II':
            promotionMultiplier = 0.35;
            break;
          case 'III':
          case 'Promotion III':
            promotionMultiplier = 0.5;
            break;
          case 'IV':
          case 'Promotion IV':
            promotionMultiplier = 0.7;
            break;
        }
      }
      const verificationMultiplier = freshScript.ownerVerified ? 0.4 : 0;
      let bumpBonus = 0;
      if (freshScript.isBumped) {
        if (freshScript.promotionTier === 1 || freshScript.promotionTier === 'I' || freshScript.promotionTier === 'Promotion I') bumpBonus = 0.10;
        else if (freshScript.promotionTier === 2 || freshScript.promotionTier === 'II' || freshScript.promotionTier === 'Promotion II') bumpBonus = 0.15;
        else if (freshScript.promotionTier === 3 || freshScript.promotionTier === 'III' || freshScript.promotionTier === 'Promotion III') bumpBonus = 0.20;
        else if (freshScript.promotionTier === 4 || freshScript.promotionTier === 'IV' || freshScript.promotionTier === 'Promotion IV') bumpBonus = 0.25;
        else bumpBonus = 0.05;
      }
      let multiplier = freshnessMultiplier + promotionMultiplier + verificationMultiplier + bumpBonus;
      multiplier = Math.round(multiplier * 1000) / 1000;
      if (freshScript.multiplier !== multiplier) {
        await scriptsCol.updateOne(
          { _id: script._id },
          { $set: { multiplier } }
        );
        updated++;
      }
      if (user) {
        verifiedCount++;
      } else {
        unverifiedCount++;
      }
    }
    return NextResponse.json({ success: true, updated, verifiedUpdated, verifiedCount, unverifiedCount }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update multipliers', details: String(err) }, { status: 500 });
  } finally {
    
  }
}

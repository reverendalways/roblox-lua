import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { checkAdminAccess, checkAdminWithTokens } from "../../../../lib/admin-utils";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";

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

function generateCode(tier: string, codeType: string = 'promo'): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rand = "";
  for (let i = 0; i < 12; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  
  if (codeType === 'ageReset') {
    return `AGERESET-${tier}-${rand}`;
  }
  return `PROMO-${tier}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const { count = 10, codeType = 'promo' } = await req.json();
    
    const token1 = req.headers.get('x-admin-token1');
    const token2 = req.headers.get('x-admin-token2');
    
    if (!token1 || !token2) {
      return NextResponse.json({ error: 'Missing admin authentication tokens' }, { status: 401 });
    }
    
    const adminCheck = await checkAdminAccess(req, token1, token2);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const currentUser = adminCheck.user;
    if (!currentUser || !currentUser.staffRank) {
      return NextResponse.json({ error: 'User not found or no staff rank' }, { status: 403 });
    }

    if (currentUser.staffRank !== 'owner') {
      return NextResponse.json({ 
        error: 'Insufficient permissions to generate promo codes', 
        details: 'Only Owners can generate promo codes',
        requiredRank: 'owner',
        currentRank: currentUser.staffRank
      }, { status: 403 });
    }
    
    const tiers = [
      { tier: "I", multiplier: 1.2, ageReversalDays: 7 },
      { tier: "II", multiplier: 1.35, ageReversalDays: 14 },
      { tier: "III", multiplier: 1.5, ageReversalDays: 30 },
      { tier: "IV", multiplier: 1.7, ageReversalDays: 90 }
    ];
    
    const db = await getScriptsDatabase();
    
    if (codeType === 'ageReset') {
      const codesByTier: Record<string, string[]> = { 'Age Reset': [] };
      for (let i = 0; i < count; i++) {
        const code = generateCode('RESET', 'ageReset');
        await db.collection("codes").insertOne({
          code,
          tier: null,
          codeType: 'ageReset',
          multiplier: null,
          ageReversalDays: null,
          expiresAt: null,
          active: false,
          createdAt: new Date(),
          description: `Special Offer: Full Script Age Reset`
        });
        codesByTier['Age Reset'].push(code);
      }

      return NextResponse.json({ codesByTier, codeType: 'ageReset' }, { status: 201 });
    } else {
      const codesByTier: Record<string, string[]> = { I: [], II: [], III: [], IV: [] };
      for (let i = 0; i < count; i++) {
        const t = tiers[Math.floor(Math.random() * tiers.length)];
        const code = generateCode(t.tier, 'promo');
        await db.collection("codes").insertOne({
          code,
          tier: t.tier,
          codeType: 'promo',
          multiplier: t.multiplier,
          ageReversalDays: t.ageReversalDays,
          expiresAt: null,
          active: false,
          createdAt: new Date(),
          description: `Promotion Code - Tier ${t.tier}`
        });
        codesByTier[t.tier].push(code);
      }

      return NextResponse.json({ codesByTier, codeType: 'promo' }, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token1 = req.headers.get('x-admin-token1') || new URL(req.url).searchParams.get('token1');
    const token2 = req.headers.get('x-admin-token2') || new URL(req.url).searchParams.get('token2');
    
    if (!token1 || !token2) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await checkAdminWithTokens(req, token1, token2);
    if (!admin.success) return NextResponse.json({ error: admin.error }, { status: 403 });
    
    const currentUser = admin.user;
    if (!currentUser || !currentUser.staffRank) {
      return NextResponse.json({ error: 'User not found or no staff rank' }, { status: 403 });
    }

    if (currentUser.staffRank !== 'owner') {
      return NextResponse.json({ 
        error: 'Insufficient permissions to view promo codes', 
        details: 'Only Owners can view promo codes',
        requiredRank: 'owner',
        currentRank: currentUser.staffRank
      }, { status: 403 });
    }
    
    const db = await getScriptsDatabase();
    
    const codes = await db.collection("codes").find({}).toArray();
    
    
    const promoCodesByTier: Record<string, any[]> = { I: [], II: [], III: [], IV: [] };
    const ageResetCodes: any[] = [];
    
    const codeStats = {
      total: codes.length,
      promo: codes.filter(c => c.codeType === 'promo').length,
      ageReset: codes.filter(c => c.codeType === 'ageReset').length,
      used: codes.filter(c => c.active).length,
      unused: codes.filter(c => !c.active).length
    };
    
    codes.forEach(code => {
      let usedAt: Date | null = null;
      let createdAt: Date = new Date();
      
      if (code.usedAt) {
        try {
          const parsedDate = new Date(code.usedAt);
          if (parsedDate.getTime() > 1000000000000) {
            usedAt = parsedDate;
          }
        } catch {
          usedAt = null;
        }
      }
      
      if (code.createdAt) {
        try {
          const parsedDate = new Date(code.createdAt);
          if (parsedDate.getTime() > 1000000000000) {
            createdAt = parsedDate;
          }
        } catch {
          createdAt = new Date();
        }
      }
      
      const codeInfo = {
        code: code.code,
        codeType: code.codeType || 'promo',
        description: code.description || `Code - Tier ${code.tier}`,
        active: code.active || false,
        createdAt: createdAt,
        usedAt: usedAt,
        usedBy: code.usedBy || null,
        scriptId: code.scriptId || null,
        tier: code.tier || null
      };
      
      if (code.codeType === 'ageReset') {
        ageResetCodes.push(codeInfo);
      } else {
        if (promoCodesByTier[code.tier]) {
          promoCodesByTier[code.tier].push(codeInfo);
        }
      }
    });
    
    return NextResponse.json({ 
      promoCodesByTier,
      ageResetCodes,
      codeStats,
      codeTypes: {
        promo: "Promotion Codes",
        ageReset: "Special Offer: Full Script Age Reset"
      }
    }, { status: 200 });
  } catch (err) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
  }
}

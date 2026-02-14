import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { getUsersDatabase } from "@/lib/mongodb-optimized";

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const ADMIN_TOKEN_1 = process.env.ADMIN_TOKEN_1;
const ADMIN_TOKEN_2 = process.env.ADMIN_TOKEN_2;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set');
}

export async function checkAdminAccess(req: NextRequest, token1?: string, token2?: string) {
  try {
    const token = req.cookies.get('token');
    if (!token) return { success: false, error: 'No token found' };

    const payload: any = jwt.verify(token.value, JWT_SECRET, { algorithms: ['HS256'] });
    const userId = payload.userId && typeof payload.userId === 'string' && payload.userId.length === 24 ? payload.userId : null;
    if (!userId) return { success: false, error: 'Invalid user ID' };

    const db = await getUsersDatabase();
    const col = db.collection(USERS_COL);
    const userDoc = await col.findOne({ _id: new ObjectId(userId) });

    if (!userDoc) return { success: false, error: 'User not found' };

    
    if (!ADMIN_FIELD || userDoc[ADMIN_FIELD] !== ADMIN_FIELD_VALUE) {
      return { success: false, error: 'Admin access required' };
    }

    if (token1 && token2) {
      if (token1 !== ADMIN_TOKEN_1 || token2 !== ADMIN_TOKEN_2) {
        return { success: false, error: 'Invalid admin tokens' };
      }
    }

    
    if (!userDoc.staffRank || userDoc.staffRank === 'none') {
      return { success: false, error: 'Staff rank required' };
    }


    
    return { success: true, user: userDoc };
  } catch (error) {
    return { success: false, error: 'Authentication failed' };
  }
}

export async function checkPermission(req: NextRequest, permission: string, token1?: string, token2?: string) {
  const adminCheck = await checkAdminAccess(req, token1, token2);
  if (!adminCheck.success) return adminCheck;

  const user = adminCheck.user;
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  const staffRank = user.staffRank;

  const permissions = {
    junior_moderator: {
      canDeleteScripts: true,
      canDeleteAccounts: false,
      canTimeoutAccounts: true,
      canManageStaff: false,
      canAccessAdminPanel: true,
      canViewStats: true
    },
    moderator: {
      canDeleteScripts: true,
      canDeleteAccounts: false,
      canTimeoutAccounts: true,
      canManageStaff: false,
      canAccessAdminPanel: true,
      canViewStats: true
    },
    senior_moderator: {
      canDeleteScripts: true,
      canDeleteAccounts: true,
      canTimeoutAccounts: true,
      canManageStaff: true,
      canAccessAdminPanel: true,
      canViewStats: true
    },
    owner: {
      canDeleteScripts: true,
      canDeleteAccounts: true,
      canTimeoutAccounts: true,
      canManageStaff: true,
      canAccessAdminPanel: true,
      canViewStats: true,
      canGeneratePromoCodes: true,
      canShutdownDashboard: true,
      canDoEverything: true
    }
  };

  const rankPermissions = permissions[staffRank as keyof typeof permissions];
  if (!rankPermissions || !rankPermissions[permission as keyof typeof rankPermissions]) {
    return { success: false, error: `Permission denied: ${permission}` };
  }

  return { success: true, user };
}

export async function checkAdminWithTokens(req: NextRequest, token1: string, token2: string) {
  return await checkAdminAccess(req, token1, token2);
}


import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { StaffPermissions, StaffRank, DEFAULT_RANK_PERMISSIONS } from './staff-management';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface EnhancedJWTPayload {
  userId: string;
  username: string;
  email: string;
  staffRank: StaffRank;
  staffPermissions: StaffPermissions;
  tokenVersion: number;
  issuedAt: number;
  expiresAt: number;
}

export interface RefreshToken {
  token: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
}

export class TokenManager {
  private static instance: TokenManager;
  private revokedTokens: Set<string> = new Set();
  private tokenVersions: Map<string, number> = new Map();

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  generateToken(userData: {
    userId: string;
    username: string;
    email: string;
    staffRank: StaffRank;
    staffPermissions: StaffPermissions;
  }): string {
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000);

    const payload: EnhancedJWTPayload = {
      ...userData,
      tokenVersion: this.getTokenVersion(userData.userId),
      issuedAt: now,
      expiresAt,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  generateRefreshToken(userId: string): string {
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    return refreshToken;
  }

  verifyToken(token: string): EnhancedJWTPayload | null {
    try {
      if (this.revokedTokens.has(token)) {
        return null;
      }

      const decoded = jwt.verify(token, JWT_SECRET, { 
        algorithms: ['HS256']
      }) as EnhancedJWTPayload;
      
      if (!decoded.userId || !decoded.username || !decoded.email) {
        return null;
      }
      
      const currentVersion = this.getTokenVersion(decoded.userId);
      if (decoded.tokenVersion !== currentVersion) {
        return null;
      }

      if (decoded.expiresAt < Date.now()) {
        return null;
      }

      const validRanks = ['none', 'moderator', 'high_moderator', 'owner'];
      if (!validRanks.includes(decoded.staffRank)) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  revokeAllUserTokens(userId: string): void {
    const currentVersion = this.tokenVersions.get(userId) || 0;
    this.tokenVersions.set(userId, currentVersion + 1);
  }

  private getTokenVersion(userId: string): number {
    return this.tokenVersions.get(userId) || 1;
  }

  cleanupExpiredTokens(): void {
  }
}

export async function authenticateStaff(req: any): Promise<{
  isAuthenticated: boolean;
  user?: EnhancedJWTPayload;
  error?: string;
}> {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return { isAuthenticated: false, error: 'No token provided' };
    }

    const tokenManager = TokenManager.getInstance();
    const user = tokenManager.verifyToken(token);

    if (!user) {
      return { isAuthenticated: false, error: 'Invalid or expired token' };
    }

    if (user.staffRank === 'none') {
      return { isAuthenticated: false, error: 'Insufficient permissions' };
    }

    return { isAuthenticated: true, user };
  } catch (error) {
    return { isAuthenticated: false, error: 'Authentication failed' };
  }
}

export function requirePermission(permission: keyof StaffPermissions) {
  return async (req: any) => {
    const auth = await authenticateStaff(req);
    if (!auth.isAuthenticated || !auth.user) {
      throw new Error('Authentication required');
    }

    if (!auth.user.staffPermissions[permission]) {
      throw new Error(`Permission denied: ${permission}`);
    }

    return auth.user;
  };
}

export function requireAnyPermission(permissions: (keyof StaffPermissions)[]) {
  return async (req: any) => {
    const auth = await authenticateStaff(req);
    if (!auth.isAuthenticated || !auth.user) {
      throw new Error('Authentication required');
    }

    const hasPermission = permissions.some(
      permission => auth.user!.staffPermissions[permission]
    );

    if (!hasPermission) {
      throw new Error(`Permission denied: requires one of [${permissions.join(', ')}]`);
    }

    return auth.user;
  };
}

export function requireAllPermissions(permissions: (keyof StaffPermissions)[]) {
  return async (req: any) => {
    const auth = await authenticateStaff(req);
    if (!auth.isAuthenticated || !auth.user) {
      throw new Error('Authentication required');
    }

    const hasAllPermissions = permissions.every(
      permission => auth.user!.staffPermissions[permission]
    );

    if (!hasAllPermissions) {
      throw new Error(`Permission denied: requires all of [${permissions.join(', ')}]`);
    }

    return auth.user;
  };
}

export function requireMinimumRank(minimumRank: StaffRank) {
  return async (req: any) => {
    const auth = await authenticateStaff(req);
    if (!auth.isAuthenticated || !auth.user) {
      throw new Error('Authentication required');
    }

    const rankHierarchy = {
      none: 0,
      moderator: 1,
      high_moderator: 2,
      owner: 3,
    };

    if (rankHierarchy[auth.user.staffRank] < rankHierarchy[minimumRank]) {
      throw new Error(`Rank required: ${minimumRank} or higher`);
    }

    return auth.user;
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      return null;
    }

    return null;
  } catch (error) {
    return null;
  }
}

export function sanitizeUserData(user: any): Partial<EnhancedJWTPayload> {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const tokenManager = TokenManager.getInstance();



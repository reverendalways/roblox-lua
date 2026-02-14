import { getRedisClient } from './redis-client';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(identifier: string, action: string): Promise<RateLimitResult> {
    try {
      const redis = await getRedisClient();
      const key = `rate_limit:${identifier}:${action}`;
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      const pipeline = redis.multi();
      
      pipeline.zRemRangeByScore(key, 0, windowStart);
      
      pipeline.zCard(key);
      
      pipeline.zAdd(key, { score: now, value: now.toString() });
      
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const currentCount = Number(results[1]) || 0;
      const allowed = currentCount < this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - currentCount - 1);
      const resetTime = now + this.config.windowMs;

      return {
        allowed,
        remaining,
        resetTime,
        totalHits: currentCount + 1
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        totalHits: 0
      };
    }
  }

  async resetLimit(identifier: string, action: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `rate_limit:${identifier}:${action}`;
      await redis.del(key);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }
}

export const rateLimiters = {
  login: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  signup: new RateLimiter({
    windowMs: 2 * 60 * 1000,
    maxRequests: 1
  }),





  scriptBrowse: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 15
  }),

  scriptSearch: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100
  }),

  leaderboard: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 12
  }),

  scriptViewPerScript: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptViewGlobal: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30
  }),

  scriptLike: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptBump: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptStatus: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptEdit: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptPromote: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptReport: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3
  }),

  comment: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  profilePicture: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 15
  }),

  usernameChange: new RateLimiter({
    windowMs: 5 * 60 * 1000,
    maxRequests: 1
  }),

  bioChange: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),

  emailChange: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  passwordChange: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  accountDelete: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 2
  }),

  adminSecureAction: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  adminDeleteScript: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 12
  }),

  adminDeleteAccount: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5
  }),

  adminDeleteComment: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10
  }),

  adminTimeout: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10
  }),

  adminVerifyAccount: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 20
  }),

  adminDashboardShutdown: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10
  }),

  userDeleteScript: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptUpload: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 6
  }),

  emailRequest: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3
  }),

  emailVerify: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  passwordRequest: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3
  }),

  passwordVerify: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  forgotPassword: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3
  }),

  emailVerification: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  thumbnailUpload: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  scriptThumbnail: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3
  }),

  userInfo: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100
  }),

  userPing: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30
  }),

  profileDashboard: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  }),

  userScripts: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  }),

  notifications: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30
  }),

  csrfToken: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 50
  }),

  robloxGameInfo: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  }),

  adminStaffAdd: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5
  }),

  adminStaffRemove: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5
  }),

  adminStaffUpdate: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10
  }),

  adminStaffList: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  }),

  adminGeneratePromoCodes: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 8
  }),

  adminPromoCodes: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  }),

  adminClearCache: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5
  }),

  adminSmartCache: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),

  adminStats: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  }),


  adminCheckStatus: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),

  promotionExpire: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),

  scriptUpdateGameInfo: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),

  userMeta: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  }),

  general: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100
  })
};

export function getRateLimiter(action: string): RateLimiter {
  return rateLimiters[action as keyof typeof rateLimiters] || rateLimiters.general;
}

export async function checkScriptViewRateLimit(identifier: string, scriptId: string): Promise<RateLimitResult> {
  try {
    const redis = await getRedisClient();
    const now = Date.now();
    const windowMs = 60 * 1000;
    const windowStart = now - windowMs;

    const perScriptKey = `rate_limit:${identifier}:scriptViewPerScript:${scriptId}`;
    const globalKey = `rate_limit:${identifier}:scriptViewGlobal`;

    const pipeline = redis.multi();
    
    pipeline.zRemRangeByScore(perScriptKey, 0, windowStart);
    pipeline.zCard(perScriptKey);
    pipeline.zAdd(perScriptKey, { score: now, value: now.toString() });
    pipeline.expire(perScriptKey, Math.ceil(windowMs / 1000));
    
    pipeline.zRemRangeByScore(globalKey, 0, windowStart);
    pipeline.zCard(globalKey);
    pipeline.zAdd(globalKey, { score: now, value: now.toString() });
    pipeline.expire(globalKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const perScriptCount = results[1] ? Number(results[1]) : 0;
    const globalCount = results[5] ? Number(results[5]) : 0;
    
    const perScriptAllowed = perScriptCount < 5;
    const globalAllowed = globalCount < 30;
    
    const allowed = perScriptAllowed && globalAllowed;
    const remaining = Math.min(5 - perScriptCount, 30 - globalCount);
    const resetTime = now + windowMs;

    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetTime,
      totalHits: Math.max(perScriptCount, globalCount)
    };

  } catch (error) {
    console.error('Script view rate limiting error:', error);
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 60000,
      totalHits: 0
    };
  }
}

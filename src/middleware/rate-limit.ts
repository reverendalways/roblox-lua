import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter, RateLimitResult } from '../lib/rate-limiter';
import { tokenManager } from '../lib/auth-enhanced';

export interface RateLimitOptions {
  action: string;
  identifier?: 'user' | 'ip' | 'both';
  skipStaff?: boolean;
  customKey?: (req: NextRequest) => string;
}

export async function rateLimitMiddleware(
  req: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return null;
  }

  try {
    const rateLimiter = getRateLimiter(options.action);
    let identifier = '';

    if (options.customKey) {
      identifier = options.customKey(req);
    } else {
      switch (options.identifier) {
        case 'user':
          identifier = await getUserIdentifier(req);
          break;
        case 'ip':
          identifier = getIPIdentifier(req);
          break;
        case 'both':
          const userId = await getUserIdentifier(req);
          const ipId = getIPIdentifier(req);
          identifier = userId ? `${userId}:${ipId}` : ipId;
          break;
        default:
          identifier = getIPIdentifier(req);
      }
    }

    if (options.skipStaff && identifier) {
      const isStaff = await checkIfStaff(req);
      if (isStaff) {
        return null;
      }
    }

    const result: RateLimitResult = await rateLimiter.checkLimit(identifier, options.action);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Slow down!',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimiter['config'].maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString()
          }
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimiter['config'].maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());

    return null;

  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    return null;
  }
}

async function getUserIdentifier(req: NextRequest): Promise<string> {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return '';

    const payload = tokenManager.verifyToken(token);
    return payload?.userId || '';
  } catch (error) {
    return '';
  }
}

function getIPIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

async function checkIfStaff(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;

    const payload = tokenManager.verifyToken(token);
    return !!(payload?.staffRank && payload.staffRank !== 'none');
  } catch (error) {
    return false;
  }
}

export async function rateLimitByUser(req: NextRequest, action: string, skipStaff = true): Promise<NextResponse | null> {
  return rateLimitMiddleware(req, {
    action,
    identifier: 'user',
    skipStaff
  });
}

export async function rateLimitByIP(req: NextRequest, action: string): Promise<NextResponse | null> {
  return rateLimitMiddleware(req, {
    action,
    identifier: 'ip'
  });
}

export async function rateLimitByBoth(req: NextRequest, action: string, skipStaff = true): Promise<NextResponse | null> {
  return rateLimitMiddleware(req, {
    action,
    identifier: 'both',
    skipStaff
  });
}

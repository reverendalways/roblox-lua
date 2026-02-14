import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getOrCreateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'csrfToken');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const token = req.cookies.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token.value, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = payload.userId;
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const csrfToken = getOrCreateCSRFToken(userId);

    return NextResponse.json({ 
      csrfToken,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    });

  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

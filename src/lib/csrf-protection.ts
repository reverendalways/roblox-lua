import { randomBytes, createHmac } from 'crypto';

export interface CSRFToken {
  token: string;
  expiresAt: number;
}

const csrfTokens = new Map<string, CSRFToken>();

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET;
if (!CSRF_SECRET) throw new Error('CSRF_SECRET or NEXTAUTH_SECRET environment variable is required');
const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000,
  SECRET: CSRF_SECRET
};

export function generateCSRFToken(userId: string): string {
  if (!userId) {
    throw new Error('User ID is required for CSRF token generation');
  }
  
  const token = randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString('hex');
  
  const hmac = createHmac('sha256', CSRF_CONFIG.SECRET);
  hmac.update(token + userId);
  const signature = hmac.digest('hex');
  
  const fullToken = `${token}.${signature}`;
  
  csrfTokens.set(fullToken, {
    token: fullToken,
    expiresAt: Date.now() + CSRF_CONFIG.TOKEN_EXPIRY
  });
  
  return fullToken;
}

export function validateCSRFToken(token: string, userId: string): boolean {
  if (!token || !userId) {
    return false;
  }
  
  const [tokenPart, signature] = token.split('.');
  if (!tokenPart || !signature) {
    return false;
  }
  
  const hmac = createHmac('sha256', CSRF_CONFIG.SECRET);
  hmac.update(tokenPart + userId);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return false;
  }
  
  const storedToken = csrfTokens.get(token);
  if (storedToken && Date.now() > storedToken.expiresAt) {
    csrfTokens.delete(token);
  }
  
  return true;
}

export function invalidateCSRFToken(token: string): void {
  csrfTokens.delete(token);
}

export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  for (const [token, tokenData] of csrfTokens.entries()) {
    if (now > tokenData.expiresAt) {
      csrfTokens.delete(token);
    }
  }
}

export function getOrCreateCSRFToken(userId: string): string {
  cleanupExpiredCSRFTokens();
  
  for (const [token, tokenData] of csrfTokens.entries()) {
    if (Date.now() <= tokenData.expiresAt) {
      const [tokenPart, signature] = token.split('.');
      if (tokenPart && signature) {
        const hmac = createHmac('sha256', CSRF_CONFIG.SECRET);
        hmac.update(tokenPart + userId);
        const expectedSignature = hmac.digest('hex');
        if (signature === expectedSignature) {
          return token;
        }
      }
    }
  }
  
  return generateCSRFToken(userId);
}

export function validateCSRFMiddleware(req: Request, userId: string): boolean {
  const csrfToken = req.headers.get('x-csrf-token') || 
                   req.headers.get('csrf-token') ||
                   (req as any).body?.csrfToken;
  
  if (!csrfToken) {
    return false;
  }
  
  return validateCSRFToken(csrfToken, userId);
}

export function generateFrontendCSRFToken(userId: string): { token: string; expiresAt: number } {
  const token = generateCSRFToken(userId);
  const tokenData = csrfTokens.get(token)!;
  
  return {
    token,
    expiresAt: tokenData.expiresAt
  };
}


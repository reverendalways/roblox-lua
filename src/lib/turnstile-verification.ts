import { NextRequest } from 'next/server';

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

if (!TURNSTILE_SECRET_KEY) {
  throw new Error('TURNSTILE_SECRET_KEY environment variable is required');
}

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export async function verifyTurnstileToken(
  token: string,
  remoteip?: string,
  expectedAction?: string
): Promise<TurnstileVerificationResult> {
  if (!token || typeof token !== 'string') {
    return {
      success: false,
      error: 'Turnstile token is required'
    };
  }

  try {
    const formData = new FormData();
    formData.append('secret', TURNSTILE_SECRET_KEY!);
    formData.append('response', token);
    
    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to verify Turnstile token'
      };
    }

    const result = await response.json();

    if (!result.success) {
      const errorCodes = result['error-codes'] || [];
      let errorMessage = 'Turnstile verification failed';
      
      if (errorCodes.includes('missing-input-secret')) {
        errorMessage = 'Turnstile secret key is missing';
      } else if (errorCodes.includes('invalid-input-secret')) {
        errorMessage = 'Turnstile secret key is invalid';
      } else if (errorCodes.includes('missing-input-response')) {
        errorMessage = 'Turnstile token is missing';
      } else if (errorCodes.includes('invalid-input-response')) {
        errorMessage = 'Turnstile token is invalid or expired';
      } else if (errorCodes.includes('bad-request')) {
        errorMessage = 'Invalid request to Turnstile';
      } else if (errorCodes.includes('timeout-or-duplicate')) {
        errorMessage = 'Turnstile token has expired or been used already';
      } else if (errorCodes.includes('internal-error')) {
        errorMessage = 'Turnstile service error';
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    if (expectedAction && result.action !== expectedAction) {
      return {
        success: false,
        error: 'Turnstile action mismatch'
      };
    }

    const expectedHostname = process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '') || 
                           process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '');
    
    if (expectedHostname && result.hostname !== expectedHostname) {
      return {
        success: false,
        error: 'Turnstile hostname mismatch'
      };
    }

    return {
      success: true,
      challenge_ts: result.challenge_ts,
      hostname: result.hostname,
      action: result.action,
      cdata: result.cdata
    };

  } catch (error) {
    console.error('Turnstile verification error:', error);
    return {
      success: false,
      error: 'Turnstile verification failed'
    };
  }
}

export async function verifyTurnstileMiddleware(
  req: NextRequest,
  expectedAction?: string
): Promise<TurnstileVerificationResult> {
  const body = await req.json();
  const token = body.turnstileToken;
  const clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';

  return await verifyTurnstileToken(token, clientIP, expectedAction);
}

export async function validateTurnstileFromBody(
  body: any,
  req: NextRequest
): Promise<TurnstileVerificationResult> {
  const token = body.turnstileToken;
  
  if (!token) {
    return {
      success: false,
      error: 'Turnstile token is required'
    };
  }

  const clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';

  return await verifyTurnstileToken(token, clientIP);
}

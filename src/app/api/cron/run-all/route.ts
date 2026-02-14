import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const results: Array<{
    job: string;
    status: string;
    statusCode?: number;
    result?: any;
    duration: number;
  }> = [];
  const startTime = Date.now();

  const cronJobs = [
    'update-multipliers',
    'update-leaderboard', 
    'update-user-stats',
    'auto-return',
    'process-timeouts',
    'bumpdecay',
    'decay',
    'promotion-decay',
    'promo-codes-cleanup'
  ];

  for (const job of cronJobs) {
    const response = await fetch(`${baseUrl}/api/cron/${job}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(25000)
    });

    const result = await response.json();
    results.push({
      job: job,
      status: response.ok ? 'success' : 'error',
      statusCode: response.status,
      result: result,
      duration: Date.now() - startTime
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  const response = {
    message: `Cron job execution completed`,
    summary: {
      totalJobs: results.length,
      successful: successCount,
      errors: errorCount,
      totalDuration: `${totalDuration}ms`,
      timestamp: new Date().toISOString()
    },
    results: results,
    schedule: {
      allJobs: 'Every minute'
    }
  };


  return NextResponse.json(response);
}

export async function GET(request: NextRequest) {
  return POST(request);
}

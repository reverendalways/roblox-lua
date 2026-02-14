import { NextRequest, NextResponse } from "next/server";
import { simpleCache } from "../../../../lib/simple-cache";

export async function GET(req: NextRequest) {
  try {
    const stats = simpleCache.getStats();
    
    return NextResponse.json({
      success: true,
      cache: {
        totalItems: stats.totalItems,
        activeItems: stats.activeItems,
        totalChangeEvents: stats.totalChangeEvents,
        oldestChangeEvent: stats.oldestChangeEvent,
        newestChangeEvent: stats.newestChangeEvent,
        uptime: Date.now() - stats.oldestChangeEvent,
        changeEventRate: stats.changeEventRate
      },
      performance: {
        cacheHitRate: stats.activeItems > 0 ? 'Active' : 'Empty',
        changeDetection: 'Enabled',
        smartRefresh: 'Active'
      }
    });
  } catch (error) {
    console.error('Simple cache stats error:', error);
    return NextResponse.json({ error: 'Failed to get cache stats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    
    switch (action) {
      case 'clear_all':
        simpleCache.clearAll();
        return NextResponse.json({ success: true, message: 'All cache cleared' });
        
      case 'clear_scripts':
        const cleared = simpleCache.clearByPattern('scripts');
        return NextResponse.json({ success: true, message: `${cleared} scripts cache items cleared` });
        
      case 'clear_search':
        const searchCleared = simpleCache.clearByPattern('search');
        return NextResponse.json({ success: true, message: `${searchCleared} search cache items cleared` });
        
      case 'reset_stats':
        return NextResponse.json({ success: true, message: 'Stats reset (not implemented yet)' });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Simple cache action error:', error);
    return NextResponse.json({ error: 'Failed to perform cache action' }, { status: 500 });
  }
}

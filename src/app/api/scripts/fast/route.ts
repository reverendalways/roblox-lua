import { NextRequest, NextResponse } from "next/server";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";
import { smartCache } from "../../../../lib/smart-cache";
import { rateLimitByIP } from "@/middleware/rate-limit";
import { DEMO_SCRIPTS } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const rateLimitResponse = await rateLimitByIP(request, 'scriptBrowse');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));
    const includePopular = searchParams.get('includePopular') === '1' || page === 0;
    const skip = page * limit;
    
    

    const cacheKey = `fast:scripts:v2:${page}:${limit}`;
    
    let newest: any[] = smartCache.get(cacheKey) as any[] || [];
    
    if (!newest || newest.length === 0) {
      let db;
      try {
        db = await getScriptsDatabase();
      } catch {
        db = null;
      }
      if (db) {
        try {
          newest = await db.collection('scripts')
            .find({}, { 
              projection: { 
                id: 1, title: 1, thumbnailUrl: 1, customThumbnail: 1, dbThumbnail: 1, databaseThumbnail: 1, 
                gameName: 1, views: 1, likes: 1, isUniversal: 1, price: 1, priceAmount: 1, 
                createdAt: 1, ownerId: 1, ownerUsername: 1, isVerified: 1, points: 1, 
                status: 1, lastActivity: 1, comments: 1, discordServer: 1, keySystemLink: 1
              } 
            })
            .sort({ lastActivity: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        } catch (error) {
          console.error('Fast scripts query error:', error);
          newest = [];
        }
        newest.forEach((script: any) => {
          script.commentCount = Array.isArray(script.comments) ? script.comments.length : 0;
          delete script.comments;
        });
      }
      if (!newest || newest.length === 0) {
        newest = DEMO_SCRIPTS.slice(skip, skip + limit).map(s => ({
          ...s,
          commentCount: (s as any).commentCount ?? 3,
          thumbnailUrl: s.thumbnailUrl || (s.isUniversal ? "/universal.png" : "/no-thumbnail.png"),
        }));
      }
      smartCache.set(cacheKey, newest, { 
        totalCount: newest.length, 
        lastModified: Date.now(),
        ttl: 120000
      });
    }

    let popular: any[] = [];
    if (includePopular) {
      const popularCacheKey = 'fast:scripts:popular:v2';
      popular = smartCache.get(popularCacheKey) as any[] || [];
      
      if (!popular || popular.length === 0) {
        let db;
        try {
          db = await getScriptsDatabase();
        } catch {
          db = null;
        }
        if (db) {
          try {
            popular = await db.collection('scripts')
              .find({}, { 
                projection: { 
                  id: 1, title: 1, thumbnailUrl: 1, customThumbnail: 1, dbThumbnail: 1, databaseThumbnail: 1, 
                  gameName: 1, views: 1, likes: 1, isUniversal: 1, price: 1, priceAmount: 1, 
                  createdAt: 1, ownerId: 1, ownerUsername: 1, isVerified: 1, points: 1, status: 1,
                  comments: 1, discordServer: 1, keySystemLink: 1
                } 
              })
              .sort({ points: -1, views: -1, likes: -1 })
              .limit(32)
              .toArray();
          } catch (error) {
            console.error('Popular scripts query error:', error);
            popular = [];
          }
          popular.forEach((script: any) => {
            script.commentCount = Array.isArray(script.comments) ? script.comments.length : 0;
            delete script.comments;
          });
        }
        if (!popular || popular.length === 0) {
          popular = [...DEMO_SCRIPTS].sort((a, b) => (b.points || 0) - (a.points || 0)).map(s => ({
            ...s,
            commentCount: (s as any).commentCount ?? 3,
            thumbnailUrl: s.thumbnailUrl || (s.isUniversal ? "/universal.png" : "/no-thumbnail.png"),
          }));
        }
        smartCache.set(popularCacheKey, popular, { 
          totalCount: popular.length, 
          lastModified: Date.now(),
          ttl: 300000
        });
      }
    }

    newest.forEach((script: any) => {
      script.thumbnailUrl = script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || (script.isUniversal ? "/universal.png" : "/no-thumbnail.png");
    });
    
    if (includePopular) {
      popular.forEach((script: any) => {
        script.thumbnailUrl = script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || (script.isUniversal ? "/universal.png" : "/no-thumbnail.png");
      });
    }

    const totalTime = Date.now() - startTime;
    
    
    return NextResponse.json({ 
      newest, 
      popular: includePopular ? popular : undefined,
      cached: !!newest && (includePopular ? !!popular : true),
      cacheType: 'smart-cache',
      performance: { totalTime }
    });
  } catch (err) {
    console.error('Fast scripts API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { mongoPool } from '@/lib/mongodb-pool';
import { getScriptsDatabase } from "@/lib/mongodb-optimized";
import { smartCache } from "../../../../lib/smart-cache";
import { rateLimitByIP } from "@/middleware/rate-limit";

interface SearchResult {
  scripts: any[];
  total: number;
  page: number;
  limit: number;
  isFallback?: boolean;
}

function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[${}()|\\]/g, '')
    .replace(/[.*+?^]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/<script/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 100);
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(request, 'scriptSearch');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || '';
    const query = sanitizeSearchInput(rawQuery);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const skip = page * limit;

    if (!query.trim()) {
      const cacheKey = `fast:popular:v2:${page}:${limit}`;
      let result: SearchResult | null = smartCache.get(cacheKey) as SearchResult | null;
      
      if (!result) {
        const db = await getScriptsDatabase();
        
        const scripts = await db.collection('scripts')
          .find({}, { 
            projection: {
              id: 1, title: 1, thumbnailUrl: 1, customThumbnail: 1, dbThumbnail: 1, databaseThumbnail: 1, gameName: 1, views: 1, likes: 1,
              isUniversal: 1, price: 1, priceAmount: 1, createdAt: 1, ownerId: 1,
              ownerUsername: 1, ownerVerified: 1, isVerified: 1, points: 1,
              discordServer: 1, keySystemLink: 1, status: 1, tags: 1, features: 1
            }
          })
          .sort({ points: -1, views: -1, createdAt: -1 })
          .limit(limit)
          .toArray();
        result = { scripts, total: scripts.length, page, limit, isFallback: false };
        smartCache.set(cacheKey, result, { totalCount: scripts.length, lastModified: Date.now() });
      }
      
      return NextResponse.json({
        scripts: result.scripts || [],
        total: result.total || 0,
        page: result.page || page,
        limit: result.limit || limit,
        isFallback: false,
        cached: true
      });
    }

    const commonSearches = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    const isCommonSearch = commonSearches.includes(query.toLowerCase());
    
    const cacheVersion = 'v2';
    const cacheKey = `fast:search:${cacheVersion}:${query.toLowerCase()}:${page}:${limit}`;
    
    let result: SearchResult | null = smartCache.get(cacheKey) as SearchResult | null;
    
    if (!result && query.length <= 2) {
      const broadCacheKey = `fast:search:${cacheVersion}:${query.toLowerCase()}:0:${limit}`;
      result = smartCache.get(broadCacheKey) as SearchResult | null;
    }
    
    if (!result) {
      const db = await getScriptsDatabase();
      
      try {
        let scripts: any[] = [];
        let total = 0;
        let isFallback = false;

        if (query.trim()) {
          const trimmedQuery = query.trim();
          const isNumeric = /^\d+$/.test(trimmedQuery);
          
          let searchQuery: any;
          
          if (isNumeric) {
            const numericId = parseInt(trimmedQuery, 10);
            if (isNaN(numericId) || numericId < 0 || numericId > 999999999) {
              scripts = [];
              total = 0;
            } else {
              searchQuery = {
                $or: [
                  { id: numericId.toString() },
                  { gameId: numericId.toString() }
                ]
              };
            }
          } else {
            const safeQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const words = safeQuery.split(/\s+/).filter(w => w.length > 0);
            
            if (safeQuery.toLowerCase() === 'universal') {
              searchQuery = {
                $or: [
                  { isUniversal: true },
                  { title: { $regex: 'universal', $options: 'i' } },
                  { gameName: { $regex: 'universal', $options: 'i' } },
                  { features: { $regex: 'universal', $options: 'i' } },
                  { tags: { $in: [new RegExp('universal', 'i')] } }
                ]
              };
            } else {
              searchQuery = {
                $or: [
                  { title: { $regex: `\\b${safeQuery}\\b`, $options: 'i' } },
                  { gameName: { $regex: `\\b${safeQuery}\\b`, $options: 'i' } },
                  { features: { $regex: `\\b${safeQuery}\\b`, $options: 'i' } },
                  { tags: { $in: [new RegExp(`\\b${safeQuery}\\b`, 'i')] } },
                  { title: { $regex: safeQuery, $options: 'i' } },
                  { gameName: { $regex: safeQuery, $options: 'i' } },
                  { features: { $regex: safeQuery, $options: 'i' } },
                  { tags: { $in: [new RegExp(safeQuery, 'i')] } },
                  ...words.map(word => [
                    { title: { $regex: `\\b${word}\\b`, $options: 'i' } },
                    { gameName: { $regex: `\\b${word}\\b`, $options: 'i' } },
                    { features: { $regex: `\\b${word}\\b`, $options: 'i' } },
                    { tags: { $in: [new RegExp(`\\b${word}\\b`, 'i')] } }
                  ]).flat(),
                  ...words.map(word => [
                    { title: { $regex: `^${word}`, $options: 'i' } },
                    { gameName: { $regex: `^${word}`, $options: 'i' } },
                    { features: { $regex: `^${word}`, $options: 'i' } },
                    { tags: { $in: [new RegExp(`^${word}`, 'i')] } }
                  ]).flat()
                ]
              };
            }
          }

          if (searchQuery) {
            scripts = await db.collection('scripts')
              .find(searchQuery, { 
                projection: {
                  id: 1, title: 1, thumbnailUrl: 1, customThumbnail: 1, dbThumbnail: 1, databaseThumbnail: 1, gameName: 1, views: 1, likes: 1,
                  isUniversal: 1, price: 1, priceAmount: 1, createdAt: 1, ownerId: 1,
                  ownerUsername: 1, ownerVerified: 1, isVerified: 1, points: 1,
                  discordServer: 1, keySystemLink: 1, status: 1, tags: 1, features: 1
                }
              })
              .sort({ points: -1, views: -1, createdAt: -1 })
              .skip(skip)
              .limit(limit)
              .toArray();
          }
            
          total = scripts.length;
        }

        result = { scripts, total, page, limit, isFallback } as SearchResult;
        
        const cacheTTL = isCommonSearch ? 300000 : 60000;
        smartCache.set(cacheKey, result, {
          totalCount: total,
          lastModified: Date.now(),
          query: query.toLowerCase(),
          isFallback,
          ttl: cacheTTL
        });
      } catch (error) {
        console.error('Search error:', error);
        result = { scripts: [], total: 0, page, limit, isFallback: false } as SearchResult;
      }
    }

    if (result.scripts) {
      result.scripts.forEach((script: any) => {
        const originalThumbnail = script.thumbnailUrl;
        script.thumbnailUrl = script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || (script.isUniversal ? "/universal.png" : "/no-thumbnail.png");
        
        script.commentCount = Array.isArray(script.comments) ? script.comments.length : 0;
        delete script.comments;
        
        if (script.customThumbnail && script.thumbnailUrl !== originalThumbnail) {
          console.log(`Script ${script.id} using custom thumbnail: ${script.customThumbnail.substring(0, 50)}...`);
        }
      });
    }

    return NextResponse.json({
      scripts: result.scripts || [],
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit,
      isFallback: result.isFallback || false,
      cached: !!result.scripts && result.scripts.length > 0
    });
  } catch (err) {
    console.error('Fast search API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

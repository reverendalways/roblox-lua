import { NextRequest, NextResponse } from "next/server";
import { mongoPool } from '@/lib/mongodb-pool';
import { getScriptsDatabase } from "@/lib/mongodb-optimized";
import { smartCache } from "@/lib/smart-cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { username } = await params;
    
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const cacheKey = `user-scripts:v2:${username.toLowerCase()}`;
    let cachedResult = smartCache.get(cacheKey);
    
    if (cachedResult) {
      const response = NextResponse.json(cachedResult);
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-Cached', 'true');
      return response;
    }

    const db = await getScriptsDatabase();

    const scripts = await db.collection('scripts')
      .find({
        $or: [
          { ownerId: username },
          { ownerUsername: username }
        ]
      }, {
        projection: {
          _id: 1,
          id: 1,
          title: 1,
          gameName: 1,
          isUniversal: 1,
          ownerId: 1,
          ownerUsername: 1,
          price: 1,
          priceAmount: 1,
          thumbnailUrl: 1,
          customThumbnail: 1,
          dbThumbnail: 1,
          databaseThumbnail: 1,
          views: 1,
          likes: 1,
          points: 1,
          tags: 1,
          status: 1,
          keySystemLink: 1,
          discordServer: 1,
          isVerified: 1,
          ownerVerified: 1,
          createdAt: 1,
          comments: 1
        }
      })
      .sort({ createdAt: -1 })
      .toArray();



    const enrichedScripts = scripts.map((script: any) => ({
      id: script.id || script._id,
      _id: script._id,
      title: script.title || '',
      gameName: script.gameName || 'Unknown Game',
      isUniversal: !!script.isUniversal,
      ownerId: script.ownerId || script.ownerUsername || username,
      ownerUsername: script.ownerUsername || script.ownerId || username,
      price: script.price || 'Free',
      priceAmount: script.priceAmount || 0,
      thumbnailUrl: script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || (script.isUniversal ? "/universal.png" : "/no-thumbnail.png"),
      views: script.views || 0,
      likes: script.likes || 0,
      points: script.points || 0,
      tags: script.tags || [],
      status: script.status || 'Functional',
      keySystemLink: script.keySystemLink || '',
      discordServer: script.discordServer || '',
      isVerified: script.isVerified || script.ownerVerified || false,
      createdAt: script.createdAt || new Date(),
      commentCount: Array.isArray(script.comments) ? script.comments.length : 0
    }));

    const result = {
      scripts: enrichedScripts,
      total: enrichedScripts.length
    };
    smartCache.set(cacheKey, result, { 
      totalCount: enrichedScripts.length, 
      lastModified: Date.now(),
      ttl: 120000
    });

    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cached', 'false');
    
    return response;

  } catch (error) {
    console.error('Error fetching user scripts:', error);
    return NextResponse.json({ error: "Failed to fetch user scripts" }, { status: 500 });
  }
}

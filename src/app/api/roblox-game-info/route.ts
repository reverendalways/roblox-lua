import { NextRequest, NextResponse } from "next/server";

import { mongoPool } from '@/lib/mongodb-pool';
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    if (!placeId || !/^[0-9]+$/.test(placeId)) {
        return NextResponse.json({ error: 'Invalid or missing placeId' }, { status: 400 });
    }
    let gameName = 'Unknown Game';
    let thumbnailUrl = '/no-thumbnail.png';
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (universeRes.ok) {
                const universeData = await universeRes.json();
                if (universeData && universeData.universeId) {
                    const universeId = universeData.universeId;
                    
                    const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (gameRes.ok) {
                        const gameData = await gameRes.json();
                        if (gameData && gameData.data && gameData.data[0] && gameData.data[0].name) {
                            gameName = gameData.data[0].name;
                        }
                    }
                    
                    const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`, {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (thumbRes.ok) {
                        const thumbData = await thumbRes.json();
                        if (thumbData && thumbData.data && thumbData.data[0] && thumbData.data[0].imageUrl && thumbData.data[0].state === 'Completed') {
                            thumbnailUrl = thumbData.data[0].imageUrl;
                        }
                    }
                }
            }
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (e) {
        console.error('Roblox API error:', e instanceof Error ? e.message : 'Unknown error');
    }
    return NextResponse.json({ gameName, thumbnailUrl });
}

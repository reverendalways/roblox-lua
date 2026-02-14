import { NextRequest, NextResponse } from "next/server";
import { getScriptsDatabase } from "@/lib/mongodb-optimized";

export async function POST(req: NextRequest) {
  try {
    const { scriptId, gameId } = await req.json();
    
    if (!scriptId || !gameId) {
      return NextResponse.json({ error: "Missing scriptId or gameId" }, { status: 400 });
    }

    const db = await getScriptsDatabase();
    
    let gameName = "Unknown Game";
    let thumbnailUrl = "/no-thumbnail.png";
    
    try {
      const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${gameId}/universe`);
      if (universeRes.ok) {
        const universeData = await universeRes.json();
        const universeId = universeData.universeId;
        
        if (universeId) {
          const [gameInfoRes, iconRes] = await Promise.all([
            fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`),
            fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`)
          ]);
          
          if (gameInfoRes.ok) {
            const gameInfoData = await gameInfoRes.json();
            if (gameInfoData.data && gameInfoData.data[0] && gameInfoData.data[0].name) {
              gameName = gameInfoData.data[0].name;
            }
          }
          
          if (iconRes.ok) {
            const iconData = await iconRes.json();
            if (iconData.data && iconData.data[0] && iconData.data[0].imageUrl) {
              thumbnailUrl = iconData.data[0].imageUrl;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching game info:', error);
    }
    
    const updateResult = await db.collection('scripts').updateOne(
      { id: scriptId },
      { 
        $set: { 
          gameName: gameName,
          thumbnailUrl: thumbnailUrl,
          updatedAt: new Date().toISOString()
        } 
      }
    );
    
    if (updateResult.modifiedCount === 0) {
      console.error(`Failed to update game info for script ${scriptId} - script not found`);
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    
    console.log(`Successfully updated game info for script ${scriptId}: ${gameName}`);
    
    return NextResponse.json({ 
      success: true, 
      gameName, 
      thumbnailUrl 
    });
    
  } catch (error) {
    console.error('Update game info error:', error);
    return NextResponse.json({ error: "Failed to update game info" }, { status: 500 });
  }
}

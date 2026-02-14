import { NextRequest, NextResponse } from "next/server";
import { simpleCache } from "@/lib/simple-cache";
import { getUsersDatabase, getScriptsDatabase } from "@/lib/mongodb-optimized";
import { DEMO_PROFILE, DEMO_SCRIPTS } from "@/lib/demo-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    const cacheKey = `profile:${username}`;
    let profileData = simpleCache.get(cacheKey);
    
    const forceRefresh = profileData && (Date.now() - profileData.cacheTimestamp) > 60 * 1000;
    
    if (!profileData || forceRefresh) {
      let userDb;
      let scriptsDb;
      try {
        userDb = await getUsersDatabase();
        scriptsDb = await getScriptsDatabase();
      } catch {
        userDb = null;
        scriptsDb = null;
      }

      const isDemoUser = ['demo_creator', 'script_master', 'roblox_dev'].includes(username);
      if ((!userDb || !scriptsDb) && isDemoUser) {
        const demo = {
          user: {
            username: DEMO_PROFILE.username,
            displayName: DEMO_PROFILE.username,
            avatar: DEMO_PROFILE.accountthumbnail || '',
            verified: DEMO_PROFILE.verified || false,
            joinDate: DEMO_PROFILE.createdAt,
            lastSeen: new Date(),
            isOnline: true,
            onlineStatus: 'Online',
            bio: DEMO_PROFILE.bio || '',
            socialLinks: {}
          },
          stats: {
            totalScripts: DEMO_PROFILE.totalScripts || 0,
            totalViews: DEMO_PROFILE.totalViews || 0,
            totalLikes: 0,
            rank: 0
          },
          recentScripts: (DEMO_PROFILE.scripts || DEMO_SCRIPTS.slice(0, 2)).map((s: any) => ({
            id: s.id,
            title: s.title,
            gameName: s.gameName,
            views: s.views,
            likes: s.likes,
            createdAt: s.createdAt,
            thumbnailUrl: s.thumbnailUrl || '/no-thumbnail.png'
          })),
          cacheTimestamp: Date.now()
        };
        return NextResponse.json({ ...demo, cached: false });
      }
      if (!userDb || !scriptsDb) {
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
      }

      const user = await userDb.collection("ScriptVoid").findOne(
        { username: username },
        { projection: { password: 0, email: 0, verificationCode: 0, resetCode: 0 } }
      );

      if (!user && isDemoUser) {
        const demo = {
          user: {
            username: DEMO_PROFILE.username,
            displayName: DEMO_PROFILE.username,
            avatar: DEMO_PROFILE.accountthumbnail || '',
            verified: DEMO_PROFILE.verified || false,
            joinDate: DEMO_PROFILE.createdAt,
            lastSeen: new Date(),
            isOnline: true,
            onlineStatus: 'Online',
            bio: DEMO_PROFILE.bio || '',
            socialLinks: {}
          },
          stats: {
            totalScripts: DEMO_PROFILE.totalScripts || 0,
            totalViews: DEMO_PROFILE.totalViews || 0,
            totalLikes: 0,
            rank: 0
          },
          recentScripts: (DEMO_PROFILE.scripts || DEMO_SCRIPTS.slice(0, 2)).map((s: any) => ({
            id: s.id,
            title: s.title,
            gameName: s.gameName,
            views: s.views,
            likes: s.likes,
            createdAt: s.createdAt,
            thumbnailUrl: s.thumbnailUrl || '/no-thumbnail.png'
          })),
          cacheTimestamp: Date.now()
        };
        return NextResponse.json({ ...demo, cached: false });
      }
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const scripts = await scriptsDb.collection("scripts")
        .find({ ownerUsername: username })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      const totalScripts = await scriptsDb.collection("scripts").countDocuments({ ownerUsername: username });
      const totalViews = await scriptsDb.collection("scripts").aggregate([
        { $match: { ownerUsername: username } },
        { $group: { _id: null, total: { $sum: "$views" } } }
      ]).toArray();
      const totalLikes = await scriptsDb.collection("scripts").aggregate([
        { $match: { ownerUsername: username } },
        { $group: { _id: null, total: { $sum: "$likes" } } }
      ]).toArray();

      const now = new Date();
      
      let lastSeen = user.lastSeen;
      if (!lastSeen) {
        lastSeen = user.lastOnline || user.createdAt;
        
        if (!user.lastSeen) {
          try {
            await userDb.collection("users").updateOne(
              { _id: user._id },
              { $set: { lastSeen: now } }
            );
            
            lastSeen = now;
          } catch (error) {
            
            lastSeen = user.createdAt;
          }
        }
        
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: user.username, 
            userId: user._id.toString(),
            action: 'profile_viewed' 
          })
        }).catch(() => {});
      }
      
      const timeDiff = now.getTime() - lastSeen.getTime();
      
      
      
      const isOnline = timeDiff < 60 * 1000;
      
      let onlineStatus = 'Online';
      if (timeDiff < 60 * 1000) {
        onlineStatus = 'Online';
      } else if (timeDiff < 60 * 60 * 1000) {
        const minutes = Math.floor(timeDiff / (60 * 1000));
        onlineStatus = `${minutes}m ago`;
      } else if (timeDiff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(timeDiff / (60 * 60 * 1000));
        onlineStatus = `${hours}h ago`;
      } else {
        const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
        onlineStatus = `${days}d ago`;
      }
      
      profileData = {
        user: {
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar,
          verified: user.verified || false,
          joinDate: user.createdAt,
          lastSeen: lastSeen,
          isOnline: isOnline,
          onlineStatus: onlineStatus,
          bio: user.bio || "",
          socialLinks: user.socialLinks || {}
        },
        stats: {
          totalScripts,
          totalViews: totalViews[0]?.total || 0,
          totalLikes: totalLikes[0]?.total || 0,
          rank: 0
        },
        recentScripts: scripts.map(script => ({
          id: script.id,
          title: script.title,
          gameName: script.gameName,
          views: script.views,
          likes: script.likes,
          createdAt: script.createdAt,
          thumbnailUrl: script.thumbnailUrl
        }))
      };

      profileData.cacheTimestamp = Date.now();
      
      simpleCache.set(cacheKey, profileData, 2 * 60 * 1000);
      
      
    } else {
      
    }

    return NextResponse.json({
      ...profileData,
      cached: !!profileData,
      cacheType: 'simple-global',
      responseTime: 'instant'
    });

  } catch (error) {
    console.error("Profile API error:", error);
    const { username } = await params;
    const isDemoUser = ['demo_creator', 'script_master', 'roblox_dev'].includes(username);
    if (isDemoUser) {
      const demo = {
        user: {
          username: DEMO_PROFILE.username,
          displayName: DEMO_PROFILE.username,
          avatar: DEMO_PROFILE.accountthumbnail || '',
          verified: DEMO_PROFILE.verified || false,
          joinDate: DEMO_PROFILE.createdAt,
          lastSeen: new Date(),
          isOnline: true,
          onlineStatus: 'Online',
          bio: DEMO_PROFILE.bio || '',
          socialLinks: {}
        },
        stats: {
          totalScripts: DEMO_PROFILE.totalScripts || 0,
          totalViews: DEMO_PROFILE.totalViews || 0,
          totalLikes: 0,
          rank: 0
        },
        recentScripts: (DEMO_PROFILE.scripts || DEMO_SCRIPTS.slice(0, 2)).map((s: any) => ({
          id: s.id,
          title: s.title,
          gameName: s.gameName,
          views: s.views,
          likes: s.likes,
          createdAt: s.createdAt,
          thumbnailUrl: s.thumbnailUrl || '/no-thumbnail.png'
        })),
        cacheTimestamp: Date.now()
      };
      return NextResponse.json({ ...demo, cached: false });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
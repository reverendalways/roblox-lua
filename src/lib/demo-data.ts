const now = new Date().toISOString();

export const DEMO_SCRIPTS = [
  { id: "demo1", _id: "demo1", title: "Demo ESP Script", ownerId: "u1", ownerUsername: "demo_creator", gameName: "Arsenal", isUniversal: false, price: "Free", thumbnailUrl: "/no-thumbnail.png", customThumbnail: "", views: 1200, likes: 45, commentCount: 3, createdAt: now, keySystemLink: "", discordServer: "", isVerified: true, verified: true, points: 100, tags: ["esp", "arsenal"], description: "Sample script for portfolio demo.", features: "ESP, highlights.", status: "Functional", lastActivity: now },
  { id: "demo2", _id: "demo2", title: "Universal Aimbot", ownerId: "u1", ownerUsername: "demo_creator", gameName: "Multiple", isUniversal: true, price: "Free", thumbnailUrl: "/universal.png", customThumbnail: "", views: 890, likes: 32, commentCount: 1, createdAt: now, keySystemLink: "", discordServer: "", isVerified: false, verified: false, points: 80, tags: ["aimbot", "universal"], description: "Demo universal script.", features: "Aimbot for multiple games.", status: "Functional", lastActivity: now },
  { id: "demo3", _id: "demo3", title: "Speed Hack", ownerId: "u2", ownerUsername: "script_master", gameName: "Brookhaven", isUniversal: false, price: "Paid", priceAmount: 100, thumbnailUrl: "/no-thumbnail.png", customThumbnail: "", views: 2100, likes: 120, commentCount: 8, createdAt: now, keySystemLink: "", discordServer: "", isVerified: true, verified: true, points: 200, tags: ["speed"], description: "Paid script example.", features: "Speed, fly.", status: "Functional", lastActivity: now },
];

export const DEMO_LEADERS = [
  { username: "demo_creator", accountthumbnail: "", avatar: "", verified: true, totalViews: 15000, totalLikes: 800, totalScripts: 12, totalPoints: 2400, leaderboardPosition: 1, position: 1 },
  { username: "script_master", accountthumbnail: "", avatar: "", verified: true, totalViews: 9200, totalLikes: 450, totalScripts: 8, totalPoints: 1800, leaderboardPosition: 2, position: 2 },
  { username: "roblox_dev", accountthumbnail: "", avatar: "", verified: false, totalViews: 5400, totalLikes: 200, totalScripts: 5, totalPoints: 900, leaderboardPosition: 3, position: 3 },
];

export const DEMO_COMMENTS = [
  { id: "c1", scriptId: "demo1", userId: "u2", username: "script_master", userAvatar: "", content: "Works great, thanks for sharing!", createdAt: now, verified: true, likes: 5 },
  { id: "c2", scriptId: "demo1", userId: "u3", username: "roblox_dev", userAvatar: "", content: "Clean code. Easy to customize.", createdAt: now, verified: false, likes: 2 },
  { id: "c3", scriptId: "demo1", userId: "u1", username: "demo_creator", userAvatar: "", content: "Glad you like it. More scripts coming soon.", createdAt: now, verified: true, likes: 0 },
];

export function getDemoScriptById(id: string) {
  const script = DEMO_SCRIPTS.find(s => s.id === id || (s as any)._id === id);
  if (!script) return null;
  return {
    ...script,
    comments: DEMO_COMMENTS.filter(c => c.scriptId === id),
    likes: script.likes,
    views: script.views,
    isBumped: true,
    bumpExpire: new Date(Date.now() + 86400000).toISOString(),
    promotionActive: false,
    isOrphaned: false,
    ownerVerified: script.verified,
    gameId: "5041144419",
    gameTitle: script.gameName,
  };
}

export const DEMO_PROFILE = {
  username: "demo_creator",
  accountthumbnail: "",
  bio: "Demo creator for ScriptVoid portfolio.",
  verified: true,
  totalViews: 15000,
  totalScripts: 12,
  totalPoints: 2400,
  createdAt: now,
  scripts: DEMO_SCRIPTS.slice(0, 2),
};

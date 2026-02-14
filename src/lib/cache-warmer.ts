import { getScriptsDatabase } from './mongodb-optimized';

class CacheWarmer {
  private static instance: CacheWarmer;
  private isWarmed = false;
  private warmingPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  public async warmCache(): Promise<void> {
    if (this.isWarmed || this.warmingPromise) {
      return this.warmingPromise || Promise.resolve();
    }

    this.warmingPromise = this.performWarmup();
    return this.warmingPromise;
  }

  private async performWarmup(): Promise<void> {
    try {
      
      const startTime = Date.now();

      const db = await getScriptsDatabase();
      
      const popularScripts = await db.collection('scripts')
        .find({}, { 
          projection: { 
            id: 1, title: 1, thumbnailUrl: 1, gameName: 1, views: 1, 
            likes: 1, isUniversal: 1, price: 1, priceAmount: 1, createdAt: 1, 
            ownerId: 1, ownerUsername: 1, ownerVerified: 1, isVerified: 1, 
            points: 1, status: 1, comments: 1, tags: 1, features: 1 
          } 
        })
        .sort({ views: -1, likes: -1 })
        .limit(32)
        .toArray();

      const newestScripts = await db.collection('scripts')
        .find({}, { 
          projection: { 
            id: 1, title: 1, thumbnailUrl: 1, gameName: 1, views: 1, 
            likes: 1, isUniversal: 1, price: 1, priceAmount: 1, createdAt: 1, 
            ownerId: 1, ownerUsername: 1, ownerVerified: 1, isVerified: 1, 
            points: 1, discordServer: 1, keySystemLink: 1, status: 1, 
            comments: 1, tags: 1, features: 1 
          } 
        })
        .sort({ createdAt: -1 })
        .limit(16)
        .toArray();

      (global as any).__CACHE_WARMER__ = {
        popular: popularScripts,
        newest: newestScripts,
        warmedAt: Date.now()
      };

      const warmupTime = Date.now() - startTime;
      
      this.isWarmed = true;
      
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
      this.isWarmed = false;
    }
  }

  public getWarmedData(type: 'popular' | 'newest'): any[] | null {
    const warmed = (global as any).__CACHE_WARMER__;
    if (warmed && Date.now() - warmed.warmedAt < 300000) {
      return warmed[type] || null;
    }
    return null;
  }

  public isCacheWarmed(): boolean {
    return this.isWarmed;
  }

  public async reWarmCache(): Promise<void> {
    this.isWarmed = false;
    this.warmingPromise = null;
    await this.warmCache();
  }
}

export const cacheWarmer = CacheWarmer.getInstance();

if (typeof window === 'undefined') {
  cacheWarmer.warmCache().catch(console.error);
}

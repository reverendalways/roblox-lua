class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private changeEvents: Array<{ type: string; id: string; timestamp: number; data?: any }> = [];
  private maxSize = 1000;
  private defaultTTL = 5 * 60 * 1000;

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cleanup();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    if (this.cache.size > this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  addChange(type: string, id: string, data?: any): void {
    this.changeEvents.push({
      type,
      id,
      timestamp: Date.now(),
      data
    });

    if (this.changeEvents.length > 100) {
      this.changeEvents = this.changeEvents.slice(-100);
    }
  }

  getStats() {
    const now = Date.now();
    const activeItems = Array.from(this.cache.values()).filter(
      item => now - item.timestamp <= item.ttl
    ).length;

    return {
      totalItems: this.cache.size,
      activeItems,
      totalChangeEvents: this.changeEvents.length,
      oldestChangeEvent: this.changeEvents[0]?.timestamp || 0,
      newestChangeEvent: this.changeEvents[this.changeEvents.length - 1]?.timestamp || 0,
      uptime: now,
      changeEventRate: this.changeEvents.length > 0 ? 
        Math.round(this.changeEvents.length / ((now - (this.changeEvents[0]?.timestamp || now)) / 1000)) : 0
    };
  }

  clearByPattern(pattern: string): number {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  clearAll(): void {
    this.cache.clear();
    this.changeEvents = [];
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  hasRelevantChanges(key: string): boolean {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    return this.changeEvents.some(event => {
      if (event.timestamp < fiveMinutesAgo) return false;
      
      if (key.includes('scripts') && event.type.includes('script')) return true;
      if (key.includes('profile') && event.type.includes('user')) return true;
      if (key.includes('leaderboard') && event.type.includes('user')) return true;
      
      return false;
    });
  }

  updateIncrementally(key: string): any | null {
    const cached = this.get(key);
    if (!cached) return null;

    if (!this.hasRelevantChanges(key)) {
      return cached;
    }

    
    return cached;
  }
}

const globalCache = new SimpleCache();

export const simpleCache = globalCache;

export const addScriptChange = (scriptId: string, type: 'created' | 'updated' | 'deleted', data?: any) => {
  globalCache.addChange(`script_${type}`, scriptId, data);
};

export const addUserChange = (username: string, type: 'updated' | 'verification_changed', data?: any) => {
  globalCache.addChange(`user_${type}`, username, data);
};

export const clearScriptsCache = () => {
  return globalCache.clearByPattern('scripts');
};

export const clearUserCache = (username: string) => {
  return globalCache.clearByPattern(`user_${username}`);
};

export const clearProfileCache = (username: string) => {
  return globalCache.clearByPattern(`profile:${username}`);
};

export const clearLeaderboardCache = () => {
  return globalCache.clearByPattern('leaderboard');
};

import { ObjectId } from 'mongodb';

export interface CacheItem<T> {
  data: T;
  lastUpdated: number;
  version: string;
  metadata: {
    totalCount?: number;
    lastModified?: number;
    checksum?: string;
  };
}

export interface ChangeEvent {
  type: 'script_created' | 'script_updated' | 'script_deleted' | 'user_updated' | 'verification_changed';
  scriptId?: string;
  userId?: string;
  username?: string;
  timestamp: number;
  data?: any;
}

export class SmartCache {
  private cache = new Map<string, CacheItem<any>>();
  private changeEvents: ChangeEvent[] = [];
  private maxChangeEvents = 1000;
  private maxCacheSize = 100;

  private generateHash(data: any): string {
    if (!data) return 'empty';
    
    try {
      const str = JSON.stringify(data);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    } catch {
      return Date.now().toString(36);
    }
  }

  private hasDataChanged(key: string, newData: any): boolean {
    const cached = this.cache.get(key);
    if (!cached) return true;
    
    const newHash = this.generateHash(newData);
    return cached.version !== newHash;
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const relevantChanges = this.getRelevantChanges(key);
    if (relevantChanges.length > 0) {
      return this.updateCacheIncrementally(key, relevantChanges);
    }

    return cached.data;
  }

  private updateCacheIncrementally<T>(key: string, changes: ChangeEvent[]): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    

    let updatedData = JSON.parse(JSON.stringify(cached.data));

    for (const change of changes) {
      if (change.type === 'script_created') {
        updatedData = this.addNewScriptToCache(updatedData, change);
      } else if (change.type === 'script_updated') {
        updatedData = this.updateScriptInCache(updatedData, change);
      } else if (change.type === 'script_deleted') {
        updatedData = this.removeScriptFromCache(updatedData, change);
      } else if (change.type === 'user_updated' || change.type === 'verification_changed') {
        updatedData = this.updateUserRelatedCache(updatedData, change);
      }
    }

    this.set(key, updatedData, cached.metadata);
    
    this.clearProcessedChanges(changes);
    
    return updatedData;
  }

  private addNewScriptToCache(cachedData: any, change: ChangeEvent): any {
    if (cachedData.newest && Array.isArray(cachedData.newest)) {
      const newScript = {
        id: change.scriptId,
        title: change.data?.title || 'New Script',
        ownerUsername: change.data?.ownerUsername || 'Unknown',
        createdAt: change.data?.createdAt || new Date().toISOString(),
        views: 0,
        likes: 0,
        isUniversal: false,
        price: 'Free',
        status: 'Functional',
        thumbnailUrl: '',
        gameName: 'Unknown Game'
      };
      
      cachedData.newest.unshift(newScript);
      
      if (cachedData.newest.length > 16) {
        cachedData.newest = cachedData.newest.slice(0, 16);
      }
      
      
    }
    
    if (cachedData.popular && Array.isArray(cachedData.popular)) {
      const newScript = {
        id: change.scriptId,
        title: change.data?.title || 'New Script',
        ownerUsername: change.data?.ownerUsername || 'Unknown',
        createdAt: change.data?.createdAt || new Date().toISOString(),
        views: 0,
        likes: 0,
        isUniversal: false,
        price: 'Free',
        status: 'Functional',
        thumbnailUrl: '',
        gameName: 'Unknown Game'
      };
      
      cachedData.popular.unshift(newScript);
      if (cachedData.popular.length > 32) {
        cachedData.popular = cachedData.popular.slice(0, 32);
      }
    }
    
    return cachedData;
  }

  private updateScriptInCache(cachedData: any, change: ChangeEvent): any {
    if (cachedData.newest && Array.isArray(cachedData.newest)) {
      const scriptIndex = cachedData.newest.findIndex((s: any) => s.id === change.scriptId);
      if (scriptIndex !== -1) {
        cachedData.newest[scriptIndex] = {
          ...cachedData.newest[scriptIndex],
          ...change.data,
          updatedAt: new Date().toISOString()
        };
        
      }
    }
    
    if (cachedData.popular && Array.isArray(cachedData.popular)) {
      const scriptIndex = cachedData.popular.findIndex((s: any) => s.id === change.scriptId);
      if (scriptIndex !== -1) {
        cachedData.popular[scriptIndex] = {
          ...cachedData.popular[scriptIndex],
          ...change.data,
          updatedAt: new Date().toISOString()
        };
      }
    }
    
    return cachedData;
  }

  private removeScriptFromCache(cachedData: any, change: ChangeEvent): any {
    if (cachedData.newest && Array.isArray(cachedData.newest)) {
      cachedData.newest = cachedData.newest.filter((s: any) => s.id !== change.scriptId);
      
    }
    
    if (cachedData.popular && Array.isArray(cachedData.popular)) {
      cachedData.popular = cachedData.popular.filter((s: any) => s.id !== change.scriptId);
    }
    
    return cachedData;
  }

  private updateUserRelatedCache(cachedData: any, change: ChangeEvent): any {
    if (cachedData.newest && Array.isArray(cachedData.newest)) {
      cachedData.newest.forEach((script: any) => {
        if (script.ownerUsername === change.username) {
          if (change.type === 'verification_changed') {
            script.ownerVerified = change.data?.verified || false;
            script.isVerified = change.data?.verified || false;
          }
        }
      });
    }
    
    if (cachedData.popular && Array.isArray(cachedData.popular)) {
      cachedData.popular.forEach((script: any) => {
        if (script.ownerUsername === change.username) {
          if (change.type === 'verification_changed') {
            script.ownerVerified = change.data?.verified || false;
            script.isVerified = change.data?.verified || false;
          }
        }
      });
    }
    
    return cachedData;
  }

  private clearProcessedChanges(processedChanges: ChangeEvent[]): void {
    const processedIds = new Set(processedChanges.map(c => `${c.type}_${c.scriptId || c.username}_${c.timestamp}`));
    this.changeEvents = this.changeEvents.filter(event => 
      !processedIds.has(`${event.type}_${event.scriptId || event.username}_${event.timestamp}`)
    );
  }

  set<T>(key: string, data: T, metadata?: any): void {
    const version = this.generateHash(data);
    const lastUpdated = Date.now();
    
    this.cache.set(key, {
      data,
      lastUpdated,
      version,
      metadata: metadata || {}
    });

    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  updateIncrementally<T>(key: string, updates: Partial<T>): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    try {
      const updatedData = { ...cached.data, ...updates };
      const newVersion = this.generateHash(updatedData);
      
      if (newVersion !== cached.version) {
        this.set(key, updatedData, cached.metadata);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  addChangeEvent(event: ChangeEvent): void {
    const fixedEvent = {
      ...event,
      timestamp: Date.now()
    };
    
    this.changeEvents.unshift(fixedEvent);
    
    if (this.changeEvents.length > this.maxChangeEvents) {
      this.changeEvents = this.changeEvents.slice(0, this.maxChangeEvents);
    }
  }

  private getRelevantChanges(key: string): ChangeEvent[] {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    return this.changeEvents.filter(event => {
      if (event.timestamp < fiveMinutesAgo) return false;
      
      if (key.includes('scripts') && (event.type.includes('script') || event.type.includes('user'))) {
        return true;
      }
      
      if (key.includes('search') && event.type.includes('script')) {
        return true;
      }
      
      return false;
    });
  }

  clearRelevantCache(events: ChangeEvent[]): void {
    const keysToClear: string[] = [];
    
    for (const [key] of this.cache) {
      for (const event of events) {
        if (this.shouldClearCache(key, event)) {
          keysToClear.push(key);
          break;
        }
      }
    }
    
    keysToClear.forEach(key => this.cache.delete(key));
  }

  private shouldClearCache(key: string, event: ChangeEvent): boolean {
    if (event.type.includes('script')) {
      if (key.includes('scripts') || key.includes('search')) {
        return true;
      }
    }
    
    if (event.type.includes('user') || event.type.includes('verification')) {
      if (key.includes('scripts') && event.username) {
        return true;
      }
    }
    
    return false;
  }

  async smartRefresh<T>(
    key: string, 
    fetchFunction: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const relevantChanges = this.getRelevantChanges(key);
    
    if (relevantChanges.length === 0) {
      const cached = this.get<T>(key);
      if (cached) return cached;
    }
    
    const freshData = await fetchFunction();
    this.set(key, freshData, metadata);
    
    return freshData;
  }

  getStats() {
    const now = Date.now();
    return {
      totalItems: this.cache.size,
      totalChangeEvents: this.changeEvents.length,
      oldestChangeEvent: this.changeEvents[this.changeEvents.length - 1]?.timestamp || 0,
      newestChangeEvent: this.changeEvents[0]?.timestamp || 0,
      uptime: now,
      changeEventRate: this.changeEvents.length > 0 ? 
        Math.round(this.changeEvents.length / ((now - (this.changeEvents[this.changeEvents.length - 1]?.timestamp || now)) / 1000)) : 0
    };
  }

  clearAll(): void {
    this.cache.clear();
    this.changeEvents = [];
  }

  clearByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const smartCache = new SmartCache();

export const addScriptChange = (scriptId: string, type: 'created' | 'updated' | 'deleted', data?: any) => {
  smartCache.addChangeEvent({
    type: `script_${type}` as any,
    scriptId,
    timestamp: Date.now(),
    data
  });
};

export const addUserChange = (username: string, type: 'updated' | 'verification_changed', data?: any) => {
  smartCache.addChangeEvent({
    type: type === 'verification_changed' ? 'verification_changed' : 'user_updated',
    username,
    timestamp: Date.now(),
    data
  });
};

export const clearScriptsCache = () => {
  smartCache.clearByPattern('scripts');
  smartCache.clearByPattern('search');
};

export const clearUserCache = (username: string) => {
  smartCache.clearByPattern(`user_${username}`);
  smartCache.clearByPattern('profile');
};

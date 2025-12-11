
// Wrapper for storage to support both Web (localStorage) and potentially React Native (AsyncStorage)
// For this implementation, we focus on safe synchronous usage for Web/PWA compatibility 
// but structure it to be async-ready if migrated to pure React Native later.

/**
 * Interface for Cache Entry
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

// TTL Constants (in milliseconds)
export const CACHE_TTL = {
    PRICES: 2 * 60 * 1000,         // 2 minutes
    NARRATIVES: 15 * 60 * 1000,    // 15 minutes
    METADATA: 24 * 60 * 60 * 1000, // 24 hours
    SOCIAL: 30 * 60 * 1000         // 30 minutes
};

class CacheService {

    /**
     * Set data in cache with specific TTL
     */
    set<T>(key: string, data: T, ttl: number): void {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                ttl
            };

            // Check environment
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(key, JSON.stringify(entry));
            }
        } catch (error) {
            console.warn('Cache write failed:', error);
        }
    }

    /**
     * Get data from cache. Returns null if missing or expired.
     */
    get<T>(key: string): T | null {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return null;

            const item = localStorage.getItem(key);
            if (!item) return null;

            const entry: CacheEntry<T> = JSON.parse(item);

            // Validation check
            if (!entry.timestamp || !entry.ttl) return null;

            // Check if expired
            if (Date.now() - entry.timestamp > entry.ttl) {
                // Expired - clean up
                console.log(`🧹 Cache expired for ${key}`);
                this.remove(key);
                return null;
            }

            return entry.data;

        } catch (error) {
            console.warn('Cache read failed:', error);
            return null; // Treat as cache miss
        }
    }

    /**
     * Remove item from cache
     */
    remove(key: string): void {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem(key);
            }
        } catch (error) { }
    }

    /**
     * Clear all cache entries starting with prefix
     */
    clearAll(prefix: string = 'wg_'): void {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return;

            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`🧹 Cleared ${keysToRemove.length} cache entries`);
        } catch (error) { }
    }
}

export const cacheService = new CacheService();

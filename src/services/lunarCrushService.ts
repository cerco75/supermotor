

const safeStorage = {
    getItem: (key: string) => {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    setItem: (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch (e) { }
    }
};

const BASE_URL_V3 = 'https://lunarcrush.com/api3';

interface SocialMetrics {
    galaxy_score: number;
    alt_rank: number;
    social_volume: number;
    social_score: number;
    sentiment: number;
    correlation_rank?: number;
}

export const lunarCrushService = {
    // Array of available keys to rotate
    API_KEYS: [
        'tyj2eidjaep671ywwhethc8h19m5pan1w7fy8ncad', // Key 1 (Original)
        'ryqb0l5xrcxjrohmq13o3imotmiexpfgrng1gu7'  // Key 2 (Backup)
    ],

    currentKeyIndex: 0,

    /**
     * Get current key
     */
    getApiKey(): string {
        return this.API_KEYS[this.currentKeyIndex];
    },

    /**
     * Rotate to next key
     */
    rotateKey() {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
        console.log(`🌙 Rotating LunarCrush Key to index ${this.currentKeyIndex}`);
    },

    /**
     * Fetches social metrics for a specific coin
     * Uses cache to preserve API quota and rotates keys on failure
     */
    async fetchCoinMetrics(symbol: string): Promise<SocialMetrics | null> {
        const CACHE_KEY = `wg_lunar_${symbol.toUpperCase()}`;

        // 1. Check Cache (15 min cache)
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
                return parsed.data;
            }
        }

        // Try fetch with rotation (max attempts = number of keys)
        for (let i = 0; i < this.API_KEYS.length; i++) {
            try {
                const currentKey = this.getApiKey();

                const response = await fetch(`${BASE_URL_V3}/coins/${symbol}?key=${currentKey}`);

                if (response.ok) {
                    const data = await response.json();

                    // Success! Process and cache
                    const metricData = data.data ? data.data : data;
                    const result: SocialMetrics = {
                        galaxy_score: metricData.galaxy_score || 0,
                        alt_rank: metricData.alt_rank || 0,
                        social_volume: metricData.social_volume || 0,
                        social_score: metricData.social_score || 0,
                        sentiment: metricData.percent_change_24h_rank || 50
                    };

                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        data: result
                    }));

                    return result;

                } else if (response.status === 429 || response.status === 402 || response.status === 401) {
                    // Rate Limit or Payment Required -> ROTATE KEY and Retry
                    console.warn(`🌙 Key ${this.currentKeyIndex} exhausted (${response.status}). Rotating...`);
                    this.rotateKey();
                    // Loop will continue with next key
                } else {
                    // Other error (404, 500) -> Probably not key related, abort
                    // console.warn(`LunarCrush Error ${response.status} for ${symbol}`);
                    return null;
                }

            } catch (error) {
                // console.warn('LunarCrush fetch failed, trying next key...', error);
                this.rotateKey();
            }
        }

        return null;
    },

    /**
     * Phase Detection Logic based on User's Guide
     */
    analyzeSocialPhase(metrics: SocialMetrics, priceChange24h: number): 'SILENCE' | 'PRE_PUMP' | 'PUMP' | 'NEUTRAL' {
        const { galaxy_score, alt_rank, social_volume } = metrics;

        // FASE 3: Pump (High Social + High Price)
        if (priceChange24h > 15 && social_volume > 100) return 'PUMP';

        // FASE 2: Pre-Pump (High Interest, Flat Price, Good Ranks)
        // AltRank < 100 is usually top tier interest
        if (priceChange24h > -5 && priceChange24h < 10 && alt_rank < 100 && social_volume > 50) {
            return 'PRE_PUMP';
        }

        // FASE 1: Silencio (Activity detected but price flat/dormant)
        // Galaxy Score High indicates "Healthy" despite low price action
        if (Math.abs(priceChange24h) < 5 && galaxy_score > 65) {
            return 'SILENCE';
        }

        return 'NEUTRAL';
    }
};

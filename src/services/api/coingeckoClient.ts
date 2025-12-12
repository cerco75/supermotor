
import { COINGECKO_IDS } from '../../constants';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const USD_TO_EUR = 0.93; // Could be moved to a config service

export interface CoinGeckoMarketData {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    high_24h: number;
    low_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_1h_in_currency: number;
    price_change_percentage_7d_in_currency: number;
    roi: null | any;
    last_updated: string;
}

export class CoinGeckoClient {
    private static instance: CoinGeckoClient;
    private cache: Map<string, { data: any, timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

    private constructor() { }

    public static getInstance(): CoinGeckoClient {
        if (!CoinGeckoClient.instance) {
            CoinGeckoClient.instance = new CoinGeckoClient();
        }
        return CoinGeckoClient.instance;
    }

    private getCacheKey(method: string, params: any): string {
        return `${method}_${JSON.stringify(params)}`;
    }

    private getFromCache(key: string): any | null {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            console.log(`💾 Cache HIT: ${key}`);
            return cached.data;
        }
        return null;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
        // Cleanup old entries (keep max 50)
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
    }

    /**
     * Fetch Market Data with Robust Retry Logic & Rate Limit Handling
     */
    async fetchMarkets(options: {
        pages?: number,
        perPage?: number,
        sparkline?: boolean,
        order?: string
    } = {}): Promise<CoinGeckoMarketData[]> {

        const pages = options.pages || 4;
        const perPage = options.perPage || 250;
        const sparkline = options.sparkline || false;
        const order = options.order || 'market_cap_desc';

        // CHECK CACHE FIRST
        const cacheKey = this.getCacheKey('fetchMarkets', { pages, perPage, order });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        let allCoins: CoinGeckoMarketData[] = [];
        const MAX_RETRIES = 3;

        console.log(`🦎 API: Scanning ${pages * perPage} tokens from CoinGecko...`);

        for (let page = 1; page <= pages; page++) {
            try {
                // Rate Limit Protection: Delay between pages
                if (page > 1) await this.delay(2500);

                const data = await this.fetchPageWithRetry(page, perPage, sparkline, MAX_RETRIES, order);

                if (Array.isArray(data) && data.length > 0) {
                    allCoins = [...allCoins, ...data];
                } else {
                    console.warn(`🦎 API: Page ${page} returned empty.`);
                }
            } catch (error) {
                // console.warn(`🦎 API: Failed to fetch page ${page} after retries.`);
                // Continue to next page instead of failing completely
            }
        }

        // Fallback Strategy
        if (allCoins.length < 50) {
            console.warn("🦎 API: Deep scan failed. Executing Emergency Fallback...");
            try {
                const fallback = await this.fetchPageWithRetry(1, 250, sparkline, 1, 'price_change_percentage_24h_desc');
                // Merge unique
                const existingIds = new Set(allCoins.map(c => c.id));
                fallback.forEach((coin: any) => {
                    if (!existingIds.has(coin.id)) allCoins.push(coin);
                });
            } catch (e) {
                console.error("🦎 API: Emergency fallback failed.");
            }
        }

        // SAVE TO CACHE
        this.setCache(cacheKey, allCoins);

        return allCoins;
    }

    private async fetchPageWithRetry(
        page: number,
        perPage: number,
        sparkline: boolean,
        retries: number,
        order: string = 'market_cap_desc'
    ): Promise<any[]> {
        const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=${order}&per_page=${perPage}&page=${page}&sparkline=${sparkline}&price_change_percentage=1h,24h,7d`;

        try {
            const response = await fetch(url);

            if (response.status === 429) {
                if (retries > 0) {
                    const waitTime = (4 - retries) * 5000; // 5s, 10s...
                    // console.warn(`⏳ API: Rate Limit (429) on page ${page}. Waiting ${waitTime / 1000}s...`);
                    await this.delay(waitTime);
                    return this.fetchPageWithRetry(page, perPage, sparkline, retries - 1, order);
                } else {
                    throw new Error('Rate Limit Exceeded (Max Retries)');
                }
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();

        } catch (e) {
            if (retries > 0) {
                await this.delay(2000);
                return this.fetchPageWithRetry(page, perPage, sparkline, retries - 1, order);
            }
            throw e;
        }
    }

    async searchCoinId(symbol: string): Promise<string | null> {
        const upper = symbol.toUpperCase();
        if (COINGECKO_IDS[upper]) return COINGECKO_IDS[upper];

        try {
            const response = await fetch(`${COINGECKO_BASE_URL}/search?query=${symbol}`);
            if (!response.ok) return null;

            const data = await response.json();
            const coins = data.coins || [];

            // Exact match priority
            const exact = coins.find((c: any) => c.symbol.toUpperCase() === upper);
            if (exact) return exact.id;

            if (coins.length > 0) return coins[0].id;

            return null;
        } catch (e) {
            return null;
        }
    }

    async getTickers(coinId: string): Promise<any[]> {
        try {
            const response = await fetch(`${COINGECKO_BASE_URL}/coins/${coinId}/tickers?depth=true`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.tickers || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * 🕯️ FETCH OHLC CANDLES (Standard Free Tier)
     * days=1 gives 30min granularity (approx 48 candles)
     * Limit: 30 calls/min approx
     */
    async fetchOHLC(coinId: string, days: number = 1): Promise<number[][]> {
        try {
            await this.delay(1000); // Rate limit safety
            const response = await fetch(`${COINGECKO_BASE_URL}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`);
            if (!response.ok) {
                if (response.status === 429) console.warn(`⏳ OHLC 429 for ${coinId}`);
                return [];
            }
            const data = await response.json();
            // returns [ [time, open, high, low, close], ... ]
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error(`Error fetching OHLC for ${coinId}:`, e);
            return [];
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const coingeckoClient = CoinGeckoClient.getInstance();

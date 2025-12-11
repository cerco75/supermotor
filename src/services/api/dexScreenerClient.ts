export interface DexScreenerPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
        address: string;
        name: string;
        symbol: string;
    };
    quoteToken: {
        address: string;
        name: string;
        symbol: string;
    };
    priceNative: string;
    priceUsd: string;
    txns: {
        m5: { buys: number; sells: number };
        h1: { buys: number; sells: number };
        h6: { buys: number; sells: number };
        h24: { buys: number; sells: number };
    };
    volume: {
        h24: number;
        h6: number;
        h1: number;
        m5: number;
    };
    priceChange: {
        m5: number;
        h1: number;
        h6: number;
        h24: number;
    };
    liquidity?: {
        usd: number;
        base: number;
        quote: number;
    };
    fdv?: number;
    marketCap?: number;
    pairCreatedAt?: number;
}

export class DexScreenerClient {
    private static instance: DexScreenerClient;
    private readonly BASE_URL = 'https://api.dexscreener.com/latest/dex';

    private constructor() { }

    public static getInstance(): DexScreenerClient {
        if (!DexScreenerClient.instance) {
            DexScreenerClient.instance = new DexScreenerClient();
        }
        return DexScreenerClient.instance;
    }

    /**
     * Search for pairs by token symbol or name
     * Useful when we don't have the contract address
     */
    async searchPairs(query: string): Promise<DexScreenerPair[]> {
        try {
            const response = await fetch(`${this.BASE_URL}/search?q=${query}`);
            if (!response.ok) throw new Error('DexScreener API Error');
            const data = await response.json();
            return data.pairs || [];
        } catch (error) {
            console.warn('DexScreener search failed:', error);
            return [];
        }
    }

    /**
     * Get pairs by token address (More accurate)
     * Supports fetching multiple pairs if addresses are comma-separated (max 30)
     */
    async getPairsByTokenAddress(addresses: string): Promise<DexScreenerPair[]> {
        try {
            const response = await fetch(`${this.BASE_URL}/tokens/${addresses}`);
            if (!response.ok) throw new Error('DexScreener Token API Error');
            const data = await response.json();
            return data.pairs || [];
        } catch (error) {
            console.warn('DexScreener token fetch failed:', error);
            return [];
        }
    }

    /**
     * Get specific pair by pair address
     */
    async getPairByAddress(pairAddress: string): Promise<DexScreenerPair | null> {
        try {
            const response = await fetch(`${this.BASE_URL}/pairs/solana/${pairAddress}`); // Assuming Solana primarily
            if (!response.ok) return null;
            const data = await response.json();
            return data.pair || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Derive "On-Chain Metrics" from raw DexScreener pair data
     * Used by Hunter Engine V3
     */
    deriveOnChainMetrics(pair: DexScreenerPair): any {
        // Return synthetic metrics based on available data
        // DexScreener doesn't give holder counts or whale concentration directly
        // So we approximate or set to 0 where data is missing
        return {
            holderCount: 0, // Not available
            whaleConcentration: 0, // Not available
            liquidityUSD: pair.liquidity?.usd || 0,
            volume24h: pair.volume.h24 || 0,
            volumeToMcapRatio: (pair.marketCap && pair.marketCap > 0) ? (pair.volume.h24 / pair.marketCap) : 0,
            newHolders24h: 0,
            holderGrowthRate: 0,
            smartMoneyFlow: 0,
            dexPairs: 1, // At least this one
            contractAgeHours: 0, // Not available
            isHoneypot: false,
            liquidityLocked: false
        };
    }

    /**
     * Fetch standard trending pairs (e.g. for Solana)
     * Note: DexScreener doesn't have a simple "trending" endpoint without an API key in some docs,
     * but we can simulate it by searching for specific profiles or using Top Volume.
     * 
     * Hack: We use a broad search or just return empty if endpoint not standard.
     * Ideally this would hit an endpoint like /token-profiles/latest/v1 if it existed.
     */
    async fetchTrendingPairs(chainId: string = 'solana'): Promise<DexScreenerPair[]> {
        // Use the official boosting/trending endpoint if available, or fallback to token profiles
        // DexScreener recently added a public curated list or we can search for top volume.
        // STRATEGY: 
        // 1. Fetch "token-profiles/latest/v1" which acts as trending/new
        // 2. OR search for "SOL" to get top pairs

        try {
            // Option 1: Try to get latest token profiles (Boosted/Trending)
            const response = await fetch(`${this.BASE_URL}/token-profiles/latest/v1`);
            if (response.ok) {
                const profiles = await response.json();
                // These are profiles, not pairs. We need to fetch pairs for them.
                // Filter by chainId first to reduce requests
                const relevant = profiles.filter((p: any) => p.chainId === chainId).slice(0, 20);

                if (relevant.length > 0) {
                    // Get addresses
                    const addresses = relevant.map((p: any) => p.tokenAddress).join(',');
                    return await this.getPairsByTokenAddress(addresses);
                }
            }

            // Option 2 (Fallback): Search for specific high volume terms or just standard query
            // searching "Solana" often returns top SOL pairs
            console.log(`🔎 DexScreener: Searching top pairs for ${chainId}...`);
            const searchResponse = await fetch(`${this.BASE_URL}/search?q=${chainId}`);
            if (searchResponse.ok) {
                const data = await searchResponse.json();
                if (data.pairs) {
                    // Filter to ensure chain match
                    return data.pairs
                        .filter((p: any) => p.chainId === chainId)
                        .slice(0, 60); // Return top 60
                }
            }

            return [];
        } catch (e) {
            console.warn('DexScreener trending fetch failed:', e);
            return [];
        }
    }
}

export const dexScreenerClient = DexScreenerClient.getInstance();

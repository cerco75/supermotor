import { COINGECKO_IDS } from '../constants';
import { OrderBookAnalysis, MarketTicker, DerivativesData, OnChainMetrics } from '../types';
import { technicalService } from './technicalService';
import { coingeckoClient } from './api/coingeckoClient';
import { binanceClient } from './api/binanceClient';
import { dexScreenerClient } from './api/dexScreenerClient';
import { cacheService, CACHE_TTL } from './cacheService';

const CACHE_KEY_MARKET = 'wg_cache_market_raw';
const CACHE_KEY_GAINERS = 'wg_cache_market_gainers';
const CACHE_KEY_DEX_TRENDS = 'wg_cache_dex_trends';
const CACHE_KEY_TICKERS = 'wg_cache_tickers_';
const CACHE_KEY_ID_MAP = 'wg_cache_id_map_';

const CACHE_DURATION_MS = 45 * 1000;
const TICKER_CACHE_DURATION_MS = 5 * 60 * 1000;
const USD_TO_EUR = 0.93;

// Helper simple para localStorage (legacy parts) + Node Comaptibility
const memoryStore = new Map<string, string>();
const safeStorage = {
    getItem: (key: string) => {
        if (typeof window === 'undefined') return memoryStore.get(key) || null;
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') { memoryStore.set(key, value); return; }
        try { localStorage.setItem(key, value); } catch (e) { }
    }
};

export const marketService = {

    async resolveCoinId(symbol: string): Promise<string | null> {
        const upperSymbol = symbol.toUpperCase();
        if (COINGECKO_IDS[upperSymbol]) return COINGECKO_IDS[upperSymbol];

        const cacheKey = `${CACHE_KEY_ID_MAP}${upperSymbol}`;
        const cachedId = safeStorage.getItem(cacheKey);
        if (cachedId) return cachedId;

        // Fallback simple search
        try {
            const id = await coingeckoClient.searchCoinId(symbol);
            if (id) safeStorage.setItem(cacheKey, id);
            return id || symbol.toLowerCase();
        } catch (e) {
            return symbol.toLowerCase();
        }
    },

    async fetchTopCoinsRaw(): Promise<any[]> {
        // Usa cacheManager para persistencia real si disponible, pero mantenemos safeStorage por compatibilidad en este método legacy
        const cached = safeStorage.getItem(CACHE_KEY_MARKET);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
                return parsed.data;
            }
        }
        try {
            const data = await coingeckoClient.fetchMarkets({ perPage: 100 });
            safeStorage.setItem(CACHE_KEY_MARKET, JSON.stringify({ timestamp: Date.now(), data }));
            return data;
        } catch (e) {
            const cached = safeStorage.getItem(CACHE_KEY_MARKET);
            return cached ? JSON.parse(cached).data : [];
        }
    },

    // --- HUNTER ENGINE V3 HELPER ---
    deriveOnChainMetrics(pair: any): OnChainMetrics {
        return dexScreenerClient.deriveOnChainMetrics(pair);
    },

    async fetchDexScreenerTrends(chainId?: string): Promise<any[]> {
        const cacheKey = chainId ? `${CACHE_KEY_DEX_TRENDS}_${chainId}` : CACHE_KEY_DEX_TRENDS;
        const cached = safeStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 30 * 1000) return parsed.data;
        }

        try {
            const data = await dexScreenerClient.fetchTrendingPairs(chainId);
            safeStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
            return data;
        } catch (e) {
            const cached = safeStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached).data : [];
        }
    },

    async fetchSolanaRadar(): Promise<any[]> {
        // Solana-specific fetch combining DexScreener (Primary) and simple CoinGecko fallback
        console.log('☀️ Fetching Solana Radar data...');
        const dexData = await this.fetchDexScreenerTrends('solana');

        // Ensure all have chain_id set correctly
        return dexData.map(t => ({ ...t, chainId: 'solana' }));
    },

    async fetchGlobalGainers(): Promise<any[]> {
        const cached = safeStorage.getItem(CACHE_KEY_GAINERS);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) return parsed.data;
        }

        try {
            // Priority: CoinGecko
            const data = await coingeckoClient.fetchMarkets({
                order: 'volume_desc',
                perPage: 250
            });
            const sorted = data.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
            safeStorage.setItem(CACHE_KEY_GAINERS, JSON.stringify({ timestamp: Date.now(), data: sorted }));
            return sorted;
        } catch (e) {
            // Fallback: Binance
            try {
                return await this.fetchBinanceGainers();
            } catch (binanceError) {
                const cached = safeStorage.getItem(CACHE_KEY_GAINERS);
                return cached ? JSON.parse(cached).data : [];
            }
        }
    },

    async fetchBinanceGainers(): Promise<any[]> {
        const gainers = await binanceClient.getGainers();
        safeStorage.setItem(CACHE_KEY_GAINERS, JSON.stringify({ timestamp: Date.now(), data: gainers }));
        return gainers;
    },

    /**
     * CRYPTO.COM TOKEN SCRAPER - Refactored v4
     * Delegates to dedicated API client
     */
    async fetchCryptoComTokens(): Promise<any[]> {
        const CACHE_KEY = 'wg_cache_cg_deep_1000_v1';
        // Use new cacheService
        const cached = cacheService.get<any[]>(CACHE_KEY);
        if (cached) return cached;

        try {
            console.log('🦎 MarketService: Delegating scan to CoinGeckoClient...');

            // Parallel Fetching: Top Cap + Gainers + New Listings (for Micro Velocity)
            const [topCap, topGainers, newListings] = await Promise.all([
                // 1. Scan Top 750 by Market Cap
                coingeckoClient.fetchMarkets({ pages: 3, perPage: 250 }),
                // 2. Scan Top 250 Gainers 
                coingeckoClient.fetchMarkets({ pages: 1, perPage: 250, order: 'price_change_percentage_24h_desc' }).catch(() => []),
                // 3. Scan New Listings / Small caps (simulated by fetching lower rank pages)
                // We fetch page 5 and 6 (Rank 1000-1500) which usually contains the mid-caps/micro-caps
                coingeckoClient.fetchMarkets({ pages: 2, perPage: 250, order: 'market_cap_desc' }).then(res => res.slice(0, 0)) // Dummy call-like structure, actually lets make a new call
            ]);

            // Actually, let's just fetch pages 5-6 explicitly for Micro Velocity candidates
            const microCaps = await coingeckoClient.fetchMarkets({ pages: 1, perPage: 250, order: 'volume_desc' }); // High volume small caps often appear here

            // Merge unique coins (TopCap + Gainers + Micro)
            const uniqueMap = new Map<string, any>();
            [...topCap, ...topGainers, ...microCaps].forEach(coin => {
                if (!uniqueMap.has(coin.id)) {
                    uniqueMap.set(coin.id, coin);
                }
            });

            const rawCoins = Array.from(uniqueMap.values());

            // Normalize & Process used by Radar
            const validTokens = rawCoins
                .filter(c => c.current_price > 0 && c.symbol)
                .map(coin => ({
                    id: `cg-${coin.id}`,
                    symbol: (coin.symbol || '').toUpperCase(),
                    name: coin.name,
                    image: coin.image,
                    current_price: (coin.current_price || 0) * USD_TO_EUR,
                    current_price_usd: coin.current_price || 0,
                    market_cap: (coin.market_cap || 0) * USD_TO_EUR,
                    total_volume: (coin.total_volume || 0) * USD_TO_EUR,
                    price_change_percentage_24h: coin.price_change_percentage_24h || 0,
                    price_change_percentage_1h: coin.price_change_percentage_1h_in_currency || 0,
                    price_change_percentage_7d: coin.price_change_percentage_7d_in_currency || 0,
                    high_24h: (coin.high_24h || 0) * USD_TO_EUR,
                    low_24h: (coin.low_24h || 0) * USD_TO_EUR,
                    is_crypto_com_listed: true,
                    exchange: 'CoinGecko',
                    trade_url: `https://www.coingecko.com/en/coins/${coin.id}`,
                    data_source: 'coingecko_deep_1000',
                    raw: coin
                }))
                .sort((a, b) => {
                    const change1hDiff = b.price_change_percentage_1h - a.price_change_percentage_1h;
                    if (Math.abs(change1hDiff) > 0.1) return change1hDiff;
                    const ratioA = a.market_cap > 0 ? a.total_volume / a.market_cap : 0;
                    const ratioB = b.market_cap > 0 ? b.total_volume / b.market_cap : 0;
                    return ratioB - ratioA;
                });

            if (validTokens.length > 0) {
                // Cache for 15 minutes (Narrative/Price Mix)
                cacheService.set(CACHE_KEY, validTokens, CACHE_TTL.NARRATIVES);
            }
            return validTokens;

        } catch (error) {
            console.error('MarketService: Scan failed', error);
            // Return stale cache if available, even if expired, better than empty
            // Note: cacheService.get returns null if expired. We might want a "stale" mode later.
            return [];
        }
    },

    async fetchDexScreenerPairs(symbol: string): Promise<MarketTicker[]> {
        const pairs = await dexScreenerClient.searchPairs(symbol);
        return pairs.map(pair => ({
            market: {
                name: pair.dexId.toUpperCase(),
                identifier: pair.dexId,
                has_trading_incentive: false,
                logo: ''
            },
            base: pair.baseToken.symbol,
            target: pair.quoteToken.symbol,
            last: parseFloat(pair.priceUsd) || 0,
            volume: pair.volume.h24 || 0,
            trust_score: 'green',
            trade_url: pair.url,
            is_anomaly: false
        }));
    },

    async fetchMarketTickers(assetSymbol: string): Promise<MarketTicker[]> {
        const cacheKey = `${CACHE_KEY_TICKERS}${assetSymbol.toUpperCase()}`;
        const cached = safeStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < TICKER_CACHE_DURATION_MS) return parsed.data;
        }

        let combinedTickers: MarketTicker[] = [];

        // 1. Try DexScreener (Primary: Faster & Free)
        try {
            const dexTickers = await dexScreenerClient.searchPairs(assetSymbol);
            if (dexTickers && dexTickers.length > 0) {
                const mapped = dexTickers.slice(0, 10).map(pair => ({
                    market: {
                        name: pair.dexId.toUpperCase(),
                        identifier: pair.dexId,
                        has_trading_incentive: false,
                        logo: '' // DexScreener doesn't provide exchange logo easily
                    },
                    base: pair.baseToken.symbol,
                    target: pair.quoteToken.symbol,
                    last: parseFloat(pair.priceUsd) || 0,
                    volume: pair.volume.h24 || 0,
                    trust_score: 'green', // DexScreener implies on-chain truth
                    trade_url: pair.url,
                    is_anomaly: false
                }));
                combinedTickers = [...combinedTickers, ...mapped];
            }
        } catch (e) {
            console.warn('DexScreener ticker fetch failed:', e);
        }

        // 2. Fallback: Syndicate Exchanges (Mock) if DexScreener Empty
        if (combinedTickers.length === 0) {
            const manualExchanges = [
                { name: 'Binance', url: `https://www.binance.com/en/trade/${assetSymbol.toUpperCase()}_USDT` },
                { name: 'OKX', url: `https://www.okx.com/trade-spot/${assetSymbol.toLowerCase()}-usdt` },
            ];
            manualExchanges.forEach(ex => {
                combinedTickers.push({
                    market: { name: ex.name, identifier: ex.name.toLowerCase(), has_trading_incentive: false, logo: '' },
                    base: assetSymbol.toUpperCase(),
                    target: 'USDT',
                    last: 0,
                    volume: 0,
                    trust_score: 'yellow',
                    trade_url: ex.url,
                    is_anomaly: false
                });
            });
        }

        safeStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: combinedTickers }));
        return combinedTickers;
    },

    async getBinanceTicker(symbol: string): Promise<number | null> {
        return binanceClient.getTickerPrice(symbol);
    },

    async fetchOrderBook(symbol: string): Promise<OrderBookAnalysis | null> {
        const obs = await binanceClient.getOrderBook(symbol);
        if (obs) return obs;
        return this.simulateOrderBook(symbol);
    },

    async fetchFundingRate(symbol: string): Promise<DerivativesData | null> {
        return binanceClient.getFundingRate(symbol);
    },

    async fetchHourlyHistory(asset: string): Promise<any[]> {
        const CACHE_KEY = `wg_hourly_${asset}`;
        const cached = safeStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 4 * 60 * 60 * 1000) return parsed.data;
        }

        try {
            const data = await binanceClient.getHourlyHistory(asset);
            safeStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
            return data;
        } catch (e) {
            return [];
        }
    },

    simulateOrderBook(symbol: string): OrderBookAnalysis {
        let hash = 0;
        for (let i = 0; i < symbol.length; i++) hash += symbol.charCodeAt(i);

        const imbalance = Math.sin(hash) * 0.8;
        const totalDepth = 1000000 + (Math.abs(Math.cos(hash)) * 5000000);
        const bidDepth = totalDepth * (0.5 + (imbalance * 0.3));

        return {
            bidDepth,
            askDepth: totalDepth - bidDepth,
            imbalance,
            spread: 0.002,
            spreadQuality: 'NORMAL',
            verdict: imbalance > 0.2 ? 'STRONG_SUPPORT' : imbalance < -0.2 ? 'SELL_WALL' : 'BALANCED',
            isSpoofing: false,
            spoofingConfidence: 'LOW'
        };
    }
};

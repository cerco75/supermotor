import { marketService } from './marketService';

export interface ScannedToken {
    symbol: string;
    name: string;
    address: string;
    priceUsd: number;
    marketCapUsd: number;
    liquidityUsd: number;
    volume24hUsd: number;
    holders?: number;
    priceChange1h: number; // Percentage
    priceChange24h: number; // Percentage
    ageHours?: number;
    raw: any;
}

export class MarketScanner {

    /**
     * FASE 1: Escaneo de Mercado con Filtros Duros
     * Objective: Identify a universe of tokens with potential, discarding trash.
     */
    public async scanMarket(): Promise<ScannedToken[]> {
        console.log('🦁🏹 [PHASE 1] Market Scanner: Starting scan...');

        // 1. Source Data: Combine Global Gainers (CoinGecko) AND Solana DexScreener (DEX Motor)
        const [globalRaw, dexRaw] = await Promise.all([
            marketService.fetchGlobalGainers(),
            marketService.fetchSolanaRadar()
        ]);

        console.log(`🦁🏹 [PHASE 1] Raw candidates found: ${globalRaw.length} (Global) + ${dexRaw.length} (DEX)`);

        // Combine and Deduplicate
        const rawTokens = [...globalRaw, ...dexRaw];
        const uniqueTokens = Array.from(new Set(rawTokens.map(t => t.id || t.pairAddress))).map(id => rawTokens.find(t => t.id === id || t.pairAddress === id));

        const passedTokens: ScannedToken[] = [];

        for (const token of uniqueTokens) {
            // Mapping raw data to ScannedToken interface
            // Handle differences between CoinGecko and DexScreener formats
            const isDex = !!token.pairAddress;

            const mcap = isDex ? (token.liquidity?.usd * 10 || 0) : (token.market_cap || 0); // DexMcap approx if missing
            const volume = isDex ? (token.volume?.h24 || 0) : (token.total_volume || 0);
            const price = isDex ? parseFloat(token.priceUsd) : (token.current_price || 0);
            const symbol = (isDex ? token.baseToken?.symbol : token.symbol) || 'UNKNOWN';

            // Liquidity
            const liquidity = isDex ? (token.liquidity?.usd || 0) : (mcap * 0.15);

            // Process candidates
            const candidate: ScannedToken = {
                symbol: symbol.toUpperCase(),
                name: token.name || symbol,
                address: token.pairAddress || token.id,
                priceUsd: price,
                marketCapUsd: mcap,
                liquidityUsd: liquidity,
                volume24hUsd: volume,
                holders: undefined,
                priceChange1h: isDex ? (token.priceChange?.h1 || 0) : (token.price_change_percentage_1h_in_currency || 0),
                priceChange24h: isDex ? (token.priceChange?.h24 || 0) : (token.price_change_percentage_24h || 0),
                ageHours: undefined,
                raw: token
            };

            if (this.applyHardFilters(candidate)) {
                passedTokens.push(candidate);
            }
        }

        console.log(`🦁🏹 [PHASE 1] Tokens passed Hard Filters: ${passedTokens.length}`);
        return passedTokens.slice(0, 15); // Return short list as requested (5-15)
    }

    private applyHardFilters(token: ScannedToken): boolean {
        // 1. liquidity > $50,000
        if (token.liquidityUsd < 50_000) return false;

        // 2. holders > 300
        // (Skipped as data is unavailable in current API context)
        // if (token.holders && token.holders < 300) return false;

        // 3. volumeToMarketCapRatio < 0.5 (Safety filter)
        if (token.marketCapUsd > 0) {
            const ratio = token.volume24hUsd / token.marketCapUsd;
            if (ratio >= 0.5) return false;
        }

        // 🆕 4. MAX MARKET CAP FILTER (Anti-Whale / Gem Hunter Mode)
        // Exclude tokens > $500M to focus on Low/Mid caps
        if (token.marketCapUsd > 500_000_000) return false;

        // 5. Min Volume Filter (Avoid dead tokens)
        if (token.volume24hUsd < 10_000) return false;

        // Extra: Filter out invalid data
        if (token.priceUsd <= 0) return false;

        return true;
    }
}

export const marketScanner = new MarketScanner();

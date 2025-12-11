
/**
 * 🐋 WHALE DETECTOR SERVICE
 * 
 * Detecta actividad de ballenas en tokens de baja capitalización (EVM + Solana)
 * para mejorar la precisión de Micro Velocity y CDC Radar.
 * 
 * ESTRATEGIA DE QUOTA:
 * - Solo analiza tokens que pasaron filtros de Micro Velocity
 * - Prioriza Top 20 candidatos
 * - Cache agresivo de 30 minutos
 */

// API KEYS
const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjhiZGFkOWU4LWRhMDUtNDM4My1iMjdjLWQ3YTdjMzlhNmNlNyIsIm9yZ0lkIjoiNDg1MDIxIiwidXNlcklkIjoiNDk5MDAwIiwidHlwZUlkIjoiZWMyNDkzNGYtMmUxNy00OWIyLTg4ODQtNjQ5NzY0MGM4MDA5IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NjUxMjY0NjgsImV4cCI6NDkyMDg4NjQ2OH0.KNIlnRcYHeIkgxOS0LR5xzM5-HqzUJM5QP2wCcbRTqE';
const ALCHEMY_API_KEY = 'hq3REVJNR-8neyJp36nMM';

// Endpoints
const ALCHEMY_ETH_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const ALCHEMY_POLYGON_URL = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Cache
const whaleCache = new Map<string, { data: WhaleAnalysis; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

// Types
export interface WhaleAnalysis {
    symbol: string;
    contractAddress?: string;
    chain: 'ethereum' | 'polygon' | 'bsc' | 'solana' | 'unknown';
    whaleScore: number; // 0-100
    signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    metrics: {
        topHoldersConcentration: number; // % del supply en top 10
        largeTransactions24h: number; // Número de transacciones >$10K
        accumulationTrend: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL';
        exchangeFlow: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL';
        avgWalletAge: number; // días promedio
        suspiciousActivity: boolean;
    };
    topHolders?: {
        address: string;
        balance: string;
        percentage: number;
    }[];
    recentLargeTrades?: {
        type: 'BUY' | 'SELL';
        amount: number;
        timestamp: number;
        txHash: string;
    }[];
    lastUpdated: number;
}

export const whaleDetectorService = {

    /**
     * Analiza actividad de ballenas para un token
     */
    async analyzeWhaleActivity(
        symbol: string,
        contractAddress?: string,
        chain: 'ethereum' | 'polygon' | 'bsc' | 'solana' = 'ethereum',
        coinGeckoId?: string
    ): Promise<WhaleAnalysis | null> {

        const cacheKey = `${symbol}-${chain}`;
        const cached = whaleCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`🐋 Cache HIT for ${symbol}`);
            return cached.data;
        }

        try {
            console.log(`🐋 Analyzing whale activity for ${symbol} on ${chain}...`);

            // 1. Resolver address si falta
            if (!contractAddress) {
                const resolvedAddress = await this.resolveContractAddress(symbol, chain, coinGeckoId);
                if (!resolvedAddress) {
                    console.warn(`🐋 No contract address found for ${symbol}`);
                    return null;
                }
                contractAddress = resolvedAddress;
            }

            // 2. Detectar Solana automáticamente por formato de address
            if (!contractAddress.startsWith('0x')) {
                chain = 'solana';
                console.log(`🐋 Detected SOLANA token: ${symbol}`);
            }

            // 3. FETCH DATA
            const [holdersData, largeTransactions] = await Promise.all([
                this.fetchTopHolders(contractAddress, chain),
                this.fetchLargeTransactions(contractAddress, chain)
            ]);

            // 4. METRICS / SCORE
            const exchangeFlow = await this.analyzeExchangeFlow(contractAddress, chain);
            const metrics = this.calculateMetrics(holdersData, largeTransactions, exchangeFlow);
            const whaleScore = this.calculateWhaleScore(metrics);
            const signal = this.determineSignal(whaleScore, metrics);

            const analysis: WhaleAnalysis = {
                symbol,
                contractAddress,
                chain,
                whaleScore,
                signal,
                metrics,
                topHolders: holdersData?.topHolders,
                recentLargeTrades: largeTransactions,
                lastUpdated: Date.now()
            };

            whaleCache.set(cacheKey, { data: analysis, timestamp: Date.now() });
            console.log(`🐋 ${symbol} (${chain}): Score ${whaleScore}/100 - Signal: ${signal}`);
            return analysis;

        } catch (error) {
            console.error(`🐋 Error analyzing ${symbol}:`, error);
            return null;
        }
    },

    /**
     * Batch Analysis
     */
    async analyzeBatch(
        candidates: { symbol: string; contractAddress?: string; chain?: 'ethereum' | 'polygon' | 'bsc' | 'solana'; coinGeckoId?: string }[]
    ): Promise<Map<string, WhaleAnalysis>> {
        const results = new Map<string, WhaleAnalysis>();
        const topCandidates = candidates.slice(0, 20);
        console.log(`🐋 Batch analyzing ${topCandidates.length} tokens...`);

        for (const candidate of topCandidates) {
            const analysis = await this.analyzeWhaleActivity(
                candidate.symbol,
                candidate.contractAddress,
                candidate.chain || 'ethereum',
                candidate.coinGeckoId
            );
            if (analysis) results.set(candidate.symbol, analysis);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return results;
    },

    /**
     * Resolve Contract Address (Multi-chain including Solana)
     * Enhanced to support CoinGecko ID resolution
     */
    async resolveContractAddress(symbol: string, chain: string, coinGeckoId?: string): Promise<string | null> {
        try {
            // STRATEGY 1: If we have a CoinGecko ID, use it to get contract address
            if (coinGeckoId) {
                console.log(`🐋 Resolving contract for ${symbol} using CoinGecko ID: ${coinGeckoId}`);
                try {
                    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinGeckoId}`);
                    if (response.ok) {
                        const data = await response.json();

                        // CoinGecko provides platform addresses
                        if (data.platforms) {
                            // Try to get address for the requested chain
                            const chainMap: Record<string, string> = {
                                'ethereum': 'ethereum',
                                'polygon': 'polygon-pos',
                                'bsc': 'binance-smart-chain',
                                'solana': 'solana'
                            };

                            const platformKey = chainMap[chain] || 'ethereum';
                            const address = data.platforms[platformKey];

                            if (address && address !== '') {
                                console.log(`🐋✅ Found ${chain} address for ${symbol}: ${address.substring(0, 10)}...`);
                                return address;
                            }

                            // Fallback: Try ethereum if requested chain not found
                            if (data.platforms.ethereum && data.platforms.ethereum !== '') {
                                console.log(`🐋✅ Using Ethereum address for ${symbol}: ${data.platforms.ethereum.substring(0, 10)}...`);
                                return data.platforms.ethereum;
                            }
                        }
                    }
                } catch (cgError) {
                    console.warn(`🐋 CoinGecko resolution failed for ${coinGeckoId}:`, cgError);
                }
            }

            // STRATEGY 2: Use DexScreener (Better for DEX tokens, no API key needed)
            console.log(`🐋 [2/3] Trying DexScreener for ${symbol}...`);
            try {
                const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${symbol}`);
                if (dexResponse.ok) {
                    const dexData = await dexResponse.json();
                    if (dexData.pairs && dexData.pairs.length > 0) {
                        // Find pair matching the requested chain
                        const chainIdMap: Record<string, string[]> = {
                            'ethereum': ['ethereum', 'ether'],
                            'polygon': ['polygon'],
                            'bsc': ['bsc'],
                            'solana': ['solana']
                        };

                        const targetChainIds = chainIdMap[chain] || ['ethereum'];

                        // Try to find exact chain match
                        for (const pair of dexData.pairs) {
                            if (pair.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase()) {
                                const pairChain = pair.chainId?.toLowerCase() || '';

                                // Check if this pair is on the requested chain
                                if (targetChainIds.some(id => pairChain.includes(id))) {
                                    const address = pair.baseToken.address;
                                    if (address) {
                                        console.log(`🐋✅ DexScreener found ${chain} address for ${symbol}: ${address.substring(0, 10)}...`);
                                        return address;
                                    }
                                }
                            }
                        }

                        // Fallback: Use first matching symbol regardless of chain
                        for (const pair of dexData.pairs) {
                            if (pair.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase()) {
                                const address = pair.baseToken.address;
                                if (address) {
                                    console.log(`🐋✅ DexScreener found address for ${symbol} (${pair.chainId}): ${address.substring(0, 10)}...`);
                                    return address;
                                }
                            }
                        }
                    }
                }
            } catch (dexError) {
                console.warn(`🐋 DexScreener resolution failed for ${symbol}:`, dexError);
            }

            // STRATEGY 3: Moralis fallback (only for EVM chains)
            const allowedChains = ['ethereum', 'polygon', 'bsc'];
            if (!allowedChains.includes(chain)) {
                console.log(`🐋⚠️ No contract address found for ${symbol} on ${chain}`);
                return null;
            }

            console.log(`🐋 [3/3] Trying Moralis for ${symbol}...`);
            const chainMap: Record<string, string> = {
                'ethereum': '0x1',
                'polygon': '0x89',
                'bsc': '0x38'
            };

            const response = await fetch(
                `https://deep-index.moralis.io/api/v2.2/erc20/metadata/symbols?chain=${chainMap[chain]}&symbols=${symbol}`,
                { headers: { 'X-API-Key': MORALIS_API_KEY, 'accept': 'application/json' } }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    console.log(`🐋✅ Moralis found address for ${symbol}: ${data[0].address.substring(0, 10)}...`);
                    return data[0].address;
                }
            }

            console.log(`🐋⚠️ No contract address found for ${symbol} on ${chain} (all strategies exhausted)`);
            return null;
        } catch (error) {
            console.warn(`🐋❌ Error resolving contract for ${symbol}:`, error);
            return null;
        }
    },

    /**
     * Fetch Top Holders (EVM + Solana)
     */
    async fetchTopHolders(contractAddress: string, chain: string): Promise<any> {
        try {
            let url = '';
            if (chain === 'solana') {
                url = `https://solana-gateway.moralis.io/token/mainnet/${contractAddress}/largest_accounts`;
            } else {
                const chainMap: Record<string, string> = { 'ethereum': '0x1', 'polygon': '0x89', 'bsc': '0x38' };
                url = `https://deep-index.moralis.io/api/v2.2/erc20/${contractAddress}/owners?chain=${chainMap[chain]}&limit=10`;
            }

            const response = await fetch(url, { headers: { 'X-API-Key': MORALIS_API_KEY, 'accept': 'application/json' } });

            if (response.ok) {
                const data = await response.json();
                let topHolders = [];
                let concentration = 50;

                if (chain === 'solana') {
                    // Solana response is array of { address, amount, decimals, ... }
                    // It doesn't give total supply easily here.
                    topHolders = Array.isArray(data) ? data.map((h: any) => ({
                        address: h.address,
                        balance: h.amount,
                        percentage: 0
                    })) : [];
                    concentration = 0; // Unknown without supply
                } else {
                    // EVM response { result: [...], total: ... }
                    topHolders = data.result?.map((holder: any) => ({
                        address: holder.owner_address,
                        balance: holder.balance,
                        percentage: parseFloat(holder.percentage_relative || '0')
                    })) || [];
                    concentration = topHolders.reduce((acc: number, h: any) => acc + h.percentage, 0);
                }

                return {
                    topHolders,
                    concentration,
                    totalHolders: chain === 'solana' ? 0 : (data.total_holders || 0)
                };
            }
            return null;
        } catch (error) {
            console.warn('Error fetching holders:', error);
            return null;
        }
    },

    /**
     * Fetch Large Transactions (EVM: Alchemy, Solana: Moralis)
     */
    async fetchLargeTransactions(contractAddress: string, chain: string): Promise<any[]> {
        try {
            // SOLANA STRATEGY
            if (chain === 'solana') {
                const url = `https://solana-gateway.moralis.io/token/mainnet/${contractAddress}/transfers?limit=20`;
                const response = await fetch(url, { headers: { 'X-API-Key': MORALIS_API_KEY, 'accept': 'application/json' } });

                if (response.ok) {
                    const data = await response.json();
                    if (!data || !Array.isArray(data)) return [];
                    return data.map((t: any) => ({
                        type: 'BUY', // Assuming Activity for now
                        amount: parseFloat(t.amount || '0'),
                        timestamp: new Date(t.block_time).getTime(),
                        txHash: t.transactionSignature
                    }));
                }
                return [];
            }

            // EVM STRATEGY (Alchemy)
            const endpoint = chain === 'polygon' ? ALCHEMY_POLYGON_URL : ALCHEMY_ETH_URL;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'accept': 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify({
                    id: 1, jsonrpc: '2.0', method: 'alchemy_getAssetTransfers',
                    params: [{
                        fromBlock: '0x0', toBlock: 'latest', contractAddresses: [contractAddress],
                        category: ['erc20'], maxCount: '0x64', order: 'desc'
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const transfers = data.result?.transfers || [];
                return transfers
                    .filter((t: any) => t.value !== null)
                    .map((t: any) => ({
                        type: t.from === '0x0000000000000000000000000000000000000000' ? 'BUY' : 'SELL',
                        amount: parseFloat(t.value || '0'),
                        timestamp: Date.now(),
                        txHash: t.hash
                    }));
            }
            return [];
        } catch (error) {
            console.warn('Error fetching transactions:', error);
            return [];
        }
    },

    async analyzeExchangeFlow(contractAddress: string, chain: string): Promise<string> {
        return 'NEUTRAL';
    },

    calculateMetrics(holdersData: any, largeTransactions: any[], exchangeFlow: string): WhaleAnalysis['metrics'] {
        const buyCount = largeTransactions.filter(t => t.type === 'BUY').length;
        const sellCount = largeTransactions.filter(t => t.type === 'SELL').length;

        let accumulationTrend: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL' = 'NEUTRAL';
        if (largeTransactions.length > 5) {
            if (buyCount > sellCount) accumulationTrend = 'ACCUMULATING';
            else if (sellCount > buyCount) accumulationTrend = 'DISTRIBUTING';
        }

        return {
            topHoldersConcentration: holdersData?.concentration || 0,
            largeTransactions24h: largeTransactions.length,
            accumulationTrend,
            exchangeFlow: exchangeFlow as any,
            avgWalletAge: 0,
            suspiciousActivity: false
        };
    },

    calculateWhaleScore(metrics: WhaleAnalysis['metrics']): number {
        let score = 50;
        if (metrics.accumulationTrend === 'ACCUMULATING') score += 40;
        else if (metrics.accumulationTrend === 'DISTRIBUTING') score -= 40;

        score += Math.min(metrics.largeTransactions24h * 2, 20);

        if (metrics.topHoldersConcentration > 0) {
            if (metrics.topHoldersConcentration >= 30 && metrics.topHoldersConcentration <= 70) score += 20;
            else if (metrics.topHoldersConcentration > 80) score -= 20;
        }

        return Math.max(0, Math.min(100, score));
    },

    determineSignal(score: number, metrics: WhaleAnalysis['metrics']): WhaleAnalysis['signal'] {
        if (metrics.accumulationTrend === 'DISTRIBUTING') return score < 30 ? 'STRONG_SELL' : 'SELL';
        if (score >= 90) return 'STRONG_BUY';
        if (score >= 75) return 'BUY';
        if (score >= 40) return 'HOLD';
        if (score >= 25) return 'SELL';
        return 'STRONG_SELL';
    },

    clearOldCache() {
        const now = Date.now();
        for (const [key, value] of whaleCache.entries()) {
            if (now - value.timestamp > CACHE_DURATION) whaleCache.delete(key);
        }
    }
};

// Cleanup routine
setInterval(() => whaleDetectorService.clearOldCache(), 60 * 60 * 1000);

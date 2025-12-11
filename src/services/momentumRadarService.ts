import { marketService } from './marketService';
import { telegramService } from './api/telegramService';
import { addDashboardAlert } from './alertStore';
import { cdcBackgroundRunner } from './cdcBackgroundRunner';
import { lunarCrushService } from './lunarCrushService';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

// ============================================================
// 🎯 CONFIGURATION INTERFACE & RULES
// ============================================================
export interface RadarConfig {
    id: 'standard' | 'micro_velocity' | 'accumulation';
    minMarketCap: number;
    maxMarketCap: number;
    minVolume24h: number;
    minChange1h: number;
    minChange24h: number;
    minVolumeToMcapRatio: number;

    // Standard Strategy Specifics
    stdMinChange1h?: number;
    stdMinChange24h?: number;
    earlyMinChange1h?: number;
    earlyMaxChange24h?: number;
    earlyMinChange24h?: number;

    excludedMajors: string[];
    requireMomentumAcceleration?: boolean;
    momentumDecayTolerance?: number;
    topGainersLimit: number;
}

const COMMON_EXCLUDED_MAJORS = [
    // Major Cryptos
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'TRX', 'TON',
    'AVAX', 'SHIB', 'DOT', 'LINK', 'BCH', 'NEAR', 'LTC', 'MATIC',
    'UNI', 'APT', 'ICP', 'FIL', 'ATOM', 'RENDER', 'IMX', 'INJ',
    'OP', 'ARB',

    // 🚫 STABLECOINS (Generan falsas señales de pre-ignición)
    'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDD', 'FDUSD', 'PYUSD',
    'USDE', 'FRAX', 'USDP', 'GUSD', 'LUSD', 'SUSD', 'USDK', 'USDX',
    'UST', 'USTC', 'EURT', 'EURS', 'EUROC', 'XAUT', 'PAXG',

    // Wrapped Assets
    'WBTC', 'WETH', 'STETH', 'CBETH', 'WAVAX', 'WSOL', 'WBNB'
];


// 1. STANDARD CONFIG (Original) - ULTRA RELAXED FOR SOLANA
const STANDARD_CONFIG: RadarConfig = {
    id: 'standard',
    minMarketCap: 50_000,     // Lowered to 50k for ultra-early Solana gems
    maxMarketCap: 500_000_000,
    minVolume24h: 2_000,      // Very low threshold - catch early movement
    minChange1h: -10,         // Allow negative (accumulation phase)
    minChange24h: -20,        // Allow significant dips (buy opportunities)

    // Strategy Dual (Standard / Early Riser) - RELAXED
    stdMinChange1h: 0.5,      // Reduced from 2.0 - catch subtle movement
    stdMinChange24h: 1.0,     // Reduced from 5.0 - early detection
    earlyMinChange1h: 1.0,    // Reduced from 3.5
    earlyMaxChange24h: 10.0,  // Increased from 5.0 - allow more range
    earlyMinChange24h: -20.0, // More permissive

    minVolumeToMcapRatio: 0.03, // Reduced from 0.10 to 3% - more permissive
    excludedMajors: COMMON_EXCLUDED_MAJORS,
    requireMomentumAcceleration: false, // Disabled for Solana - too restrictive
    momentumDecayTolerance: 0.5,
    topGainersLimit: 100      // Increased to see more candidates
};

// 2. MICRO VELOCITY CONFIG (New Rule Set) - SOLANA OPTIMIZED
const MICRO_CONFIG: RadarConfig = {
    id: 'micro_velocity',
    minMarketCap: 500_000,    // Reduced from 3M - catch smaller caps
    maxMarketCap: 50_000_000, // Increased from 30M
    minVolume24h: 1_000,      // Reduced from 5k - very sensitive
    minChange1h: -5,          // Allow dips (from 1.5)
    minChange24h: -10,        // Allow consolidation (from 3.0)
    minVolumeToMcapRatio: 0.02, // Reduced from 0.08 to 2%
    excludedMajors: COMMON_EXCLUDED_MAJORS,
    topGainersLimit: 100
};

// 3. ACCUMULATION CONFIG (New - Whale Accumulation Detection) - SOLANA OPTIMIZED
const ACCUMULATION_CONFIG: RadarConfig = {
    id: 'accumulation',
    minMarketCap: 100_000,    // Reduced from 1M - catch micro gems
    maxMarketCap: 100_000_000, // Increased from 50M
    minVolume24h: 1_000,      // Reduced from 10k - catch early activity
    minChange1h: -15,         // More permissive (from -5)
    minChange24h: -30,        // More permissive (from -10) - catch deep dips
    minVolumeToMcapRatio: 0.01, // Reduced from 0.05 to 1% - very permissive
    excludedMajors: COMMON_EXCLUDED_MAJORS,
    topGainersLimit: 50
};




interface HourlySnapshot {
    timestamp: number;
    candidates: {
        symbol: string;
        name: string;
        score?: number;
        creationDate?: number;
        contractAddress?: string;
        price: number;
        change1h: number;
        change24h: number;
        volume24h: number;
        marketCap: number;
        tradeUrl?: string;
        socialPhase?: string;
        strategy?: string;
    }[];
}

interface PersistenceTrack {
    symbol: string;
    name: string;
    consecutiveHours: number;
    firstSeenPrice: number;
    lastSeenPrice: number;
    lastSeenChange1h: number;
    lastSeenChange24h: number;
    lastSeenVolume: number;
    lastSeenMarketCap: number;
    previousChange1h: number;
    tradeUrl?: string;
    alertSentLevel: number;
    entryTimestamp: number;
    socialPhase?: string;
    strategyId: 'standard' | 'micro_velocity' | 'pre_ignition' | 'accumulation';
    preIgnitionScore?: number;
    accumulationScore?: number; // 🆕 Accumulation detection score (0-100)
    volumeAcceleration?: number;
    pressureDirection?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // NEW: Dirección de la presión
    netBuyPressure?: number; // NEW: Presión neta de compra (positivo = compra, negativo = venta)
    priceHistory?: number[]; // 🆕 For Markov
    markovState?: string;    // 🆕 Current Markov State
    creationDate?: number;   // 🆕 Genesis Date (if available)
    logo?: string;           // 🆕 Token Logo URL
    score?: number;          // 🆕 Unified Score (0-100)
    contractAddress?: string; // 🆕 CA
    lastUpdated?: number;    // 🆕 TTL Tracking
    lastHistoryUpdate?: number; // 🆕 To control history frequency
    aiData?: {               // 🆕 AI Advisor Data (full result from aiAdvisorService)
        score: number;
        isMatch: boolean;
        reason: string;
        timestamp: number;
        strategy?: import('./aiAdvisorService').TradingStrategy;
    };
}

import { markovService, MarketState } from './markovService';
import { aiAdvisorService } from './aiAdvisorService';

/**
 * CRYPTO.COM MOMENTUM RADAR ENGINE v3 (Dual Engine)
 */
export interface LogEntry {
    timestamp: number;
    message: string;
    type: 'info' | 'warn' | 'error' | 'success' | 'system';
}

class CryptoComMomentumRadar {
    private readonly STORAGE_KEY = 'wg_cdc_momentum_radar_v5';

    private snapshots: HourlySnapshot[] = [];
    private tracking: Record<string, PersistenceTrack> = {};

    private isRunning = false;
    private timer: any = null;
    private visibilityHandler: (() => void) | null = null;

    // 🆕 Volume History Tracking (7-day rolling window)
    private volumeHistory: Map<string, { timestamp: number; volume: number }[]> = new Map();
    private readonly VOLUME_HISTORY_DAYS = 7;
    private readonly MAX_HISTORY_ENTRIES = 7 * 24; // 7 days × hourly scans

    // 🆕 System Logs & Stats
    private logListeners: ((log: LogEntry) => void)[] = [];
    public alertsSentCount = 0;
    public lastScanTime: Date | null = null;

    constructor() {
        // State loading is now async and called in start()
        this.setupVisibilityListener();
    }

    /**
     * 📊 SYSTEM LOGGING
     */
    public subscribeToLogs(listener: (log: LogEntry) => void) {
        this.logListeners.push(listener);
        return () => {
            this.logListeners = this.logListeners.filter(l => l !== listener);
        };
    }

    private log(message: string, type: 'info' | 'warn' | 'error' | 'success' | 'system' = 'info') {
        const entry: LogEntry = {
            timestamp: Date.now(),
            message,
            type
        };

        // Console fallback
        const icon = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : type === 'system' ? '🦁' : 'ℹ️';
        console.log(`${icon} [LOG] ${message}`);

        // Notify listeners
        this.logListeners.forEach(l => l(entry));
    }

    // 🆕 Separate Pre-Ignition tracking
    private preIgnitionCandidates: Map<string, any> = new Map();

    // 🆕 Chain Filter
    private chainFilter: string | null = null;

    public setChainFilter(chain: string | null) {
        this.chainFilter = chain;
        console.log(`🦁 Chain Filter set to: ${chain || 'ALL'}`);
    }



    private setupVisibilityListener() {
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            this.visibilityHandler = () => {
                if (document.visibilityState === 'hidden') {
                    this.syncToBackgroundStorage();
                    console.log('🦁 App went to background - data synced for background execution');
                } else if (document.visibilityState === 'visible') {
                    this.loadState().catch(console.error);
                    console.log('🦁 App came to foreground - reloaded state');
                }
            };
            document.addEventListener('visibilitychange', this.visibilityHandler);
        }
    }

    private syncToBackgroundStorage() {
        try {
            this.saveState();
            cdcBackgroundRunner.syncTrackingDataToRunner().catch(e => {
                console.warn('🦁 Could not sync to background runner:', e);
            });
        } catch (e) {
            console.warn('🦁 Error syncing to background storage:', e);
        }
    }

    private serverUrl: string = 'https://supermotor-production-9013.up.railway.app';

    /**
     * 🔄 SYNC WITH SERVER (Offline History)
     */
    async syncWithServer() {
        if (this.serverUrl.includes('YOUR-RAILWAY-APP')) {
            this.log('⚠️ SERVER SYNC SKIPPED: Please update serverUrl in momentumRadarService.ts', 'warn');
            return;
        }

        try {
            this.log('🔄 Syncing with Server History...', 'system');
            const res = await fetch(`${this.serverUrl}/history`);
            const data = await res.json();

            if (data.ok && Array.isArray(data.gems)) {
                this.log(`📥 Received ${data.gems.length} gems from server`, 'info');
                this.processServerGems(data.gems);
            }
        } catch (e) {
            this.log(`❌ Server Sync Failed: ${e}`, 'error');
        }
    }

    private processServerGems(gems: any[]) {
        let added = 0;
        const now = Date.now();

        gems.forEach(gem => {
            const symbol = gem.baseToken.symbol;

            // Check if already exists in Tracking
            if (this.tracking[symbol]) return;

            // Create new Track
            const newTrack: PersistenceTrack = {
                symbol: symbol,
                name: gem.baseToken.name,
                entryTimestamp: gem.discoveredAt || now,
                creationDate: gem.pairCreatedAt || now,
                firstSeenPrice: parseFloat(gem.priceUsd),
                lastSeenPrice: parseFloat(gem.priceUsd),
                lastSeenChange1h: gem.priceChange.h1,
                lastSeenChange24h: gem.priceChange.h24,
                lastSeenVolume: gem.volume.h24,
                lastSeenMarketCap: gem.fdv || 0,
                consecutiveHours: 1,
                strategyId: 'standard', // Default to standard
                priceHistory: [],
                contractAddress: gem.baseToken.address,
                tradeUrl: gem.url,
                logo: gem.baseToken.logo || gem.info?.imageUrl,
                previousChange1h: 0,
                alertSentLevel: 0
            };

            this.tracking[symbol] = newTrack;
            added++;
        });

        if (added > 0) {
            this.saveState();
            this.log(`✅ Added ${added} missed gems from server history.`, 'success');
        }
    }

    async start() {
        if (this.isRunning) return;

        // Ensure state is loaded before starting
        await this.loadState();

        this.isRunning = true;
        this.log('🦁⚡ Crypto.com Momentum Radar v3 Started (Dual Engine)', 'system');

        try {
            if (typeof window !== 'undefined') {
                await cdcBackgroundRunner.initialize();
                await cdcBackgroundRunner.setEnabled(true);
                this.log('✅ Background runner enabled', 'success');
            }

            // 🔄 OFFLINE SYNC
            await this.syncWithServer();

        } catch (e) {
            this.log('⚠️ Could not initialize background runner (web mode?)', 'warn');
        }

        await this.runCycle();
        // ⚡ CHANGE: Run every 5 minutes instead of 60 to verify functionality
        // User reported "only works on page" - frequent updates prove global execution
        this.timer = setInterval(() => this.runCycle(), 5 * 60 * 1000);
    }

    async stop() {
        this.isRunning = false;
        if (this.timer) clearInterval(this.timer);
        try {
            await cdcBackgroundRunner.setEnabled(false);
        } catch (e) {
            console.warn('🦁 Could not disable background runner:', e);
        }
        this.log('Crypto.com Momentum Radar Stopped', 'system');
    }

    async runCycle() {
        try {
            this.log(`Testing Log Connection...`, 'info');
            this.log(`Scanning Market... [Chain: ${this.chainFilter || 'Global'}]`, 'system');

            let cdcTokens: any[] = [];

            if (this.chainFilter === 'solana') {
                cdcTokens = await marketService.fetchSolanaRadar();
            } else {
                cdcTokens = await marketService.fetchCryptoComTokens();
            }

            if (!cdcTokens || cdcTokens.length === 0) {
                this.log('No tokens received, skipping cycle', 'warn');
                return;
            }

            // 🦁 DATA ENRICHMENT: Calculate 1H Change for CDC-only tokens using our own history
            // Since we run hourly, this.tracking[symbol].lastSeenPrice is effectively "price 1h ago"
            cdcTokens.forEach((t: any) => {
                if (!t.price_change_percentage_1h || t.price_change_percentage_1h === 0) {
                    const tracked = this.tracking[t.symbol];
                    if (tracked && tracked.lastSeenPrice > 0) {
                        // User's Formula: ((current - previous) / previous) * 100
                        const calculatedChange = ((t.current_price - tracked.lastSeenPrice) / tracked.lastSeenPrice) * 100;
                        t.price_change_percentage_1h = calculatedChange;
                        // console.log(`🦁💧 Calculated 1H for ${t.symbol}: ${calculatedChange.toFixed(2)}% (Prev: ${tracked.lastSeenPrice}, Curr: ${t.current_price})`);
                    }
                }
            });

            // 1. FILTER STANDARD CANDIDATES
            const candidatesStandard = this.applyFilters(cdcTokens, STANDARD_CONFIG);
            // 2. FILTER MICRO CANDIDATES
            const candidatesMicro = this.applyFilters(cdcTokens, MICRO_CONFIG);

            this.log(`Candidates Found: ${candidatesStandard.length} Standard | ${candidatesMicro.length} Micro`, 'info');

            // Merge for LunarCrush Check
            const microToCheck = candidatesMicro.slice(0, 3);
            const stdToCheck = candidatesStandard.slice(0, 3);

            // Old candidateMap removed - new one created after whale detection (line ~541)
            /*
            const candidateMap = new Map<string, any>();
            candidatesMicro.forEach(c => candidateMap.set(c.symbol, { ...c, strategyId: 'micro_velocity' }));
            candidatesStandard.forEach(c => {
                if (!candidateMap.has(c.symbol)) {
                    candidateMap.set(c.symbol, { ...c, strategyId: 'standard' });
                }
            });
            */

            const tokensToCheck = new Set([...microToCheck, ...stdToCheck]);

            console.log(`🦁 Checking Social Phase for ${tokensToCheck.size} top candidates...`);

            for (const candidate of tokensToCheck) {
                try {
                    // DISABLED BY USER REQUEST: LunarCrush only for AI Agents Narrative
                    /*
                    const metrics = await lunarCrushService.fetchCoinMetrics(candidate.symbol);
                    if (metrics) {
                        const phase = lunarCrushService.analyzeSocialPhase(metrics, candidate.change24h);

                        const existing = candidateMap.get(candidate.symbol);
                        if (existing) existing.socialPhase = phase;

                        const inMicro = candidatesMicro.find(c => c.symbol === candidate.symbol);
                        if (inMicro) inMicro.socialPhase = phase;

                        const inStd = candidatesStandard.find(c => c.symbol === candidate.symbol);
                        if (inStd) inStd.socialPhase = phase;

                        if (phase === 'PRE_PUMP' || phase === 'SILENCE') {
                            console.log(`🦁🔮 SOCIAL SIGNAL (${candidate.strategy}): ${candidate.symbol} Phase: ${phase}`);
                        }
                    }
                    // Small delay between checks (500ms) to prevent overwhelming the service
                    await new Promise(resolve => setTimeout(resolve, 500));
                    */
                } catch (e) {
                    // console.warn(`Error checking LunarCrush phase for ${candidate.symbol}:`, e);
                }
            }

            // 🐋 WHALE DETECTION (Micro + Pre-Ignition Priority)
            let whaleResults: Map<string, any> | undefined;
            const preIgnitionCandidates = this.identifyPreIgnitionCandidates(cdcTokens);

            const combinedCandidates = [...preIgnitionCandidates, ...candidatesMicro];

            if (combinedCandidates.length > 0) {
                console.log(`🐋 Analyzing whale activity for top candidates (Pre-Ignition Priority)...`);

                try {
                    const { whaleDetectorService } = await import('./whaleDetectorService');

                    // Preparar candidatos únicos (Prioridad: Pre-Ignition luego Micro)
                    const uniqueSymbols = new Set<string>();
                    const whaleCandidates: any[] = [];

                    for (const c of combinedCandidates) {
                        if (!uniqueSymbols.has(c.symbol)) {
                            uniqueSymbols.add(c.symbol);
                            whaleCandidates.push({
                                symbol: c.symbol,
                                contractAddress: c.raw?.contractAddress || c.raw?.platforms?.ethereum,
                                coinGeckoId: c.raw?.id,
                                chain: 'ethereum' as const
                            });
                        }
                        if (whaleCandidates.length >= 10) break; // Limit to 10 quotas
                    }

                    console.log(`🐋 Prepared ${whaleCandidates.length} unique candidates for whale analysis`);



                    // Análisis batch (optimizado para quotas)
                    whaleResults = await whaleDetectorService.analyzeBatch(whaleCandidates);

                    console.log(`🐋 Received ${whaleResults.size} whale analysis results`);

                    // Inyectar whale data en los candidatos
                    let whaleAlertsCount = 0;
                    candidatesMicro.forEach(candidate => {
                        const whaleAnalysis = whaleResults?.get(candidate.symbol);
                        if (whaleAnalysis) {
                            candidate.whaleScore = whaleAnalysis.whaleScore;
                            candidate.whaleSignal = whaleAnalysis.signal;
                            candidate.whaleMetrics = whaleAnalysis.metrics;

                            // Log para tokens con alta actividad de ballenas
                            if (whaleAnalysis.whaleScore >= 75) {
                                console.log(`🐋🚀 WHALE ALERT: ${candidate.symbol} - Score: ${whaleAnalysis.whaleScore}/100 - Signal: ${whaleAnalysis.signal}`);
                                whaleAlertsCount++;
                            }

                            // Actualizar en el mapa también
                            const existing = candidateMap.get(candidate.symbol);
                            if (existing) {
                                existing.whaleScore = whaleAnalysis.whaleScore;
                                existing.whaleSignal = whaleAnalysis.signal;
                                existing.whaleMetrics = whaleAnalysis.metrics;
                            }
                        }
                    });

                    // Re-ordenar Micro candidates por whale score si está disponible
                    candidatesMicro.sort((a, b) => {
                        const scoreA = a.whaleScore || 0;
                        const scoreB = b.whaleScore || 0;
                        return scoreB - scoreA;
                    });

                    const topScorer = candidatesMicro[0];
                    console.log(`🐋✅ Whale analysis complete. ${whaleAlertsCount} high-score alerts. Top: ${topScorer?.symbol} (${topScorer?.whaleScore || 'N/A'}/100)`);

                } catch (whaleError) {
                    console.error('🐋❌ Whale detection failed:', whaleError);
                    console.warn('🐋⚠️ Continuing without whale data (non-critical)');
                }
            } else {
                console.log('🐋 No Micro Velocity candidates - skipping whale analysis');
            }

            // 🧲 RUN ACCUMULATION DETECTION (After whale detection to use results)
            const candidatesAccumulation = this.applyAccumulationFilters(cdcTokens, ACCUMULATION_CONFIG, whaleResults);
            console.log(`🧲 Accumulation candidates: ${candidatesAccumulation.length}`);

            // 🍲 RUN PRE-IGNITION ENGINE v3
            // Pass complete whale results for bonus scoring
            this.detectPressureCookers(cdcTokens, whaleResults).catch(e => console.error(e));

            // Merge ALL candidates (Standard + Micro + Accumulation)
            const candidateMap = new Map<string, any>();

            // Priority: Accumulation > Micro > Standard
            candidatesStandard.forEach(c => candidateMap.set(c.symbol, { ...c, strategyId: 'standard' }));
            candidatesMicro.forEach(c => candidateMap.set(c.symbol, { ...c, strategyId: 'micro_velocity' }));
            candidatesAccumulation.forEach(c => candidateMap.set(c.symbol, c)); // Accumulation has highest priority

            // Process Persistence for the merged list using the map values
            const uniqueCandidates = Array.from(candidateMap.values());
            this.processPersistence(uniqueCandidates);

            // 🔧 FIX: ACCUMULATE snapshots instead of replacing
            // Only save snapshot if we actually found candidates
            if (uniqueCandidates.length > 0) {
                // Check if we already have a recent snapshot (within last 2 minutes)
                const now = Date.now();
                const recentSnapshot = this.snapshots.find(s => now - s.timestamp < 2 * 60 * 1000);

                if (recentSnapshot) {
                    // MERGE with existing recent snapshot instead of creating new one
                    const existingSymbols = new Set(recentSnapshot.candidates.map(c => c.symbol));
                    uniqueCandidates.forEach(candidate => {
                        if (!existingSymbols.has(candidate.symbol)) {
                            recentSnapshot.candidates.push(candidate);
                        }
                    });
                    this.log(`📊 Merged ${uniqueCandidates.length} candidates into existing snapshot`, 'info');
                } else {
                    // Create NEW snapshot only if no recent one exists
                    this.snapshots.push({
                        timestamp: now,
                        candidates: uniqueCandidates
                    });
                    this.log(`📊 Created new snapshot with ${uniqueCandidates.length} candidates`, 'info');
                }
            } else {
                this.log(`⚠️ No candidates found in this scan, keeping previous snapshots`, 'warn');
            }

            // Prune snapshots
            const cutoff = Date.now() - (48 * 60 * 60 * 1000);
            this.snapshots = this.snapshots.filter(s => s.timestamp > cutoff);

            this.saveState();

            // Log
            const tracked = Object.values(this.tracking);
            console.log(`🦁📊 Tracking Total: ${tracked.length}`);

        } catch (error) {
            console.error('🦁❌ CryptoComRadar Error:', error);
        }
    }

    private applyFilters(tokens: any[], config: RadarConfig): any[] {
        const strategyLabel = config.id === 'micro_velocity' ? 'MICRO' : 'STD';
        console.log(`🦁🔍 [${strategyLabel}] Filtering ${tokens.length} tokens...`);

        let step1 = 0, step2 = 0, step3 = 0, step4 = 0, step5 = 0;

        const filtered = tokens
            .filter((c: any) => {
                const symbol = (c.symbol || '').toUpperCase();
                const change1h = c.price_change_percentage_1h || 0;
                const change24h = c.price_change_percentage_24h || 0;
                const volume24h = c.total_volume || 0;
                const marketCap = c.market_cap || 0;

                // 1. MCap Strict Filter
                const isUnknownCap = marketCap === 0;

                // 🛑 STRICT Enforcement for Micro Velocity
                if (config.id === 'micro_velocity') {
                    if (isUnknownCap || marketCap < config.minMarketCap || marketCap > config.maxMarketCap) {
                        step1++;
                        return false;
                    }
                } else if (!isUnknownCap) {
                    if (marketCap < config.minMarketCap || marketCap > config.maxMarketCap) {
                        step1++;
                        return false;
                    }
                } else {
                    // Unknown Cap Logic (Only for Standard, requires high volume)
                    if (volume24h < 50000) {
                        step1++;
                        return false;
                    }
                }

                // 2. Volume
                if (volume24h < config.minVolume24h) {
                    step2++;
                    return false;
                }

                // 3. Vol/MCap Ratio
                if (marketCap > 0) {
                    const ratio = volume24h / marketCap;
                    if (ratio < config.minVolumeToMcapRatio) {
                        step3++;
                        return false;
                    }
                }

                // 4. Excluded
                if (config.excludedMajors.includes(symbol)) {
                    step4++;
                    return false;
                }

                // 5. Strategy Specifics
                if (config.id === 'standard') {
                    const isStandard = (change1h >= (config.stdMinChange1h || 0)) && (change24h >= (config.stdMinChange24h || 0));
                    const isEarly = (change1h >= (config.earlyMinChange1h || 0)) &&
                        (change24h < (config.earlyMaxChange24h || 0)) &&
                        (change24h > (config.earlyMinChange24h || 0));

                    if (!isStandard && !isEarly) {
                        step5++;
                        return false;
                    }

                } else if (config.id === 'micro_velocity') {
                    if (change1h < config.minChange1h) {
                        step5++;
                        return false;
                    }
                    if (change24h < config.minChange24h) {
                        step5++;
                        return false;
                    }
                }

                return true;
            });

        console.log(`🦁📊 [${strategyLabel}] Filter Results: MCap:${step1} Vol:${step2} Ratio:${step3} Excluded:${step4} Strategy:${step5} → Passed: ${filtered.length}`);

        return filtered
            .sort((a: any, b: any) => (b.price_change_percentage_1h || 0) - (a.price_change_percentage_1h || 0))
            .slice(0, config.topGainersLimit)
            .map((c: any) => {
                let strategy = 'standard';
                if (config.id === 'standard') {
                    const change1h = c.price_change_percentage_1h || 0;
                    const change24h = c.price_change_percentage_24h || 0;
                    // Early Riser Check for Tagging
                    if (change1h >= (config.earlyMinChange1h || 3.5) && change24h < (config.earlyMaxChange24h || 5.0)) {
                        strategy = 'early_riser';
                    }
                } else {
                    strategy = 'micro_velocity';
                }

                return {
                    symbol: (c.symbol || '').toUpperCase(),
                    name: c.name || c.symbol || 'Unknown',
                    price: c.current_price || 0,
                    change1h: c.price_change_percentage_1h || 0,
                    change24h: c.price_change_percentage_24h || 0,
                    volume24h: c.total_volume || 0,
                    marketCap: c.market_cap || 0,
                    tradeUrl: c.trade_url || '',
                    strategy: strategy,
                    raw: c
                };
            });
    }

    /**
     * 🧲 ACCUMULATION FILTER (Whale-Based Pre-Explosion Detection)
     * Detects tokens in accumulation phase before they explode
     */
    private applyAccumulationFilters(tokens: any[], config: RadarConfig, whaleResults?: Map<string, any>): any[] {
        console.log(`🧲 [ACCUMULATION] Filtering ${tokens.length} tokens...`);

        const filtered = tokens
            .filter((c: any) => {
                const marketCap = c.market_cap || 0;
                const volume24h = c.total_volume || 0;
                const change24h = c.price_change_percentage_24h || 0;
                const symbol = (c.symbol || '').toUpperCase();

                // Basic filters
                if (marketCap < config.minMarketCap || marketCap > config.maxMarketCap) return false;
                if (volume24h < config.minVolume24h) return false;
                if (config.excludedMajors.includes(symbol)) return false;

                // 🚫 KEY: Reject tokens that already pumped
                if (change24h > 10) return false;

                return true;
            })
            .map(c => {
                // 🎯 Calculate Accumulation Score (0-100)
                let score = 0;

                // 1. Whale Analysis (40 points maximum)
                const whaleData = whaleResults?.get(c.symbol);
                if (whaleData) {
                    // ACCUMULATING trend is gold
                    if (whaleData.metrics.accumulationTrend === 'ACCUMULATING') score += 30;

                    // Sweet spot concentration (30-70%)
                    const concentration = whaleData.metrics.topHoldersConcentration;
                    if (concentration >= 30 && concentration <= 70) score += 10;
                }

                // 2. Volume Acceleration (30 points)
                const accel = this.calculateVolumeAcceleration(
                    c.symbol,
                    c.total_volume || 0,
                    c.market_cap || 0
                );
                if (accel > 1.5) score += 15;
                if (accel > 2.0) score += 15;

                // 3. Price Stability (20 points) - NOT volatile
                const change1h = c.price_change_percentage_1h || 0;
                const change24h = c.price_change_percentage_24h || 0;
                if (Math.abs(change1h) < 5) score += 10; // Stable 1h
                if (change24h > -5 && change24h < 5) score += 10; // Very stable 24h

                // 4. Turnover (10 points)
                const vol = c.total_volume || 0;
                const mcap = c.market_cap || 1;
                const turnover = vol / mcap;
                if (turnover > 0.08 && turnover < 0.30) score += 10; // Healthy, not frenzy

                return {
                    symbol: (c.symbol || '').toUpperCase(),
                    name: c.name || c.symbol || 'Unknown',
                    price: c.current_price || 0,
                    change1h: c.price_change_percentage_1h || 0,
                    change24h: c.price_change_percentage_24h || 0,
                    volume24h: c.total_volume || 0,
                    marketCap: c.market_cap || 0,
                    tradeUrl: c.trade_url || '',
                    accumulationScore: score,
                    volumeAcceleration: accel,
                    whaleData: whaleData,
                    strategyId: 'accumulation',
                    raw: c
                };
            })
            .filter(c => c.accumulationScore >= 50) // Minimum 50/100
            .sort((a, b) => b.accumulationScore - a.accumulationScore)
            .slice(0, config.topGainersLimit);

        console.log(`🧲 [ACCUMULATION] Found ${filtered.length} accumulation candidates`);
        if (filtered.length > 0) {
            console.log(`🧲 Top 3: ${filtered.slice(0, 3).map(c => `${c.symbol}(${c.accumulationScore})`).join(', ')}`);
        }

        return filtered;
    }


    private processPersistence(currentCandidates: any[]) {
        const currentSymbols = new Set(currentCandidates.map(c => c.symbol));

        // 1. Check existing tracked tokens
        // 1. Check existing tracked tokens
        // 1. Check existing tracked tokens (TTL Check)
        const now = Date.now();
        const TTL = 5 * 60 * 1000; // 5 minutes TTL

        Object.keys(this.tracking).forEach(symbol => {
            if (!currentSymbols.has(symbol)) {

                // 🛡️ PROTECTION: Do not delete if it is a valid Pre-Ignition Candidate
                if (this.preIgnitionCandidates.has(symbol)) {
                    return;
                }

                // 🆕 TTL LOGIC: Only delete if stale for > 5 minutes
                const track = this.tracking[symbol];
                const lastUpdate = track.lastUpdated || track.entryTimestamp;

                if (now - lastUpdate > TTL) {
                    console.log(`🦁📉 ${symbol} dropped from radar (Stale > 5m)`);
                    delete this.tracking[symbol];
                } else {
                    // console.log(`🦁⏳ ${symbol} missing in this scan, keeping alive (TTL safe)`);
                }
            }
        });

        // 2. Update or Add new
        currentCandidates.forEach(coin => {
            if (!this.tracking[coin.symbol]) {
                // NEW
                const strategyId = coin.strategyId === 'micro_velocity' ? 'micro_velocity' : 'standard';
                const strategyLabel = strategyId === 'micro_velocity' ? 'MICRO' : 'STD';

                console.log(`🦁🆕 ${coin.symbol} [${strategyLabel}] entra al radar ✅`);

                const newTrack: PersistenceTrack = {
                    symbol: coin.symbol,
                    name: coin.name,
                    consecutiveHours: 1,
                    firstSeenPrice: coin.price,
                    lastSeenPrice: coin.price,
                    lastSeenChange1h: coin.change1h,
                    lastSeenChange24h: coin.change24h,
                    lastSeenVolume: coin.volume24h,
                    lastSeenMarketCap: coin.marketCap,
                    previousChange1h: coin.change1h,
                    tradeUrl: coin.tradeUrl,
                    alertSentLevel: 0,
                    entryTimestamp: Date.now(),
                    socialPhase: coin.socialPhase,
                    strategyId: strategyId as any,
                    priceHistory: [coin.price], // 🆕 Init History
                    markovState: MarketState.ACCUMULATION, // Default
                    creationDate: coin.raw?.pairCreatedAt || coin.raw?.genesis_date, // 🆕 Genesis
                    logo: coin.raw?.image || coin.raw?.logo || coin.logo, // 🆕 Logo
                    score: coin.raw?.preIgnitionScore || 0, // 🆕 Score
                    contractAddress: coin.raw?.baseToken?.address || coin.raw?.contract_address, // 🆕 CA
                    lastUpdated: Date.now(), // 🆕 Init TTL
                    // 🤖 AI ANALYSIS
                    aiData: aiAdvisorService.analyzeToken(coin)
                };

                // Log AI Analysis Result
                if (newTrack.aiData?.isMatch) {
                    const strategy = newTrack.aiData.strategy;
                    const logMsg = `🦁🤖 AI APROBÓ: ${coin.symbol} | Score: ${newTrack.aiData.score} | Tendencia: ${strategy?.trendClassification}`;
                    console.log(logMsg);
                    this.log(logMsg, 'success'); // Log to System Board
                } else if (newTrack.aiData) {
                    // 🔍 LOG ALL AI DECISIONS (Full transparency)
                    const reason = newTrack.aiData.reason || 'Low Score';
                    // @ts-ignore
                    const flags = newTrack.aiData.flags ? newTrack.aiData.flags.join(', ') : 'None';
                    const rejectMsg = `🦁❌ RECHAZADO: ${coin.symbol} | Score: ${newTrack.aiData.score}/75 | Flags: ${flags}`;
                    console.log(rejectMsg);
                    // Log ALL rejections to System Board for visibility
                    this.log(rejectMsg, 'warn');
                }

                // 🚀 TELEGRAM NOTIFICATION (NEW V4.0)
                if (newTrack.aiData && newTrack.aiData.isMatch && newTrack.aiData.strategy) {
                    telegramService.sendAiAlert(newTrack.aiData.strategy);
                }

                this.tracking[coin.symbol] = newTrack;

                if (coin.socialPhase === 'SILENCE' || coin.socialPhase === 'PRE_PUMP') {
                    this.broadcastSocialAlert(coin, newTrack, coin.socialPhase);
                }

            } else {
                // EXISTING
                const track = this.tracking[coin.symbol];

                // Volume Drop Check (General Rule)
                const volChange = track.lastSeenVolume > 0
                    ? ((coin.volume24h - track.lastSeenVolume) / track.lastSeenVolume) * 100
                    : 0;

                if (volChange < -20) { // Hardcoded 20% drop limit
                    console.log(`🦁⚠️ ${coin.symbol} descalificado - volumen cayó ${volChange.toFixed(1)}%`);
                    delete this.tracking[coin.symbol];
                    return;
                }

                // Momentum Decay Check
                const momentumDiff = coin.change1h - track.previousChange1h;
                if (momentumDiff < -0.5) {
                    // warn
                }

                // Update
                track.consecutiveHours++;
                track.previousChange1h = track.lastSeenChange1h;
                track.lastSeenPrice = coin.price;
                track.lastSeenChange1h = coin.change1h;
                track.lastSeenChange24h = coin.change24h;
                track.lastSeenVolume = coin.volume24h;
                track.lastSeenMarketCap = coin.marketCap;
                track.lastUpdated = Date.now(); // 🆕 Refresh TTL
                if (coin.socialPhase) track.socialPhase = coin.socialPhase;


                // 🤖 UPDATE AI ANALYSIS
                // Re-analyze on every cycle to get fresh Gemini insights
                const priceDiff = Math.abs((coin.price - track.lastSeenPrice) / track.lastSeenPrice);

                // Always re-analyze to get fresh AI insights (including Gemini)
                console.log(`🦁🔄 Re-analizando ${coin.symbol} (cambio de precio: ${(priceDiff * 100).toFixed(2)}%)`);
                track.aiData = aiAdvisorService.analyzeToken(coin);

                // Log AI Analysis Result
                if (track.aiData?.isMatch) {
                    const updateMsg = `🦁🤖 AI APROBÓ (actualización): ${coin.symbol} | Score: ${track.aiData.score}`;
                    console.log(updateMsg);
                    this.log(updateMsg, 'success');
                } else if (track.aiData && track.aiData.score > 40) {
                    const reason = track.aiData.reason || 'Low Score';
                    // @ts-ignore
                    const flags = track.aiData.flags ? track.aiData.flags.join(', ') : 'None';
                    console.log(`🦁❌ RECHAZADO (Update): ${coin.symbol} | Score: ${track.aiData.score} | Flags: ${flags} | Causa: ${reason}`);
                }

                // 🚀 TELEGRAM NOTIFICATION (Update)
                if (track.aiData.isMatch && track.aiData.strategy) {
                    telegramService.sendAiAlert(track.aiData.strategy);
                }

                // 🆕 Update Price History (Frequency Controlled: Every 15 mins)
                const HISTORY_INTERVAL = 15 * 60 * 1000; // 15 mins
                if (!track.priceHistory) track.priceHistory = [];

                const timeSinceHistory = Date.now() - (track.lastHistoryUpdate || 0);

                if (track.priceHistory.length === 0 || timeSinceHistory >= HISTORY_INTERVAL) {
                    track.priceHistory.push(coin.price);
                    track.lastHistoryUpdate = Date.now();

                    // Keep 24 hours of data (24h * 4 points/h = 96 points)
                    if (track.priceHistory.length > 96) track.priceHistory.shift();
                }

                // Run Markov (Only if we have enough points, e.g. > 5)
                if (track.priceHistory.length >= 5) {
                    const analysis = markovService.analyzeMarketState(track.priceHistory);
                    track.markovState = analysis.predictedNextState;
                    // console.log(`🦁🔮 Markov Update for ${coin.symbol}: ${analysis.currentState} -> ${analysis.predictedNextState}`);
                }

                // CRITICAL: Update Strategy ID if it now matches Micro
                if (coin.strategyId === 'micro_velocity') {
                    track.strategyId = 'micro_velocity';
                }

                console.log(`🦁✅ ${coin.symbol} PERSISTE hora ${track.consecutiveHours}`);
                this.triggerAlerts(coin, track);
            }
        });
    }

    private triggerAlerts(coin: any, track: PersistenceTrack) {
        // Standard alerts at 3h and 6h
        if (track.consecutiveHours === 3 && track.alertSentLevel < 3) {
            this.broadcastAlert(coin, track, 3);
            track.alertSentLevel = 3;
        } else if (track.consecutiveHours === 6 && track.alertSentLevel < 6) {
            this.broadcastAlert(coin, track, 6);
            track.alertSentLevel = 6;
        }
    }

    private broadcastSocialAlert(coin: any, track: PersistenceTrack, phase: string) {
        const emoji = phase === 'SILENCE' ? '🤫' : '🍲';
        addDashboardAlert({
            title: `${emoji} ${phase === 'SILENCE' ? 'SILENCIO' : 'PRE-PUMP'}: ${coin.symbol}`,
            message: `Detectado en ${track.strategyId === 'micro_velocity' ? 'MICRO RADAR' : 'STANDARD RADAR'}.`,
            severity: 'info',
            timestamp: Date.now()
        });
        /* 
        // USER RESTRICTION: Disable Social Alerts (Clarifi/LunarCrush) to Telegram
        // Unless "Clrarifi" meant this, but safer to block as "ninguna otra" rule is strict.
        // Telegram service disabled for Lite version
        /*
        telegramService.sendMomentumAlert({
            symbol: coin.symbol,
            current_price: coin.price,
            price_change_percentage_1h_in_currency: coin.change1h,
            price_change_percentage_24h: coin.change24h,
            trade_url: track.tradeUrl,
            exchange: 'Crypto.com',
            market_cap: track.lastSeenMarketCap,
            volume_to_mcap: 'SOCIAL_SIGNAL'
        }, 0);
        */
    }

    private broadcastAlert(coin: any, track: PersistenceTrack, hours: number) {
        const emoji = hours >= 6 ? '🔥' : '🚀';
        const typeStr = track.strategyId === 'micro_velocity' ? 'MICRO VELOCITY' : 'CDC RADAR';

        addDashboardAlert({
            title: `${emoji} ${typeStr}: ${coin.symbol}`,
            message: `${hours}h Momentum | +${coin.change1h.toFixed(2)}% 1h.`,
            severity: hours >= 6 ? 'warning' : 'info',
            timestamp: Date.now()
        });

        /*
        telegramService.sendMomentumAlert({
            symbol: coin.symbol,
            current_price: coin.price,
            price_change_percentage_1h_in_currency: coin.change1h,
            price_change_percentage_24h: coin.change24h,
            trade_url: track.tradeUrl,
            exchange: 'Crypto.com',
            market_cap: track.lastSeenMarketCap,
            volume_to_mcap: ((coin.volume24h / coin.marketCap) * 100).toFixed(1)
        }, hours);
        */
    }

    /**
     * LOAD STATE (Async with Capacitor Preferences)
     */
    private async loadState() {
        if (typeof window === 'undefined') return; // Server mode skip (using memory)
        try {
            const { value } = await Preferences.get({ key: this.STORAGE_KEY });
            if (value) {
                const parsed = JSON.parse(value);
                this.snapshots = parsed.snapshots || [];
                // Restore Map from object
                this.tracking = parsed.tracking || {};

                // Restore volume history (serialize Map entries)
                if (parsed.volumeHistory) {
                    this.volumeHistory = new Map(parsed.volumeHistory);
                }

                console.log(`🦁 State Loaded: ${this.snapshots.length} updates`);
            }
        } catch (e) {
            console.warn('Failed to load CryptoComRadar state', e);
        }
    }

    /**
     * SAVE STATE (Async with Capacitor Preferences)
     */
    private async saveState() {
        if (typeof window === 'undefined') return; // Server mode skip
        try {
            // Serialize Maps
            const volHistoryArray = Array.from(this.volumeHistory.entries());

            const dataToSave = JSON.stringify({
                snapshots: this.snapshots,
                tracking: this.tracking,
                volumeHistory: volHistoryArray,
                lastUpdate: Date.now()
            });

            await Preferences.set({
                key: this.STORAGE_KEY,
                value: dataToSave
            });
        } catch (e) {
            console.warn('Failed to save state natively', e);
        }
    }

    // PUBLIC API

    /**
     * PURGE DATA
     * Clears all tracking history and snapshots.
     */
    public async clearPersistence() {
        this.tracking = {};
        this.snapshots = [];
        this.volumeHistory.clear();
        await this.saveState();
        console.log('🦁 Radar Memory Purged.');
    }

    getPersistenceList(strategy?: 'standard' | 'micro_velocity' | 'pre_ignition' | 'accumulation'): PersistenceTrack[] {
        const list = Object.values(this.tracking).sort((a, b) => b.consecutiveHours - a.consecutiveHours);
        if (strategy) {
            return list.filter(t => t.strategyId === strategy);
        }
        return list;
    }

    getLatestSnapshot() {
        return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
    }

    getConfig(strategy: 'standard' | 'micro_velocity' | 'pre_ignition' = 'standard') {
        return strategy === 'micro_velocity' ? MICRO_CONFIG : STANDARD_CONFIG;
    }

    /**
     * 🔍 IDENTIFY PRE-IGNITION CANDIDATES (Helper)
     * Returns list of potential candidates for Whale Analysis priority
     */
    private identifyPreIgnitionCandidates(tokens: any[]): any[] {
        return tokens.filter(t => {
            const symbol = (t.symbol || '').toUpperCase();
            const ch1h = t.price_change_percentage_1h || 0;
            const volume = t.total_volume || 0;
            const mcap = t.market_cap || 0;

            // 🚫 CRITICAL: Exclude Stablecoins & Majors (Generan falsas señales)
            if (COMMON_EXCLUDED_MAJORS.includes(symbol)) return false;

            // Rule 1: Flat/Consolidating Price (Relaxed for Solana: -10% to +25%)
            // We want to catch things BEFORE they moon 100%, but 25% is still "early" in Solana terms.
            const isFlat = (ch1h > -10.0 && ch1h < 25.0);

            // Rule 2: High Velocity (Vol/MCap > 10% - Relaxed)
            let isHighVelocity = mcap > 0 ? (volume / mcap >= 0.10) : (volume > 20000);

            // Rule 3: Minimum Interest (Lowered for Gems)
            const hasVolume = volume > 5000;

            // Anti-Scam: Skip if distributing heavily
            const isDistributing = ch1h < -8.0;

            return isFlat && (isHighVelocity || hasVolume) && !isDistributing;
        });
    }

    /**
     * 🍲 PRE-IGNITION ENGINE v3 (Complete)
     * Detects accumulation with volume acceleration, composite scoring, and anti-scam filters
     */
    private async detectPressureCookers(tokens: any[], whaleResults?: Map<string, any>) {
        console.log('🍲 Running Pre-Ignition (Pressure Cooker) scan v3...');

        // 1. Update volume history for all tokens
        tokens.forEach(t => {
            if (t.total_volume > 0) {
                this.updateVolumeHistory(t.symbol, t.total_volume);
            }
        });

        // 2. Filter & Score Candidates
        const scoredCandidatesRaw = tokens
            .filter(t => {
                const symbol = (t.symbol || '').toUpperCase();
                const ch1h = t.price_change_percentage_1h || 0;
                const volume = t.total_volume || 0;
                const mcap = t.market_cap || 0;
                const currentPrice = t.current_price || 0;

                // 🚫 CRITICAL: Exclude Stablecoins & Majors (Generan falsas señales)
                if (COMMON_EXCLUDED_MAJORS.includes(symbol)) return false;

                // 🆕 CRITICAL FIX: Check if we've been tracking this token
                const tracked = this.tracking[symbol];

                // If NOT tracked yet, skip it (we don't know if it's new momentum or old pump)
                if (!tracked) {
                    return false;
                }

                // 🆕 CRITICAL FIX: Require minimum 2 hours of tracking
                // This ensures we have enough history to know if momentum is NEW
                if (tracked.consecutiveHours < 2) {
                    return false;
                }

                // 🆕 CRITICAL FIX: Calculate REAL price change since WE started tracking
                // Not the API's 24h change (which could be from yesterday)
                const priceChangeSinceEntry = tracked.firstSeenPrice > 0
                    ? ((currentPrice - tracked.firstSeenPrice) / tracked.firstSeenPrice * 100)
                    : 0;

                // Rule 1: STRICT PRE-IGNITION RANGE
                // Must NOT have pumped much since we started tracking (max +8%)
                // This ensures we catch it EARLY, not after it already 10x'd
                const isStillEarly = priceChangeSinceEntry < 8.0 && priceChangeSinceEntry > -15.0;

                if (!isStillEarly) {
                    // Token already pumped too much since we started watching - too late!
                    return false;
                }

                // Rule 2: Recent Momentum (1h change should be positive and significant)
                // This is the "spark" - recent buying pressure
                const hasRecentMomentum = ch1h > 0.5 && ch1h < 25.0;

                // Rule 3: High Volume Velocity
                const hasHighVelocity = mcap > 0 ? (volume / mcap >= 0.08) : (volume > 5000);

                // Rule 4: Minimum Volume
                const hasVolume = volume > 3000;

                // Anti-Scam: Skip if distributing
                const isDistributing = ch1h < -5.0;

                return hasRecentMomentum && (hasHighVelocity || hasVolume) && !isDistributing;
            });

        // 🛡️ SAFETY NET: If Strict Scan fails, try Relaxed Scan (Adaptive)
        // Helps avoid empty screens during weird market conditions or data gaps
        if (scoredCandidatesRaw.length === 0) {
            console.log('🍲 Pre-Ignition: Strict Mode yielded 0. Engaging SAFETY NET (Relaxed Criteria)...');
            const relaxed = tokens.filter(t => {
                const symbol = (t.symbol || '').toUpperCase();
                // Block majors even in relaxed
                if (COMMON_EXCLUDED_MAJORS.includes(symbol)) return false;

                const ch1h = t.price_change_percentage_1h || 0;
                const ch24h = t.price_change_percentage_24h || 0;
                const volume = t.total_volume || 0;
                const mcap = t.market_cap || 0;

                // RELAXED RULES:
                // 1. Allow bigger 24h range (-15% to +15%)
                const isEarly = (ch24h < 15.0 && ch24h > -15.0);
                // 2. Any positive movement is a sign of life (> 0.0%)
                const isWakingUp = (ch1h > 0.0);
                // 3. Relaxed Velocity (0.05 ratio or just > 10k vol)
                let isHighVelocity = false;
                if (mcap > 0) isHighVelocity = (volume / mcap) >= 0.05;
                else isHighVelocity = volume > 10000;

                return isEarly && isWakingUp && isHighVelocity;
            });
            console.log(`🍲 Safety Net found ${relaxed.length} candidates.`);
            scoredCandidatesRaw.push(...relaxed);
        }

        const scoredCandidates = scoredCandidatesRaw.map(candidate => {
            // Calculate acceleration
            const acceleration = this.calculateVolumeAcceleration(
                candidate.symbol,
                candidate.total_volume || 0,
                candidate.market_cap || 0
            );

            // Get whale score if available
            const whaleScore = whaleResults?.get(candidate.symbol)?.whaleScore;

            // Calculate Pre-Ignition score
            const preIgnitionScore = this.calculatePreIgnitionScore(
                candidate,
                acceleration,
                whaleScore
            );

            // 🆕 DETECT PRESSURE DIRECTION
            const pressureAnalysis = this.detectPressureDirection(candidate);

            return {
                ...candidate,
                acceleration,
                whaleScore,
                preIgnitionScore,
                pressureDirection: pressureAnalysis.direction,
                netBuyPressure: pressureAnalysis.netBuyPressure,
                pressureConfidence: pressureAnalysis.confidence
            };
        })
            .sort((a, b) => b.preIgnitionScore - a.preIgnitionScore) // Sort by score
            .slice(0, 10); // Take Top 10

        console.log(`🍲 Found ${scoredCandidates.length} Pre-Ignition candidates (scored & ranked)`);

        // Store for persistence UI
        this.preIgnitionCandidates.clear();

        for (const candidate of scoredCandidates) {
            const symbol = candidate.symbol;

            // Check graduation first
            this.checkGraduation(symbol, candidate.price_change_percentage_1h || 0);

            // Store details
            this.preIgnitionCandidates.set(symbol, candidate);

            // Check if we already alerted heavily
            if (this.tracking[symbol]?.alertSentLevel >= 1) continue;

            const volToMcap = candidate.market_cap > 0
                ? (candidate.total_volume / candidate.market_cap * 100).toFixed(1)
                : 'HIGH';

            const directionEmoji = candidate.pressureDirection === 'BULLISH' ? '🟢' :
                candidate.pressureDirection === 'BEARISH' ? '🔴' : '⚪';

            const directionLabel = candidate.pressureDirection === 'BULLISH' ? 'COMPRA' :
                candidate.pressureDirection === 'BEARISH' ? 'VENTA' : 'NEUTRAL';

            console.log(
                `🍲🔥 PRE-IGNITION ${directionEmoji} ${candidate.pressureDirection}: ${symbol} ` +
                `| Score: ${candidate.preIgnitionScore.toFixed(0)} ` +
                `| Vol/MCap: ${volToMcap}% ` +
                `| Accel: ${candidate.acceleration.toFixed(1)}x ` +
                `| 1H: ${candidate.price_change_percentage_1h > 0 ? '+' : ''}${candidate.price_change_percentage_1h.toFixed(2)}%` +
                `| 24H: ${candidate.price_change_percentage_24h > 0 ? '+' : ''}${candidate.price_change_percentage_24h.toFixed(2)}%` +
                (candidate.whaleScore ? ` | Whale: ${candidate.whaleScore}/100` : '')
            );

            // Trigger specific alert specific LOGIC
            // Only alert if score is significant
            // If new install (accel 1.0), require higher score (100) purely from Vol/MCap
            const isFreshState = candidate.acceleration === 1.0;
            const alertThreshold = isFreshState ? 100 : 70;

            if (candidate.preIgnitionScore < alertThreshold) continue;

            // Trigger specific alert
            addDashboardAlert({
                title: `🍲 PRE-IGNITION ${directionEmoji} ${directionLabel}: ${symbol} (Score: ${candidate.preIgnitionScore.toFixed(0)})`,
                message: `Alta Presión ${directionLabel}! Vol/MCap: ${volToMcap}% | Accel: ${candidate.acceleration.toFixed(1)}x | ${candidate.price_change_percentage_1h > 0 ? '+' : ''}${candidate.price_change_percentage_1h.toFixed(2)}% 1h`,
                severity: 'warning',
                timestamp: Date.now()
            });

            // Telegram Alert
            // Telegram Alert (Disabled)
            /*
            telegramService.sendMomentumAlert({
                symbol,
                current_price: candidate.current_price,
                price_change_percentage_1h_in_currency: candidate.price_change_percentage_1h,
                price_change_percentage_24h: candidate.price_change_percentage_24h,
                trade_url: `https://dexscreener.com/search?q=${symbol}`,
                exchange: 'DEX',
                market_cap: candidate.market_cap,
                volume_to_mcap: `🍲 ${directionEmoji} ${directionLabel} | SCORE:${candidate.preIgnitionScore.toFixed(0)} | ${volToMcap}%`
            }, 0);
            */

            // Force add to tracking if not present
            if (!this.tracking[symbol]) {
                const newTracking = {
                    symbol,
                    name: candidate.name,
                    consecutiveHours: 0,
                    firstSeenPrice: candidate.current_price,
                    lastSeenPrice: candidate.current_price,
                    lastSeenChange1h: candidate.price_change_percentage_1h,
                    lastSeenChange24h: candidate.price_change_percentage_24h,
                    lastSeenVolume: candidate.total_volume,
                    lastSeenMarketCap: candidate.market_cap,
                    previousChange1h: candidate.price_change_percentage_1h,
                    tradeUrl: `https://dexscreener.com/search?q=${symbol}`,
                    alertSentLevel: 1,
                    entryTimestamp: Date.now(),
                    socialPhase: 'PRE_PUMP',
                    strategyId: 'pre_ignition',
                    preIgnitionScore: candidate.preIgnitionScore,
                    volumeAcceleration: candidate.acceleration,
                    pressureDirection: candidate.pressureDirection,
                    netBuyPressure: candidate.netBuyPressure
                };

                // Keep strictly typed
                this.tracking[symbol] = newTracking as any;

            } else {
                // Update existing tracking with new metrics
                this.tracking[symbol].preIgnitionScore = candidate.preIgnitionScore;
                this.tracking[symbol].volumeAcceleration = candidate.acceleration;
                this.tracking[symbol].pressureDirection = candidate.pressureDirection;
                this.tracking[symbol].netBuyPressure = candidate.netBuyPressure;
                this.tracking[symbol].strategyId = 'pre_ignition'; // Promote to pre_ignition strategy
            }
        }
    }

    /**
     * 🆕 UPDATE VOLUME HISTORY
     * Store current volume in 7-day rolling window
     */
    private updateVolumeHistory(symbol: string, volume: number) {
        const now = Date.now();
        const history = this.volumeHistory.get(symbol) || [];

        // Add current entry
        history.push({ timestamp: now, volume });

        // Remove entries older than 7 days
        const cutoff = now - (this.VOLUME_HISTORY_DAYS * 24 * 60 * 60 * 1000);
        const filtered = history.filter(entry => entry.timestamp > cutoff);

        // Limit to MAX_HISTORY_ENTRIES
        if (filtered.length > this.MAX_HISTORY_ENTRIES) {
            filtered.splice(0, filtered.length - this.MAX_HISTORY_ENTRIES);
        }

        this.volumeHistory.set(symbol, filtered);
    }

    /**
     * 🆕 CALCULATE VOLUME ACCELERATION
     * Returns multiplier: current volume / 7-day average
     * INCLUDES "HISTORY RECONSTRUCTION" for Fresh Installs
     */
    private calculateVolumeAcceleration(symbol: string, currentVolume: number, marketCap: number = 0): number {
        const history = this.volumeHistory.get(symbol);

        if (!history || history.length < 3) {
            // 🧠 HISTORY RECONSTRUCTION (The "Instant Memory" Patch)
            // If we lack history (fresh install/new token), we synthesize a baseline.
            // A "sleeping" token typically has ~2-3% Turnover (Vol/MCap).
            // If current Volume is 30% MCap, that's massive acceleration relative to "Normal".
            if (marketCap > 0) {
                const syntheticBaseline = marketCap * 0.03; // 3% Turnover as "Normal" Baseline
                if (syntheticBaseline > 0) {
                    const syntheticAccel = currentVolume / syntheticBaseline;
                    // Cap at 20x to prevent insanity, floor at 0.5x
                    const finalAccel = Math.min(20, Math.max(0.5, syntheticAccel));
                    // console.log(`🦁🧠 Synthetic Memory for ${symbol}: Vol=${currentVolume}, Base=${syntheticBaseline.toFixed(0)} => Accel ${finalAccel.toFixed(1)}x`);
                    return finalAccel;
                }
            }
            return 1.0; // Not enough data and no MCap to guess
        }

        const totalVolume = history.reduce((sum, entry) => sum + entry.volume, 0);
        const avgVolume = totalVolume / history.length;

        if (avgVolume === 0) return 1.0;

        const acceleration = currentVolume / avgVolume;
        return Math.max(0, acceleration); // Prevent negative
    }

    /**
     * 🆕 CALCULATE PRE-IGNITION SCORE
     * Composite score for ranking accumulation candidates
     */
    private calculatePreIgnitionScore(
        candidate: any,
        acceleration: number,
        whaleScore?: number
    ): number {
        const volume = candidate.total_volume || 0;
        const mcap = candidate.market_cap || 1;
        const change1h = candidate.price_change_percentage_1h || 0;
        const change24h = candidate.price_change_percentage_24h || 0;

        let score = 50; // Base score (Start at middle ground)

        // 1. Volume Power (30 pts max)
        if (volume > 1000000) score += 30;       // Heavy hitter
        else if (volume > 500000) score += 20;   // Strong
        else if (volume > 100000) score += 10;   // Decent
        else if (volume < 10000) score -= 20;    // Ghost town

        // 2. Momentum / Price Action (20 pts max)
        if (change1h > 3) score += 10;           // Moving now
        if (change24h > 10) score += 10;         // Sustained trend

        // Penalties for dumping
        if (change1h < -5) score -= 15;
        if (change24h < -10) score -= 15;

        // 3. Efficiency (Volume/MCap) (20 pts max)
        const ratio = mcap > 0 ? volume / mcap : 0;
        if (ratio > 0.5) score += 20;            // Turnover > 50% implies massive interest
        else if (ratio > 0.1) score += 10;       // Healthy

        // 4. Acceleration (30 pts max)
        if (acceleration > 3.0) score += 30;     // Exploding volume
        else if (acceleration > 1.5) score += 15;// Warming up

        // Clamp between 1 and 100
        return Math.min(100, Math.max(1, Math.round(score)));
    }

    /**
     * 🆕 DETECT PRESSURE DIRECTION
     * Determines if high volume pressure is BULLISH (buying) or BEARISH (selling)
     * Based on price action in recent hours
     */
    private detectPressureDirection(candidate: any): {
        direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        netBuyPressure: number;
        confidence: number;
    } {
        const change1h = candidate.price_change_percentage_1h || 0;
        const change24h = candidate.price_change_percentage_24h || 0;

        // Get historical data if available
        const tracked = this.tracking[candidate.symbol];
        const previousChange1h = tracked?.previousChange1h || 0;

        // Calculate momentum direction
        const momentumTrend = change1h - previousChange1h;

        // BULLISH SIGNALS:
        // 1. Price rising in 1h (>0%)
        // 2. Price rising in 24h (>0%)
        // 3. Momentum accelerating (current 1h > previous 1h)
        const bullishSignals = [
            change1h > 0,
            change24h > 0,
            momentumTrend > 0
        ].filter(Boolean).length;

        // BEARISH SIGNALS:
        // 1. Price falling in 1h (<0%)
        // 2. Price falling in 24h (<0%)
        // 3. Momentum decelerating (current 1h < previous 1h)
        const bearishSignals = [
            change1h < 0,
            change24h < 0,
            momentumTrend < 0
        ].filter(Boolean).length;

        // Calculate net buy pressure (-100 to +100)
        // Positive = buying pressure, Negative = selling pressure
        const netBuyPressure = (change1h * 0.6) + (change24h * 0.3) + (momentumTrend * 0.1);

        // Determine direction
        let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        let confidence: number;

        if (bullishSignals >= 2 && netBuyPressure > 1.0) {
            direction = 'BULLISH';
            confidence = Math.min(100, (bullishSignals / 3) * 100);
        } else if (bearishSignals >= 2 && netBuyPressure < -1.0) {
            direction = 'BEARISH';
            confidence = Math.min(100, (bearishSignals / 3) * 100);
        } else {
            direction = 'NEUTRAL';
            confidence = 50;
        }

        return { direction, netBuyPressure, confidence };
    }

    /**
     * 🆕 CHECK GRADUATION
     * Detect when Pre-Ignition token starts pumping
     */
    private checkGraduation(symbol: string, currentChange1h: number) {
        const candidate = this.preIgnitionCandidates.get(symbol);

        if (!candidate) return;

        // Graduation threshold: >5% rise in 1h
        if (currentChange1h > 5.0) {
            console.log(`🚀🎓 GRADUATION: ${symbol} ignited! (+${currentChange1h.toFixed(2)}%)`);

            // Alert
            addDashboardAlert({
                title: `🚀 IGNICIÓN CONFIRMADA: ${symbol}`,
                message: `Pre-Ignition graduó a PUMPING! +${currentChange1h.toFixed(2)}% en 1h`,
                severity: 'info',
                timestamp: Date.now()
            });

            // Update tracking phase
            if (this.tracking[symbol]) {
                this.tracking[symbol].socialPhase = 'PUMPING';
            }

            // Remove from pre-ignition (graduated)
            this.preIgnitionCandidates.delete(symbol);

            // Send Telegram alert
            // Send Telegram alert (Disabled)
            /*
            telegramService.sendMomentumAlert({
                symbol,
                current_price: candidate.current_price,
                price_change_percentage_1h_in_currency: currentChange1h,
                price_change_percentage_24h: candidate.price_change_percentage_24h,
                trade_url: candidate.trade_url || `https://dexscreener.com/search?q=${symbol}`,
                exchange: 'DEX',
                market_cap: candidate.market_cap,
                volume_to_mcap: `GRADUATED🚀`
            }, 0);
            */
        }
    }

    // --- AI ADVISOR ---
    getTechnicalAnalysis(token: PersistenceTrack): string {
        const volatility = Math.abs(token.lastSeenChange24h);
        const momentum24h = token.lastSeenChange24h;
        const isBullish = token.lastSeenChange1h > 0 && token.lastSeenChange24h > 0;

        // 🔧 FIX: Detect STRONG TREND (>20% momentum)
        const isStrongTrend = Math.abs(momentum24h) > 20;

        let sentiment = "NEUTRAL";
        let action = "MANTENER";
        let stopLoss = 0;
        let takeProfit = 0;
        let strategy = "";

        if (isBullish) {
            sentiment = "ALCISTA 🚀";
            action = "COMPRAR / LONG";

            if (isStrongTrend) {
                // 🔧 FIX: TREND FOLLOWING MODE (Let profits run!)
                strategy = "SEGUIR TENDENCIA";
                // Wider SL: -10% (instead of tight scalping stop)
                stopLoss = token.lastSeenPrice * 0.90;
                // Aggressive TP: +50% (instead of quick scalp)
                takeProfit = token.lastSeenPrice * 1.50;
            } else {
                // SCALPING MODE (Normal volatility)
                strategy = "SCALPING";
                // Tight SL: -5%
                stopLoss = token.lastSeenPrice * (1 - (volatility * 0.5 / 100));
                // Quick TP: +20%
                takeProfit = token.lastSeenPrice * (1 + (volatility * 0.8 / 100));
            }
        } else {
            sentiment = "BAJISTA 🐻";
            action = "EVITAR / ESPERAR";
            strategy = "DEFENSIVO";
            // SL above recent high (short logic, but mainly we advise avoid)
            stopLoss = token.lastSeenPrice * 1.05;
            takeProfit = token.lastSeenPrice * 0.90;
        }

        // Safety clamps
        if (stopLoss < 0) stopLoss = token.lastSeenPrice * 0.95;
        if (takeProfit < 0) takeProfit = token.lastSeenPrice * 1.10;

        const riskRewardRatio = ((takeProfit - token.lastSeenPrice) / (token.lastSeenPrice - stopLoss)).toFixed(2);

        return `
🧠 **Análisis IA para ${token.symbol}**
📊 **Tendencia:** ${sentiment}
🎯 **Acción:** ${action}
⚙️ **Estrategia:** ${strategy}

📉 **Stop Loss (SL):** $${stopLoss.toFixed(6)} (${((stopLoss / token.lastSeenPrice - 1) * 100).toFixed(2)}%)
📈 **Take Profit (TP):** $${takeProfit.toFixed(6)} (+${((takeProfit / token.lastSeenPrice - 1) * 100).toFixed(2)}%)
⚖️ **Riesgo/Beneficio:** 1:${riskRewardRatio}

💡 *Análisis:* ${isStrongTrend ? `🔥 MOMENTUM FUERTE detectado (${momentum24h.toFixed(2)}%)! Usando stops AMPLIOS para dejar correr las ganancias. ¡No salgas temprano de esta tendencia!` : `El token muestra momentum ${isBullish ? 'moderado' : 'débil'} con ${volatility.toFixed(2)}% de volatilidad. Usando stops ajustados para preservar capital.`}

Analista: CYBER-ORACLE v3.0 🤖
        `.trim();
    }

    /**
     * 🕐 GET SNAPSHOTS WITH TTL FILTER (15 minutes)
     * Returns only tokens discovered within the last 15 minutes
     * Sorted by age: NEWEST first, OLDEST last
     */
    getActiveSnapshots(): HourlySnapshot[] {
        const TTL_MS = 15 * 60 * 1000; // 15 minutes
        const now = Date.now();

        return this.snapshots
            .map(snapshot => {
                // Filter candidates by TTL
                const activeCandidates = snapshot.candidates.filter(candidate => {
                    const timestamp = candidate.creationDate || snapshot.timestamp;
                    const age = now - timestamp;
                    return age <= TTL_MS;
                });

                // Add age calculation to each candidate
                const candidatesWithAge = activeCandidates.map(candidate => ({
                    ...candidate,
                    ageMs: now - (candidate.creationDate || snapshot.timestamp),
                    ageMinutes: Math.floor((now - (candidate.creationDate || snapshot.timestamp)) / 60000)
                }));

                // Sort by age: NEWEST first (smallest ageMs)
                candidatesWithAge.sort((a, b) => a.ageMs - b.ageMs);

                return {
                    ...snapshot,
                    candidates: candidatesWithAge
                };
            })
            .filter(snapshot => snapshot.candidates.length > 0); // Remove empty snapshots
    }

    isActive() { return this.isRunning; }
    async forceRefresh() { await this.runCycle(); }
}

export const momentumRadarService = new CryptoComMomentumRadar();


/**
 * 🤖 AI ADVISOR SERVICE V4.0 (Multi-Timeframe + Dual AI Integration)
 * Analyzes tokens with MTF trend confirmation and generates complete trading strategies.
 * Now enhanced with Google Gemini AI AND OpenAI GPT-4 for intelligent timing analysis.
 */

import { geminiAnalysisService, type GeminiTokenAnalysis } from './geminiAnalysisService';
import { openAIAnalysisService, type OpenAITokenAnalysis } from './openAIAnalysisService';

export interface TradingStrategy {
    symbol: string;
    direction: 'LONG' | 'SHORT';
    horizon: 'Scalping (< 1d)' | 'Swing (3-7d)';

    // MTF Analysis
    trendScore: number;
    trendClassification: 'Strong Uptrend' | 'Weak Uptrend' | 'Neutral' | 'Downtrend';
    trendTimeframe: '4H' | '1D';

    // Entry Zones
    entryIdeal: number;
    safeZone: { min: number; max: number };
    maxEntryPrice: number;
    pullbackPrice: number;
    currentPrice: number;

    // Risk Management
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;

    // Context
    cause: string;
    latencyNote: string;
    executionNote: string;
    status: 'ACTIVE' | 'LATE_PULLBACK_ONLY' | 'RESOLVED';

    timestamp: number;
}

export interface AiAnalysisResult {
    score: number;
    isMatch: boolean;
    reason: string;
    flags: string[];
    timestamp: number;
    strategy?: TradingStrategy;
    geminiAnalysis?: GeminiTokenAnalysis; // 🆕 Gemini AI insights
    openAIAnalysis?: OpenAITokenAnalysis | null; // 🆕 OpenAI GPT-4 insights
}

class AiAdvisorService {

    /**
     * 🔍 MULTI-TIMEFRAME TREND CONFIRMATION
     * Approximation: Uses 24h change as proxy for higher timeframe trend
     */
    private confirmTrend(token: any): { trendScore: number; classification: string; timeframe: string } {
        // Support both CoinGecko format and internal radar format
        const change24h = token.price_change_percentage_24h || token.change24h || 0;
        const change1h = token.price_change_percentage_1h || token.change1h || 0;
        const volumeAccel = (token.volumeAcceleration || 1);

        let trendScore = 0;

        // Proxy for 4H/1D trend using 24h data
        // Strong uptrend indicators
        if (change24h > 15) trendScore += 2; // Very bullish 24h
        else if (change24h > 5) trendScore += 1; // Bullish 24h
        else if (change24h < -10) trendScore -= 2; // Bearish 24h
        else if (change24h < 0) trendScore -= 1; // Slightly bearish

        // Recent momentum (1h as proxy for recent trend)
        if (change1h > 5) trendScore += 1;
        else if (change1h < -5) trendScore -= 1;

        // Volume confirmation
        if (volumeAccel > 2.0) trendScore += 1; // Strong volume = trend confirmation

        // Classification
        let classification: string;
        if (trendScore >= 3) classification = 'Strong Uptrend';
        else if (trendScore >= 1) classification = 'Weak Uptrend';
        else if (trendScore >= -1) classification = 'Neutral';
        else classification = 'Downtrend';

        return {
            trendScore,
            classification,
            timeframe: '1D' // Approximation based on 24h data
        };
    }

    /**
     * 📊 GENERATE COMPLETE TRADING STRATEGY
     */
    public generateTradingStrategy(token: any): TradingStrategy {
        // Support both CoinGecko format and internal radar format
        const currentPrice = token.current_price || token.price || 0;
        const change1h = token.price_change_percentage_1h || token.change1h || 0;
        const change24h = token.price_change_percentage_24h || token.change24h || 0;
        const volume = token.total_volume || token.volume24h || 0;
        const mcap = token.market_cap || token.marketCap || 0;

        // MTF Trend Analysis
        const trend = this.confirmTrend(token);

        // Entry Points
        const entryIdeal = currentPrice;
        const safeZoneSpread = 0.025; // 2.5%
        const safeZone = {
            min: entryIdeal,
            max: entryIdeal * (1 + safeZoneSpread)
        };

        // Pullback Calculation (Technical)
        // Use recent support: 2% below current if in uptrend, more if not
        const pullbackPercent = trend.trendScore >= 2 ? 0.02 : 0.04;
        const pullbackPrice = entryIdeal * (1 - pullbackPercent);

        // Max Entry Price (Invalidation)
        const maxEntryPrice = entryIdeal * 1.05; // 5% above ideal

        // Dynamic SL/TP based on Trend Score
        let stopLoss: number;
        let takeProfit1: number;
        let takeProfit2: number;

        if (trend.trendScore >= 2) {
            // Strong trend: Standard risk, aggressive targets
            stopLoss = entryIdeal * 0.95; // -5%
            takeProfit1 = entryIdeal * 1.10; // +10%
            takeProfit2 = entryIdeal * 1.20; // +20%
        } else {
            // Weak/Counter trend: Tighter risk, conservative targets
            stopLoss = entryIdeal * 0.97; // -3%
            takeProfit1 = entryIdeal * 1.05; // +5%
            takeProfit2 = entryIdeal * 1.08; // +8%
        }

        // Risk/Reward Ratio
        const risk = entryIdeal - stopLoss;
        const reward = takeProfit1 - entryIdeal;
        const riskRewardRatio = risk > 0 ? reward / risk : 0;

        // Determine Status
        let status: 'ACTIVE' | 'LATE_PULLBACK_ONLY' | 'RESOLVED';
        if (currentPrice > maxEntryPrice) {
            status = 'LATE_PULLBACK_ONLY';
        } else {
            status = 'ACTIVE';
        }

        // Cause (Why this signal?)
        let cause = 'Volume Breakout detected with ';
        if (trend.trendScore >= 3) cause += 'strong uptrend confirmation';
        else if (trend.trendScore >= 1) cause += 'weak uptrend';
        else cause += 'counter-trend warning';

        // Latency Note
        const latencyNote = "Esta señal se genera usando indicadores técnicos retrasados. El precio puede haber subido desde la detección inicial. Use las zonas de entrada para manejar este riesgo.";

        // Execution Note
        let executionNote = '';
        if (status === 'ACTIVE') {
            executionNote = `Entrada inmediata posible en Zona Segura ($${safeZone.min.toFixed(4)} - $${safeZone.max.toFixed(4)}). Si el precio sube, espere pullback a $${pullbackPrice.toFixed(4)}.`;
        } else {
            executionNote = `⚠️ Precio actual ($${currentPrice.toFixed(4)}) excede límite seguro. NO PERSEGUIR. Esperar pullback a $${pullbackPrice.toFixed(4)} para entrada favorable.`;
        }

        // Horizon
        const horizon: 'Scalping (< 1d)' | 'Swing (3-7d)' =
            (mcap > 0 && volume / mcap > 0.5) ? 'Scalping (< 1d)' : 'Swing (3-7d)';

        return {
            symbol: token.symbol || 'UNKNOWN',
            direction: 'LONG',
            horizon,
            trendScore: trend.trendScore,
            trendClassification: trend.classification as any,
            trendTimeframe: trend.timeframe as any,
            entryIdeal,
            safeZone,
            maxEntryPrice,
            pullbackPrice,
            currentPrice,
            stopLoss,
            takeProfit1,
            takeProfit2,
            riskRewardRatio,
            cause,
            latencyNote,
            executionNote,
            status,
            timestamp: Date.now()
        };
    }

    /**
     * 🎯 ANALYZE TOKEN (Entry Point)
     * Now generates full strategy if token passes validation
     * ASYNC: Waits for Gemini AI analysis
     */
    public async analyzeToken(token: any): Promise<AiAnalysisResult> {
        console.log(`🎯 AI Advisor analyzing: ${token.symbol || 'UNKNOWN'}`);

        // Support both CoinGecko format and internal radar format
        const volume = token.total_volume || token.volume24h || 0;
        const mcap = token.market_cap || token.marketCap || 0;
        const priceChange1h = token.price_change_percentage_1h || token.change1h || 0;
        const priceChange24h = token.price_change_percentage_24h || token.change24h || 0;

        let score = 50;
        const flags: string[] = [];

        // Volume Validity
        if (mcap > 0) {
            const turnover = volume / mcap;
            if (turnover > 2.0) {
                score -= 30;
                flags.push('SUSPICIOUS_VOLUME');
            } else if (turnover > 0.50) {
                score += 20;
            } else if (turnover < 0.05) {
                score -= 20;
                flags.push('LOW_INTEREST');
            } else {
                score += 10;
            }
        } else {
            if (volume < 10000) {
                score -= 40;
                flags.push('GHOST_TOKEN');
            } else {
                score += 5;
            }
        }

        // 🆕 FRESHNESS CHECK (Critical Anti-Late-Entry Filter)
        // Reject tokens that already pumped significantly in 24h
        // STRICT MODE RESTORED: 15% hard limit to prevent FOMO
        if (priceChange24h > 15) {
            score -= 40; // Heavy penalty for late entry
            flags.push('ALREADY_PUMPED_15%');
        }

        // Price Stability
        if (priceChange1h > 100) {
            score -= 30; // Increased penalty
            flags.push('VOLATILE_PUMP');
        } else if (priceChange1h < -5) {
            // STRICT: Even small dumps are penalized now
            score -= 50;
            flags.push('DUMPING_NOW');
        } else if (priceChange1h > 5 && priceChange1h < 20) {
            score += 20; // Sweet spot for organic growth
        }

        // Trend Consistency
        if (priceChange1h > 0 && priceChange24h < 0) {
            score -= 20; // Stricter penalty for dead cat bounce
            flags.push('DEAD_CAT_BOUNCE');
        }
        if (priceChange1h > 0 && priceChange24h > 0 && priceChange24h < 15) {
            score += 20; // Perfect setup: Green day but early (<15%)
        }

        // Whale Signal
        if (token.whaleScore && token.whaleScore > 70) {
            score += 25;
        }

        score = Math.min(100, Math.max(0, score));

        // HIGH THRESHOLD: 75/100 required for AI Approval
        const isMatch = score >= 75 && !flags.includes('DUMPING_NOW') && !flags.includes('ALREADY_PUMPED_15%');
        let reason = "Moderate opportunity.";
        if (isMatch) reason = "✅ PRIME SETUP DETECTED (High Confidence).";
        else if (score < 50) reason = `❌ Rejected. Flags: ${flags.join(', ')}`;

        // Generate full strategy if it's a match
        let strategy: TradingStrategy | undefined;
        if (isMatch) {
            strategy = this.generateTradingStrategy(token);
        }

        // 🤖 AWAIT OpenAI analysis (now blocking to include in result)
        console.log(`🔍 Triggering OpenAI analysis for ${token.symbol}...`);

        // Ensure OpenAI Key is configured
        if (!openAIAnalysisService.hasApiKey()) {
            // Try to load from env or local storage
            const key = (window as any).OPENAI_API_KEY || localStorage.getItem('OPENAI_API_KEY');
            if (key) {
                openAIAnalysisService.setApiKey(key);
            } else {
                console.warn("⚠️ OpenAI Key missing. AI Analyst will fail.");
            }
        }

        let openAIAnalysis: OpenAITokenAnalysis | null = null;
        try {
            openAIAnalysis = await this.analyzeWithOpenAI(token);
            if (openAIAnalysis) {
                console.log(`🤖 OpenAI GPT-4: ${token.symbol} - ${openAIAnalysis.recommendation} (${openAIAnalysis.confidenceScore}% confidence)`);
                console.log(`   Action: ${openAIAnalysis.action}, Risk: ${openAIAnalysis.riskAssessment.riskLevel}`);
                console.log(`   Rationale: ${openAIAnalysis.rationale}`);
            } else {
                console.log(`⚠️ OpenAI returned null for ${token.symbol}`);
            }
        } catch (err) {
            console.error('❌ OpenAI analysis failed (non-critical):', err);
        }

        return {
            score,
            isMatch,
            reason,
            flags,
            timestamp: Date.now(),
            strategy,
            openAIAnalysis // ✅ Now included in the result!
        };
    }

    /**
     * 🤖 ASYNC GEMINI AI ANALYSIS
     * DEPRECATED for AI Analyst - Reserved for Momentum Hunter
     */
    public async analyzeWithGemini(token: any): Promise<GeminiTokenAnalysis | undefined> {
        // Disabled for AI Analyst
        return undefined;
    }

    /**
     * 🤖 ASYNC OPENAI AI ANALYSIS
     * Analyzes token with OpenAI GPT-4 for intelligent timing insights
     * Exclusive for AI Analyst
     */
    public async analyzeWithOpenAI(token: any): Promise<OpenAITokenAnalysis | null> {
        try {
            return await openAIAnalysisService.analyzeToken(token);
        } catch (error) {
            console.error('❌ OpenAI analysis error:', error);
            return null;
        }
    }

    /**
     * 🔑 SET GEMINI API KEY
     * Call this to enable Gemini AI analysis
     */
    public setGeminiApiKey(key: string) {
        geminiAnalysisService.setApiKey(key);
    }

    /**
     * 🔑 SET OPENAI API KEY
     * Call this to enable OpenAI GPT-4 analysis
     */
    public setOpenAIApiKey(key: string) {
        openAIAnalysisService.setApiKey(key);
    }

    /**
     * 📊 GET GEMINI USAGE STATS
     */
    public getGeminiUsageStats() {
        return geminiAnalysisService.getUsageStats();
    }

    /**
     * 📊 GET OPENAI USAGE STATS
     */
    public getOpenAIUsageStats() {
        return openAIAnalysisService.getUsageStats();
    }
}


export const aiAdvisorService = new AiAdvisorService();

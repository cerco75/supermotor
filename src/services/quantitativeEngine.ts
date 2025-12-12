import { ScannedToken } from './marketScanner';
import { coingeckoClient } from './api/coingeckoClient';

export interface QuantResult {
    token: ScannedToken;
    score: number;
    indicators: {
        emaCross: boolean;
        priceVsEma21: boolean;
        rsi14: number;
        macdSignal: 'BULLISH' | 'BEARISH';
        volumeSpike: boolean;
        buySellRatio: number; // 0 to 1
    };
}

export class QuantitativeEngine {

    /**
     * FASE 2: Análisis Cuantitativo (REAL)
     * Objective: Calculte Momentum Score using REAL CoinGecko OHLC data.
     * Note: This is now ASYNC because it fetches data for each token.
     */
    public async analyzeTokens(tokens: ScannedToken[]): Promise<QuantResult[]> {
        console.log('🦁🧮 [PHASE 2] Quantitative Engine: Analyzing candidates (Real Data)...');

        const results: QuantResult[] = [];

        // LIMIT: Analyze max 10 tokens to avoid rate limits (approx 15-20s duration)
        const candidates = tokens.slice(0, 10);

        for (const token of candidates) {
            console.log(`   > Fetching candles for ${token.symbol}...`);
            const indicators = await this.calculateIndicators(token);
            const score = this.calculateScore(indicators);

            results.push({
                token,
                score,
                indicators
            });
        }

        // Sort by Score DESC
        return results.sort((a, b) => b.score - a.score);
    }

    private async calculateIndicators(token: ScannedToken) {
        // 1. Fetch OHLC (30m candles) -> [time, open, high, low, close]
        const coinId = token.raw.id;
        const candles = await coingeckoClient.fetchOHLC(coinId, 1); // 1 day history

        if (!candles || candles.length < 20) {
            // Fallback if data is missing: Use safe simulation based on 1h/24h delta
            return this.calculateFallbackIndicators(token);
        }

        // Extract Closes
        const closes = candles.map(c => c[4]);

        // 1. RSI 14
        const rsi14 = this.calculateRSI(closes, 14);

        // 2. EMA 9 & EMA 21
        const ema9 = this.calculateEMA(closes, 9);
        const ema21 = this.calculateEMA(closes, 21);
        const lastEma9 = ema9[ema9.length - 1];
        const lastEma21 = ema21[ema21.length - 1];
        const currentPrice = closes[closes.length - 1];

        // 3. EMA Cross (9 > 21)
        const emaCross = lastEma9 > lastEma21;

        // 4. Price vs EMA21
        const priceVsEma21 = currentPrice > lastEma21;

        // 5. MACD (12, 26, 9) - Simplified Trend Check
        // If EMA12 > EMA26
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);
        const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
        const macdSignal: 'BULLISH' | 'BEARISH' = macdLine > 0 ? 'BULLISH' : 'BEARISH';

        // 6. Volume Spike (Unavailable in free OHLC typically, using previous Scan metric)
        const volumeSpike = token.volume24hUsd > 1_000_000; // Simplified

        return {
            emaCross,
            priceVsEma21,
            rsi14: parseFloat(rsi14.toFixed(2)),
            macdSignal,
            volumeSpike,
            buySellRatio: 0.55 // Neutral default as we lack Ticker depth here
        };
    }

    /**
     * Fallback for tokens with no OHLC data (Simulated based on Price Change)
     */
    private calculateFallbackIndicators(token: ScannedToken) {
        let rsi = 50 + (token.priceChange1h * 1.5);
        rsi = Math.min(95, Math.max(20, rsi));

        return {
            emaCross: token.priceChange1h > 2.0,
            priceVsEma21: token.priceChange24h > 0,
            rsi14: parseFloat(rsi.toFixed(2)),
            macdSignal: token.priceChange1h > 0 ? ('BULLISH' as const) : ('BEARISH' as const),
            volumeSpike: token.volume24hUsd > 1_000_000,
            buySellRatio: 0.5
        };
    }

    private calculateScore(indicators: any): number {
        let score = 0;
        // 1. EMA Cross (+2 / -2)
        score += indicators.emaCross ? 2 : -2;
        // 2. Price vs EMA21 (+1 / -1)
        score += indicators.priceVsEma21 ? 1 : -1;
        // 3. RSI 14 (55-75 ideal) (+2)
        if (indicators.rsi14 >= 55 && indicators.rsi14 <= 75) score += 2;
        // 4. MACD Signal (+1 / -1)
        score += indicators.macdSignal === 'BULLISH' ? 1 : -1;

        return score;
    }

    // --- MATH HELPERS ---

    private calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const diff = prices[prices.length - i] - prices[prices.length - i - 1];
            if (diff >= 0) gains += diff;
            else losses += Math.abs(diff);
        }

        if (losses === 0) return 100;
        const rs = gains / losses;
        return 100 - (100 / (1 + rs));
    }

    private calculateEMA(prices: number[], period: number): number[] {
        const k = 2 / (period + 1);
        const emaArray = [prices[0]];
        for (let i = 1; i < prices.length; i++) {
            emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
        }
        return emaArray;
    }
}

export const quantitativeEngine = new QuantitativeEngine();
